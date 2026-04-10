'use client';

import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function CartSidebar() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem } = useCartStore();
  const { language } = useLanguageStore();
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
            <div className="p-6 border-b border-border-light flex justify-between items-center bg-hanji-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-xl text-charcoal">
                  {language === 'ko' ? '장바구니' : 'Your Cart'}
                  <span className="ml-2 text-sm font-sans text-muted font-light">({items.length})</span>
                </h2>
              </div>
              <button 
                onClick={() => toggleCart(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-muted" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <ShoppingBag className="w-16 h-16 stroke-1" />
                  <p className="font-serif text-lg italic">장바구니가 비어 있습니다.</p>
                  <button 
                    onClick={() => toggleCart(false)}
                    className="text-xs uppercase tracking-widest border-b border-charcoal pb-1"
                  >
                    Go Shopping
                  </button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={`${item.id}-${item.optionName || idx}`} className="flex gap-5 group">
                    <div className="relative w-24 h-28 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-serif text-lg text-charcoal leading-tight line-clamp-1">{item.name}</h3>
                            {item.optionName && (
                              <p className="text-[10px] bg-hanji-white border border-border-light px-2 py-0.5 rounded-full inline-block text-muted font-bold">
                                {item.optionName}
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => removeItem(item.id, item.optionName)}
                            className="text-muted hover:text-terracotta transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-charcoal/60 mt-1">₩{(item.price + (item.optionPrice || 0)).toLocaleString()}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center border border-border-light rounded-sm bg-hanji-white">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.optionName)} className="p-1.5 hover:text-deep-sage"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-xs font-serif">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.optionName)} className="p-1.5 hover:text-deep-sage"><Plus className="w-3 h-3" /></button>
                        </div>
                        <p className="text-sm font-bold text-charcoal">₩{((item.price + (item.optionPrice || 0)) * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-8 bg-hanji-white border-t border-border-light space-y-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>상품 금액</span>
                    <span>₩{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>배송비</span>
                    <span>{shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`}</span>
                  </div>
                  {shippingFee > 0 && (
                    <p className="text-[10px] text-deep-sage font-medium tracking-tight">
                      * ₩{(50000 - subtotal).toLocaleString()}원 추가 시 무료배송
                    </p>
                  )}
                  <div className="flex justify-between text-lg font-serif text-charcoal border-t border-border-light pt-4 mt-2">
                    <span>총 결제 금액</span>
                    <span className="text-2xl">₩{total.toLocaleString()}</span>
                  </div>
                </div>

                <Link 
                  href="/checkout" 
                  onClick={() => toggleCart(false)}
                  className="w-full bg-charcoal text-white py-5 rounded-sm flex items-center justify-center gap-3 hover:bg-deep-sage transition-all shadow-xl group font-serif text-lg"
                >
                  주문하기 <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
