'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Product } from '@/data/mockData';
import { Star, MessageSquare, Info, Loader2, User, ImageIcon, X, Edit3, Trash2, Check, ChevronDown, Filter, Camera, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<'detail' | 'review' | 'qa'>('detail');
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'rating'>('latest');

  // Photo Review State
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewPreview, setReviewPreview] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    checkUser();
    fetchReviews();
  }, [product.id]);

  const fetchReviews = async () => {
    setIsReviewLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      if (!error) setReviews(data || []);
    } catch (err) {
      console.error('Review load failed:', err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Review Stats Calculation (Naver Style)
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avg: 0, counts: [0, 0, 0, 0, 0], photos: [] };
    
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = (sum / total).toFixed(1);
    
    const counts = [5, 4, 3, 2, 1].map(s => 
      reviews.filter(r => r.rating === s).length
    );

    const photos = reviews.filter(r => r.photo_url).map(r => r.photo_url).slice(0, 8);
    
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
        let photoUrl = null;
        if (reviewFile) {
          const fileExt = reviewFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `reviews/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('review-images').upload(filePath, reviewFile);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(filePath);
          photoUrl = publicUrl;
        }
        await supabase.from('reviews').insert([{ product_id: product.id, user_id: user.id, user_name: user.user_metadata?.full_name || user.email.split('@')[0], rating, content: reviewText, photo_url: photoUrl, is_verified: true }]);
      }
      fetchReviews();
      setReviewText(''); setRating(5); setReviewFile(null); setReviewPreview(null);
    } catch (err: any) {
      alert(`처리 실패: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="border-t border-border-light pt-16">
      {/* Tabs Header */}
      <div className="flex justify-center gap-8 md:gap-16 border-b border-border-light mb-16 px-4">
        {[
          { id: 'detail', label: '상세 정보', icon: Info },
          { id: 'review', label: `리뷰 ${reviews.length}`, icon: Star },
          { id: 'qa', label: '문의하기', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
            <div className="relative aspect-[16/9] w-full rounded-sm overflow-hidden shadow-2xl border border-border-light">
              <Image src={product.imageUrl} alt="Detail" fill className="object-cover" />
            </div>
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <span className="text-deep-sage text-xs font-bold tracking-[0.4em] uppercase">The Sincerity of Nature</span>
              <h3 className="font-serif text-4xl md:text-5xl text-charcoal tracking-tight leading-tight">자연의 결이 약속하는<br/>가장 순수한 결실</h3>
              <p className="text-xl text-charcoal/60 leading-relaxed font-light italic">"우리는 꾸밈없는 자연의 산물을 전하기 위해<br/>오늘도 정직한 땀방울을 흘립니다."</p>
              <div className="pt-8 flex justify-center gap-12">
                <div className="text-center"><p className="text-3xl font-serif text-charcoal">100%</p><p className="text-[10px] text-muted uppercase mt-2">Organic</p></div>
                <div className="w-px h-12 bg-border-light"></div>
                <div className="text-center"><p className="text-3xl font-serif text-charcoal">Direct</p><p className="text-[10px] text-muted uppercase mt-2">Farm to Table</p></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Review Dashboard (Naver Style) */}
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
                  <div key={s} className="flex items-center gap-4 text-xs">
                    <span className="w-8 text-muted font-serif">{s}점</span>
                    <div className="flex-1 h-1.5 bg-hanji-white rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(stats.counts[i] / (stats.total || 1)) * 100}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-deep-sage" />
                    </div>
                    <span className="w-8 text-right text-muted">{stats.counts[i]}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center"><p className="text-xs font-bold text-charcoal">포토 리뷰 모아보기</p><ArrowRight className="w-4 h-4 text-muted" /></div>
                <div className="grid grid-cols-4 gap-2">
                  {stats.photos.length > 0 ? stats.photos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-sm overflow-hidden border border-border-light bg-hanji-white"><Image src={p} alt="" fill className="object-cover" /></div>
                  )) : [1,2,3,4].map(i => <div key={i} className="aspect-square bg-hanji-white rounded-sm flex items-center justify-center border border-border-light"><Camera className="w-4 h-4 text-muted/20" /></div>)}
                </div>
              </div>
            </div>

            {/* Sort & Filter */}
            <div className="flex justify-between items-center border-b border-border-light pb-6">
              <div className="flex gap-6 text-sm">
                <button onClick={() => setSortBy('latest')} className={`font-medium transition-colors ${sortBy === 'latest' ? 'text-charcoal' : 'text-muted'}`}>최신순</button>
                <button onClick={() => setSortBy('rating')} className={`font-medium transition-colors ${sortBy === 'rating' ? 'text-charcoal' : 'text-muted'}`}>평점순</button>
              </div>
              <button className="flex items-center gap-2 text-xs text-muted hover:text-charcoal"><Filter className="w-3.5 h-3.5" /> 필터</button>
            </div>

            {/* Review Form */}
            {user && (
              <form onSubmit={handleReviewSubmit} className="bg-hanji-white/50 p-8 border border-border-light rounded-sm group focus-within:bg-white transition-all">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110"><Star className={`w-6 h-6 ${rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} /></button>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-widest">{editingReviewId ? 'Edit Review' : 'Write Review'}</span>
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
                        <Camera className="w-6 h-6 text-muted/40" /><span className="text-[9px] text-muted font-bold mt-1">PHOTO</span>
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

            {/* Review List */}
            <div className="space-y-12">
              {isReviewLoading ? (
                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-deep-sage mx-auto" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-32 bg-hanji-white/30 border border-dashed border-border-light rounded-sm"><p className="text-muted italic font-light">아직 작성된 후기가 없습니다. 첫 번째 산물의 주인공이 되어보세요.</p></div>
              ) : (
                sortedReviews.map((rev) => (
                  <motion.div layout key={rev.id} className="border-b border-border-light pb-12 last:border-none group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-hanji-white rounded-full flex items-center justify-center border border-border-light text-muted"><User className="w-6 h-6 opacity-40" /></div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-base font-medium text-charcoal">{rev.user_name}</p>
                            {rev.is_verified && <span className="px-2 py-0.5 bg-deep-sage/10 text-deep-sage text-[9px] font-bold rounded-full border border-deep-sage/20">구매인증</span>}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${rev.rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-muted">
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
                        <p className="text-charcoal/80 text-[16px] leading-relaxed whitespace-pre-line font-light">{rev.content}</p>
                        <div className="flex gap-4 pt-4">
                          <button className="text-[10px] text-muted flex items-center gap-1.5 hover:text-deep-sage"><Check className="w-3.5 h-3.5" /> 이 후기가 도움이 되었나요? 0</button>
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
          <div className="text-center py-40 bg-hanji-white border border-border-light rounded-sm space-y-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm"><MessageSquare className="w-10 h-10 text-deep-sage opacity-40" /></div>
            <div className="space-y-2">
              <h4 className="font-serif text-2xl text-charcoal">궁금한 점이 있으신가요?</h4>
              <p className="text-muted font-light">자연의 결 전문가가 정성을 다해 답변해 드립니다.</p>
            </div>
            <button onClick={() => window.location.href='/support'} className="bg-charcoal text-white px-12 py-4 rounded-sm hover:bg-deep-sage transition-all font-serif text-lg shadow-lg tracking-widest uppercase">Start 1:1 Counseling</button>
          </div>
        )}
      </div>
    </div>
  );
}
