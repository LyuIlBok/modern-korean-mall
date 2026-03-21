'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/data/mockData';
import { Star, MessageSquare, Info, Loader2, User, Send, ImageIcon, X, Edit3, Trash2, Check } from 'lucide-react';
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

  // Photo Review State
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewPreview, setReviewPreview] = useState<string | null>(null);

  // Editing State
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
      console.error('리뷰 로드 실패:', err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReviewFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReviewPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인 후 이용 가능합니다.');
    if (!reviewText.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingReviewId) {
        // UPDATE 로직
        const { error } = await supabase
          .from('reviews')
          .update({ content: reviewText, rating })
          .eq('id', editingReviewId);
        if (error) throw error;
        setReviews(reviews.map(r => r.id === editingReviewId ? { ...r, content: reviewText, rating } : r));
        setEditingReviewId(null);
        alert('후기가 수정되었습니다.');
      } else {
        // INSERT 로직
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

        const { data: orderData } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', '배송완료');
        
        let isVerified = false;
        if (orderData && orderData.length > 0) {
          const orderIds = orderData.map(o => o.id);
          const { data: itemData } = await supabase
            .from('order_items')
            .select('id')
            .in('order_id', orderIds)
            .eq('product_id', product.id);
          
          if (itemData && itemData.length > 0) {
            isVerified = true;
          }
        }

        const { data, error } = await supabase
          .from('reviews')
          .insert([{
            product_id: product.id,
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email.split('@')[0],
            rating,
            content: reviewText,
            photo_url: photoUrl,
            is_verified: isVerified
          }])
          .select();

        if (error) throw error;
        setReviews([data[0], ...reviews]);
        alert('후기가 등록되었습니다.');
      }
      
      setReviewText('');
      setRating(5);
      setReviewFile(null);
      setReviewPreview(null);
    } catch (err: any) {
      alert(`처리 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('정말로 이 후기를 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      setReviews(reviews.filter(r => r.id !== id));
      alert('후기가 삭제되었습니다.');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  const startEdit = (review: any) => {
    setEditingReviewId(review.id);
    setReviewText(review.content);
    setRating(review.rating);
    window.scrollTo({ top: document.querySelector('form')?.offsetTop ? document.querySelector('form')!.offsetTop - 100 : 0, behavior: 'smooth' });
  };

  return (
    <div className="border-t border-border-light pt-16">
      <div className="flex justify-center gap-12 border-b border-border-light mb-16">
        {[
          { id: 'detail', label: '상세 정보', icon: Info },
          { id: 'review', label: `리뷰 (${reviews.length})`, icon: Star },
          { id: 'qa', label: '문의', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-terracotta' : 'text-muted'}`} />
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto min-h-[400px] mb-32">
        {activeTab === 'detail' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative aspect-[16/9] w-full rounded-sm overflow-hidden shadow-sm border border-border-light/50">
              <Image src={product.imageUrl} alt="상세이미지" fill className="object-cover" />
            </div>
            <div className="text-center space-y-6">
              <h3 className="font-serif text-3xl text-deep-sage tracking-tight">자연의 결이 약속하는 품질</h3>
              <p className="text-lg text-charcoal/70 leading-relaxed font-light max-w-2xl mx-auto italic">"가장 정직한 땅에서 기른 것들만을 고집합니다."</p>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {user ? (
              <form onSubmit={handleReviewSubmit} className="bg-hanji-white p-8 border border-border-light rounded-sm relative">
                <h4 className="font-serif text-lg mb-4">{editingReviewId ? '후기 수정하기' : '후기 남기기'}</h4>
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setRating(s)} className="p-1"><Star className={`w-5 h-5 ${rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} /></button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="상품에 대한 소중한 의견을 들려주세요." className="w-full h-32 bg-white border border-border-light p-4 text-sm focus:outline-none focus:border-deep-sage resize-none rounded-sm mb-4" />
                
                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-4">
                    {!editingReviewId && (
                      <div className="relative w-16 h-16 bg-white border border-border-light rounded-sm overflow-hidden flex-shrink-0">
                        {reviewPreview ? (
                          <>
                            <Image src={reviewPreview} alt="Preview" fill className="object-cover" />
                            <button type="button" onClick={() => {setReviewFile(null); setReviewPreview(null);}} className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-sm"><X className="w-3 h-3" /></button>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-hanji-white transition-colors">
                            <ImageIcon className="w-5 h-5 text-muted/40" />
                            <span className="text-[8px] text-muted uppercase mt-1">Photo</span>
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingReviewId && <button type="button" onClick={() => {setEditingReviewId(null); setReviewText('');}} className="px-6 py-3 text-sm text-muted hover:text-charcoal transition-colors">취소</button>}
                    <button type="submit" disabled={isSubmitting} className="bg-charcoal text-white px-8 py-3 text-sm rounded-sm hover:bg-deep-sage transition-all flex items-center gap-2 font-medium">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingReviewId ? '수정 완료' : '후기 등록'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 bg-hanji-white border border-border-light border-dashed rounded-sm">
                <p className="text-muted text-sm mb-4">로그인 하시면 소중한 후기를 남기실 수 있습니다.</p>
                <button onClick={() => window.location.href='/login'} className="text-deep-sage border-b border-deep-sage text-sm font-medium">로그인하기</button>
              </div>
            )}

            <div className="space-y-10 mt-12">
              {isReviewLoading ? (
                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-deep-sage mx-auto" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-20 text-muted italic">아직 작성된 후기가 없습니다. 첫 번째 후기의 주인공이 되어보세요.</div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="border-b border-border-light pb-10 last:border-none">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-border-light/30 rounded-full flex items-center justify-center border border-border-light"><User className="w-5 h-5 text-muted" /></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-charcoal">{rev.user_name}</p>
                            {rev.is_verified && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-deep-sage/10 text-deep-sage text-[9px] font-bold rounded-full uppercase tracking-tighter">
                                <Check className="w-2.5 h-2.5" /> 구매 인증
                              </span>
                            )}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${rev.rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {user?.id === rev.user_id && (
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(rev)} className="text-[10px] text-muted hover:text-deep-sage flex items-center gap-1"><Edit3 className="w-3 h-3" /> 수정</button>
                            <button onClick={() => handleDeleteReview(rev.id)} className="text-[10px] text-muted hover:text-terracotta flex items-center gap-1"><Trash2 className="w-3 h-3" /> 삭제</button>
                          </div>
                        )}
                        <span className="text-[10px] text-muted tracking-widest">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6">
                      {rev.photo_url && (
                        <div className="relative w-32 h-32 md:w-40 md:h-40 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0">
                          <Image src={rev.photo_url} alt="Review Photo" fill className="object-cover hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <p className="text-charcoal/80 text-[15px] leading-relaxed flex-1 whitespace-pre-line">{rev.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div className="text-center py-32 bg-hanji-white border border-border-light rounded-sm">
            <MessageSquare className="w-10 h-10 text-deep-sage mx-auto opacity-30 mb-6" />
            <p className="text-charcoal/60 mb-8">궁금한 점이 있으시면 언제든 1:1 대화를 신청해 주세요.</p>
            <button onClick={() => window.location.href='/support'} className="bg-charcoal text-white px-10 py-3 rounded-sm hover:bg-deep-sage transition-all font-medium tracking-wide">1:1 상담 거닐기</button>
          </div>
        )}
      </div>
    </div>
  );
}
