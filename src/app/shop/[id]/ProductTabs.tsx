'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/data/mockData';
import { Star, MessageSquare, Info, Loader2, User, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductTabs({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<'detail' | 'review' | 'qa'>('detail');
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인 후 이용 가능합니다.');
    if (!reviewText.trim()) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          product_id: product.id,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email.split('@')[0],
          rating,
          content: reviewText
        }])
        .select();

      if (error) throw error;
      
      setReviews([data[0], ...reviews]);
      setReviewText('');
      setRating(5);
      alert('소중한 후기가 등록되었습니다.');
    } catch (err: any) {
      alert(`등록 실패: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border-light pt-16">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-12 border-b border-border-light mb-16">
        {[
          { id: 'detail', label: '상세 정보', icon: Info },
          { id: 'review', label: `리뷰 (${reviews.length})`, icon: Star },
          { id: 'qa', label: '문의', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${
              activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'
            }`}
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
            <div className="relative aspect-[16/9] w-full rounded-sm overflow-hidden shadow-sm">
              <Image src={product.imageUrl} alt="상세이미지" fill className="object-cover" />
            </div>
            <div className="text-center space-y-6">
              <h3 className="font-serif text-3xl text-deep-sage tracking-tight">자연의 결이 약속하는 품질</h3>
              <p className="text-lg text-charcoal/70 leading-relaxed font-light max-w-2xl mx-auto italic">
                "가장 정직한 땅에서 기른 것들만을 고집합니다."
              </p>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Review Form */}
            {user ? (
              <form onSubmit={handleReviewSubmit} className="bg-hanji-white p-8 border border-border-light rounded-sm">
                <h4 className="font-serif text-lg mb-4">후기 남기기</h4>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setRating(s)} className="p-1">
                      <Star className={`w-5 h-5 ${rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />
                    </button>
                  ))}
                </div>
                <textarea 
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="상품에 대한 소중한 의견을 들려주세요."
                  className="w-full h-32 bg-white border border-border-light p-4 text-sm focus:outline-none focus:border-deep-sage resize-none rounded-sm"
                />
                <div className="flex justify-end mt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-charcoal text-white px-8 py-2.5 text-sm rounded-sm hover:bg-deep-sage transition-all flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> 등록하기</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10 bg-hanji-white border border-border-light border-dashed rounded-sm">
                <p className="text-muted text-sm mb-4">로그인 하시면 소중한 후기를 남기실 수 있습니다.</p>
                <button onClick={() => window.location.href='/login'} className="text-deep-sage border-b border-deep-sage text-sm font-medium">로그인하기</button>
              </div>
            )}

            {/* Review List */}
            <div className="space-y-8 mt-12">
              {isReviewLoading ? (
                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-deep-sage mx-auto" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-20 text-muted italic">아직 작성된 후기가 없습니다. 첫 번째 후기의 주인공이 되어보세요.</div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="border-b border-border-light pb-8 last:border-none">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-border-light/30 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-muted" /></div>
                        <div>
                          <p className="text-sm font-medium">{rev.user_name}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${rev.rating >= s ? 'fill-terracotta text-terracotta' : 'text-border-light'}`} />)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-charcoal/80 text-sm leading-relaxed">{rev.content}</p>
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
