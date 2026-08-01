'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Product } from '@/types';
import { Star, MessageSquare, Info, Loader2, User, X, Edit3, Trash2, Check, Filter, Camera, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  content: string;
  photo_url: string | null;
  created_at: string;
}

interface QnA {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  question_type: string;
  content: string;
  is_secret: boolean;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export default function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<'detail' | 'review' | 'qa'>('detail');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'rating'>('latest');

  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewPreview, setReviewPreview] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Q&A States
  const [qnaList, setQnaList] = useState<QnA[]>([]);
  const [isQnaLoading, setIsQnaLoading] = useState(true);
  const [qnaText, setQnaText] = useState('');
  const [qnaType, setQnaType] = useState('상품');
  const [isSecret, setIsSecret] = useState(false);
  const [isQnaSubmitting, setIsQnaSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setIsReviewLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (!error) setReviews((data as Review[]) || []);
    } catch (err) {
      console.error('Review load failed:', err);
    } finally {
      setIsReviewLoading(false);
    }
  }, [product.id]);

  const fetchQna = useCallback(async () => {
    setIsQnaLoading(true);
    try {
      const { data, error } = await supabase
        .from('qna')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (!error) setQnaList((data as QnA[]) || []);
    } catch (err) {
      console.error('QnA load failed:', err);
    } finally {
      setIsQnaLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();
        setIsAdmin(!!profile?.is_admin);
      }
    };
    checkUser();
    fetchReviews();
    fetchQna();
  }, [fetchReviews, fetchQna]);

  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avg: '0.0', counts: [0, 0, 0, 0, 0], photos: [], total: 0 };
    
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = (sum / total).toFixed(1);
    
    const counts = [5, 4, 3, 2, 1].map(s => 
      reviews.filter(r => r.rating === s).length
    );

    const photos = reviews.filter(r => r.photo_url).map(r => r.photo_url as string).slice(0, 8);
    
    return { avg, counts, total, photos };
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reviews, sortBy]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인 후 이용 가능합니다.');
    if (!reviewText.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingReviewId) {
        const { error } = await supabase.from('reviews').update({ content: reviewText, rating }).eq('id', editingReviewId);
        if (error) throw error;
        setEditingReviewId(null);
      } else {
        let imageUrl = null;
        if (reviewFile) {
          const fileExt = reviewFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `reviews/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('shop_assets').upload(filePath, reviewFile);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('shop_assets').getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
        await supabase.from('reviews').insert([{ 
          product_id: product.id, 
          user_id: user.id, 
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명', 
          rating, 
          content: reviewText, 
          photo_url: imageUrl
        }]);
      }
      fetchReviews();
      setReviewText(''); setRating(5); setReviewFile(null); setReviewPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`처리 실패: ${msg}`);
    } finally { setIsSubmitting(false); }
  };

  const handleQnaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인 후 이용 가능합니다.');
    if (!qnaText.trim()) return;

    setIsQnaSubmitting(true);
    try {
      const { error } = await supabase.from('qna').insert([{
        product_id: product.id,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '익명',
        question_type: qnaType,
        content: qnaText,
        is_secret: isSecret
      }]);
      if (error) throw error;
      
      alert('문의가 등록되었습니다.');
      setQnaText('');
      setIsSecret(false);
      fetchQna();
    } catch (err: any) {
      alert(`등록 실패: ${err.message}`);
    } finally {
      setIsQnaSubmitting(false);
    }
  };

  const deleteQna = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('qna').delete().eq('id', id);
      if (error) throw error;
      fetchQna();
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  return (
    <div className="border-t border-border-light pt-16">
      <div className="flex justify-center gap-8 md:gap-16 border-b border-border-light mb-16 px-4">
        {[
          { id: 'detail', label: '상세 정보', icon: Info },
          { id: 'review', label: `리뷰 ${reviews.length}`, icon: Star },
          { id: 'qa', label: `문의하기 ${qnaList.length}`, icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'detail' | 'review' | 'qa')}
            className={`pb-6 px-2 font-serif text-lg md:text-2xl flex items-center gap-3 transition-all relative ${activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <tab.icon className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === tab.id ? (tab.id === 'review' ? 'text-terracotta' : 'text-deep-sage') : 'text-muted'}`} />
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-charcoal" />}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto min-h-[400px] mb-32 px-4">
        {activeTab === 'detail' && (
          <div className="space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Database Rich Text Description */}
            <div 
              className="prose prose-slate max-w-none text-charcoal/80 leading-relaxed font-normal text-lg"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />

            {/* Detail Content Images */}
            <div className="space-y-0">
              {product.detail_content_images && product.detail_content_images.length > 0 ? (
                product.detail_content_images.map((img: string, idx: number) => (
                  <div key={idx} className="relative w-full overflow-hidden">
                    <div className="relative w-full h-[800px] md:h-[1200px]">
                      <Image src={img} alt={`Detail ${idx}`} fill className="object-contain" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-32 text-center border-y border-border-light border-dashed">
                  <p className="text-muted italic font-normal font-serif text-xl">상세 설명 이미지를 준비 중입니다.</p>
                </div>
              )}
            </div>

            {/* Brand Marketing Section */}
            <div className="max-w-2xl mx-auto text-center space-y-8 pt-24 border-t border-border-light">
              <span className="text-deep-sage text-sm font-bold tracking-[0.4em] uppercase">The Sincerity of Nature</span>
              <h3 className="font-serif text-4xl md:text-5xl text-charcoal tracking-tight leading-tight">자연의 결이 약속하는<br/>가장 순수한 결실</h3>
              <p className="text-xl text-charcoal/60 leading-relaxed font-normal italic">&quot;우리는 꾸밈없는 자연의 산물을 전하기 위해<br/>오늘도 정직한 땀방울을 흘립니다.&quot;</p>
              <div className="pt-8 flex justify-center gap-12">
                <div className="text-center"><p className="text-3xl font-serif text-charcoal">100%</p><p className="text-[13px] text-muted uppercase mt-2">Organic</p></div>
                <div className="w-px h-12 bg-border-light"></div>
                <div className="text-center"><p className="text-3xl font-serif text-charcoal">Direct</p><p className="text-[13px] text-muted uppercase mt-2">Farm to Table</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white border border-border-light rounded-sm p-8 md:p-12 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted font-medium uppercase tracking-widest">사용자 총 평점</p>
                <div className="flex flex-col items-center">
                  <span className="text-6xl font-serif font-bold text-charcoal">{stats.avg}</span>
                  <div className="flex gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-5 h-5 ${Number(stats.avg) >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 px-0 md:px-8 border-x-0 md:border-x border-border-light/50">
                {[5, 4, 3, 2, 1].map((s, i) => (
                  <div key={s} className="flex items-center gap-4 text-sm">
                    <span className="w-8 text-muted font-serif">{s}점</span>
                    <div className="flex-1 h-1.5 bg-hanji-white rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.counts[i] / (stats.total || 1)) * 100}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-deep-sage" />
                    </div>
                    <span className="w-8 text-right text-muted">{stats.counts[i]}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center"><p className="text-sm font-bold text-charcoal">포토 리뷰 모아보기</p><ArrowRight className="w-4 h-4 text-muted" /></div>
                <div className="grid grid-cols-4 gap-2">
                  {stats.photos.length > 0 ? stats.photos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-sm overflow-hidden border border-border-light bg-hanji-white"><Image src={p} alt="" fill className="object-cover" /></div>
                  )) : [1,2,3,4].map(i => <div key={i} className="aspect-square bg-hanji-white rounded-sm flex items-center justify-center border border-border-light"><Camera className="w-4 h-4 text-muted/20" /></div>)}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-border-light pb-6">
              <div className="flex gap-6 text-sm">
                <button onClick={() => setSortBy('latest')} className={`font-medium transition-colors ${sortBy === 'latest' ? 'text-charcoal' : 'text-muted'}`}>최신순</button>
                <button onClick={() => setSortBy('rating')} className={`font-medium transition-colors ${sortBy === 'rating' ? 'text-charcoal' : 'text-muted'}`}>평점순</button>
              </div>
              <button className="flex items-center gap-2 text-sm text-muted hover:text-charcoal"><Filter className="w-3.5 h-3.5" /> 필터</button>
            </div>

            {user && (
              <form onSubmit={handleReviewSubmit} className="bg-hanji-white/50 p-8 border border-border-light rounded-sm group focus-within:bg-white transition-all">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110"><Star className={`w-6 h-6 ${rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} /></button>
                    ))}
                  </div>
                  <span className="text-[13px] text-muted uppercase font-bold tracking-widest">{editingReviewId ? 'Edit Review' : 'Write Review'}</span>
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="상품에 대한 솔직한 후기를 들려주세요. 사진을 포함하면 포인트가 적립됩니다." className="w-full h-32 bg-white border border-border-light p-5 text-[15px] focus:outline-none focus:border-deep-sage resize-none rounded-sm mb-6" />
                <div className="flex items-center justify-between">
                  <div className="relative w-20 h-20 bg-white border border-border-light rounded-sm overflow-hidden flex-shrink-0 group/img">
                    {reviewPreview ? (
                      <>
                        <Image src={reviewPreview} alt="Preview" fill className="object-cover" />
                        <button type="button" onClick={() => {setReviewFile(null); setReviewPreview(null);}} className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-hanji-white transition-colors">
                        <Camera className="w-6 h-6 text-muted/40" /><span className="text-[13px] text-muted font-bold mt-1">PHOTO</span>
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setReviewFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setReviewPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} className="hidden" />
                      </label>
                    )}
                  </div>
                  <button type="submit" disabled={isSubmitting || !reviewText.trim()} className="bg-charcoal text-white px-12 py-4 rounded-sm hover:bg-deep-sage transition-all flex items-center gap-3 font-serif text-lg disabled:opacity-30">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingReviewId ? '수정 완료' : '후기 등록하기'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-12">
              {isReviewLoading ? (
                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-deep-sage mx-auto" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-32 bg-hanji-white/30 border border-dashed border-border-light rounded-sm"><p className="text-muted italic font-normal">아직 작성된 후기가 없습니다. 첫 번째 산물의 주인공이 되어보세요.</p></div>
              ) : (
                sortedReviews.map((rev) => (
                  <motion.div layout key={rev.id} className="border-b border-border-light pb-12 last:border-none group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-hanji-white rounded-full flex items-center justify-center border border-border-light text-muted"><User className="w-6 h-6 opacity-40" /></div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-base font-medium text-charcoal">{rev.user_name}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${rev.rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] text-muted">
                        {user?.id === rev.user_id && (
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingReviewId(rev.id); setReviewText(rev.content); setRating(rev.rating); }} className="hover:text-deep-sage flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> 수정</button>
                            <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('reviews').delete().eq('id', rev.id); fetchReviews(); } }} className="hover:text-terracotta flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> 삭제</button>
                          </div>
                        )}
                        <span className="tracking-widest opacity-60">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8">
                      {rev.photo_url && (
                        <div className="relative w-full md:w-48 aspect-square md:aspect-[4/5] bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0 cursor-zoom-in">
                          <Image src={rev.photo_url} alt="Review" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                      )}
                      <div className="flex-1 space-y-4">
                        <p className="text-charcoal/80 text-[16px] leading-relaxed whitespace-pre-line font-normal">{rev.content}</p>
                        <div className="flex gap-4 pt-4">
                          <button className="text-[13px] text-muted flex items-center gap-1.5 hover:text-deep-sage"><Check className="w-3.5 h-3.5" /> 이 후기가 도움이 되었나요? 0</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border-light pb-8">
              <div className="space-y-2">
                <h3 className="font-serif text-3xl text-charcoal">상품 문의</h3>
                <p className="text-sm text-muted font-normal">상품에 대해 궁금한 점을 남겨주시면 성실히 답변해 드립니다.</p>
              </div>
              {!user && <p className="text-sm text-terracotta font-medium">로그인 후 문의를 등록할 수 있습니다.</p>}
            </div>

            {user && (
              <form onSubmit={handleQnaSubmit} className="bg-hanji-white/50 p-8 border border-border-light rounded-sm space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-2">
                    {['상품', '배송', '반품/환불', '기타'].map(type => (
                      <button 
                        key={type} 
                        type="button" 
                        onClick={() => setQnaType(type)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${qnaType === type ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-muted border-border-light hover:border-deep-sage'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer ml-auto">
                    <input type="checkbox" checked={isSecret} onChange={e => setIsSecret(e.target.checked)} className="w-4 h-4 accent-charcoal" />
                    <span className="text-sm text-muted font-medium">비밀글로 문의하기</span>
                  </label>
                </div>
                
                <textarea 
                  value={qnaText} 
                  onChange={e => setQnaText(e.target.value)}
                  placeholder="문의 내용을 입력해 주세요. (배송지 변경, 취소 등은 고객센터로 연락 부탁드립니다.)"
                  className="w-full h-32 bg-white border border-border-light p-5 text-sm focus:outline-none focus:border-deep-sage resize-none rounded-sm"
                />
                
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isQnaSubmitting || !qnaText.trim()}
                    className="bg-charcoal text-white px-10 py-3 rounded-sm hover:bg-deep-sage transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-30"
                  >
                    {isQnaSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '문의 등록하기'}
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border-light bg-white border border-border-light rounded-sm shadow-sm">
              {isQnaLoading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-deep-sage mx-auto" /></div>
              ) : qnaList.length === 0 ? (
                <div className="py-32 text-center text-muted italic font-normal">등록된 문의가 없습니다.</div>
              ) : (
                qnaList.map((qna) => (
                  <div key={qna.id} className="p-8 space-y-6 group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-charcoal/5 text-charcoal/60 text-[13px] font-bold rounded-sm border border-charcoal/10 uppercase tracking-tighter">{qna.question_type}</span>
                          <span className={`px-2 py-0.5 text-[13px] font-bold rounded-sm border uppercase tracking-tighter ${qna.answer ? 'bg-deep-sage/10 text-deep-sage border-deep-sage/20' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {qna.answer ? '답변완료' : '답변대기'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-bold text-charcoal">{qna.user_name}</p>
                          <span className="text-[13px] text-muted opacity-40">|</span>
                          <span className="text-[13px] text-muted whitespace-nowrap">{new Date(qna.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {(user?.id === qna.user_id || isAdmin) && (
                        <button onClick={() => deleteQna(qna.id)} className="text-muted hover:text-terracotta transition-colors p-2 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>

                    <div className="pl-2 border-l-2 border-hanji-white">
                      {qna.is_secret && user?.id !== qna.user_id && !isAdmin ? (
                        <p className="text-sm text-muted italic flex items-center gap-2"><Check className="w-4 h-4" /> 비밀글입니다. 작성자와 관리자만 볼 수 있습니다.</p>
                      ) : (
                        <p className="text-[15px] text-charcoal/80 leading-relaxed whitespace-pre-line">{qna.content}</p>
                      )}
                    </div>

                    {qna.answer && (qna.is_secret === false || user?.id === qna.user_id || isAdmin) && (
                      <div className="mt-6 p-6 bg-hanji-white/50 rounded-sm border border-border-light space-y-3">
                        <div className="flex items-center gap-2 text-deep-sage font-bold text-[13px] uppercase tracking-widest">
                          <MessageSquare className="w-3.5 h-3.5" /> Admin Response
                        </div>
                        <p className="text-sm text-charcoal/70 leading-relaxed whitespace-pre-line">{qna.answer}</p>
                        {qna.answered_at && <p className="text-[13px] text-muted text-right opacity-60">{new Date(qna.answered_at).toLocaleDateString()} 답변됨</p>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
