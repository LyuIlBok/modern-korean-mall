'use client';

import { useState } from 'react';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { ShoppingCart, CreditCard, AlertCircle, Bell, X, Check, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function PurchaseButtons({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const [isAdding, setIsAdding] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockPhone, setRestockPhone] = useState('');
  const [isRestockSubmitting, setIsRestockSubmitting] = useState(false);

  const isWished = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (product.is_sold_out) return;
    setIsAdding(true);
    addItem(product);
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
    setTimeout(() => setIsAdding(false), 500);
  };

  const handleBuyNow = () => {
    if (product.is_sold_out) return;
    addItem(product);
    router.push('/checkout');
  };

  const handleToggleWish = () => {
    toggleWish(product);
    addToast(
      isWished ? '관심 상품에서 제거되었습니다.' : '관심 상품에 추가되었습니다.',
      isWished ? 'info' : 'success'
    );
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockPhone.trim()) return;
    setIsRestockSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('restock_alerts')
        .insert([{
          product_id: product.id,
          phone_number: restockPhone,
          status: 'pending'
        }]);

      if (error) throw error;

      setIsRestockSubmitting(false);
      setShowRestockModal(false);
      setRestockPhone('');
      addToast('재입고 알림 신청이 완료되었습니다.', 'success');
    } catch (err: any) {
      console.error('Error saving restock alert:', err.message);
      setIsRestockSubmitting(false);
      addToast('알림 신청 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-md border-t border-border-light md:static md:p-0 md:bg-transparent md:border-none md:z-auto">
        <div className="max-w-7xl mx-auto flex gap-3 w-full">
          <button 
            onClick={handleToggleWish}
            className={`px-4 flex items-center justify-center border transition-all duration-300 rounded-sm ${
              isWished 
                ? 'bg-terracotta border-terracotta text-white shadow-md' 
                : 'border-border-light text-muted hover:text-terracotta hover:border-terracotta bg-white'
            }`}
            title="관심 상품"
          >
            <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
          </button>

          {product.is_sold_out ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="flex-[2] py-4 bg-hanji-white border border-border-light text-muted flex items-center justify-center gap-2 rounded-sm font-medium italic text-sm">
                <AlertCircle className="w-4 h-4" />
                품절된 상품입니다
              </div>
              <button 
                onClick={() => setShowRestockModal(true)}
                className="flex-1 py-4 bg-deep-sage text-white hover:bg-charcoal transition-all duration-300 rounded-sm font-medium flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <Bell className="w-4 h-4" />
                재입고 알림 받기
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex-1 flex items-center justify-center gap-2 py-4 border border-charcoal text-charcoal hover:bg-charcoal hover:text-white transition-all duration-300 rounded-sm font-medium bg-white"
              >
                <ShoppingCart className="w-5 h-5" />
                {isAdding ? '담는 중...' : '장바구니'}
              </button>
              <button 
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-deep-sage text-white hover:bg-deep-sage/90 transition-all duration-300 rounded-sm font-medium shadow-sm"
              >
                <CreditCard className="w-5 h-5" />
                바로 구매하기
              </button>
            </>
          )}
        </div>
      </div>

      {/* Restock Alert Modal */}
      <AnimatePresence>
        {showRestockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRestockModal(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-sm shadow-2xl p-8 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-serif text-2xl text-charcoal">재입고 알림</h3>
                  <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Restock Notification</p>
                </div>
                <button onClick={() => setShowRestockModal(false)} className="p-1 hover:bg-hanji-white rounded-full transition-colors"><X className="w-5 h-5 text-muted" /></button>
              </div>
              
              <form onSubmit={handleRestockSubmit} className="space-y-6">
                <p className="text-[13px] text-charcoal/70 leading-relaxed">
                  <span className="font-bold text-deep-sage">{product.name}</span> 상품이 재입고되는 즉시 문자 메시지로 안내해 드리겠습니다.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-tighter">Phone Number</label>
                  <input 
                    required
                    type="tel"
                    value={restockPhone}
                    onChange={(e) => setRestockPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full border-b border-border-light bg-transparent py-2 focus:outline-none focus:border-deep-sage transition-colors text-sm"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isRestockSubmitting}
                  className="w-full bg-charcoal text-white py-4 hover:bg-deep-sage transition-all font-medium flex items-center justify-center gap-2"
                >
                  {isRestockSubmitting ? '신청 중...' : <><Check className="w-4 h-4" /> 신청 완료하기</>}
                </button>
                <p className="text-[9px] text-center text-muted">* 알림 신청은 재입고 시 1회 발송되며 이후 자동 파기됩니다.</p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
