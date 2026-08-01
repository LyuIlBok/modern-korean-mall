'use client';

import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useHasMounted } from '@/hooks/useHasMounted';
import CartItem from './CartItem';

export default function CartSidebar() {
  const { items, isOpen, toggleCart } = useCartStore();
  const { t } = useLanguageStore();
  const hasMounted = useHasMounted();

  if (!hasMounted) return null;

  const subtotal = items.reduce((sum, item) => sum + (item.price + (item.optionPrice || 0)) * item.quantity, 0);
  const shippingFee = subtotal >= 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shippingFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleCart(false)}
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-border-light flex justify-between items-center bg-hanji-white">
              <div className="flex items-center gap-4">
                <ShoppingBag className="w-6 h-6 text-deep-sage" />
                <h2 className="font-serif text-2xl text-charcoal">
                  {t.cart.title}
                  <span className="ml-3 text-base font-sans text-muted font-normal">({items.length})</span>
                </h2>
              </div>
              <button 
                onClick={() => toggleCart(false)}
                className="p-3 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-8 h-8 text-muted" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60 px-6">
                  <ShoppingBag className="w-20 h-20 stroke-1 text-muted" />
                  <p className="font-serif text-xl italic text-charcoal leading-relaxed">{t.cart.empty}</p>
                  <button 
                    onClick={() => toggleCart(false)}
                    className="text-sm uppercase tracking-[0.2em] border-b-2 border-charcoal pb-1 font-bold hover:text-deep-sage hover:border-deep-sage transition-all"
                  >
                    Go Shopping
                  </button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <CartItem key={`${item.id}-${item.optionName || idx}`} item={item} />
                ))
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-10 border-t border-border-light bg-white space-y-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="space-y-4">
                  <div className="flex justify-between text-base text-muted font-medium italic">
                    <span>{t.cart.subtotal}</span>
                    <span>₩{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base text-muted font-medium italic">
                    <span>{t.cart.shipping}</span>
                    <span>{shippingFee === 0 ? t.checkout.free : `₩${shippingFee.toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-border-light/50">
                    <span className="font-serif text-xl font-bold">{t.cart.total}</span>
                    <span className="font-serif text-4xl text-charcoal font-black">₩{total.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-center text-deep-sage bg-deep-sage/5 py-2 rounded-sm font-bold uppercase tracking-widest">{t.cart.freeShippingInfo}</p>
                </div>
                <Link 
                  href="/checkout" 
                  onClick={() => toggleCart(false)}
                  className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-4 font-serif text-2xl shadow-xl group"
                >
                  {t.cart.checkoutBtn} <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
