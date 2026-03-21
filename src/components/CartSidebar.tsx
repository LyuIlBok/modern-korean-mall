'use client';

import { useCartStore } from '@/store/useCartStore';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function CartSidebar() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  // hydration error 방지용
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          {/* Backdrop with animation */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={toggleCart}
          />
          
          {/* Sidebar with animation */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 max-w-md w-full flex"
          >
            <div className="w-full h-full bg-hanji-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-6 border-b border-border-light">
                <div className="flex items-center gap-2">
                   <ShoppingBag className="w-5 h-5 text-deep-sage" />
                   <h2 className="font-serif text-xl">장바구니</h2>
                </div>
                <button onClick={toggleCart} className="p-2 hover:rotate-90 transition-transform duration-300 hover:text-terracotta">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
                    <div className="w-16 h-16 bg-border-light/30 rounded-full flex items-center justify-center">
                       <ShoppingBag className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-serif italic text-lg opacity-60">비워진 미학</p>
                    <button 
                      onClick={toggleCart}
                      className="text-sm border-b border-charcoal/30 pb-1 hover:text-charcoal hover:border-charcoal transition-colors"
                    >
                      상품 보러가기
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-8">
                    {items.map((item) => (
                      <motion.li 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={item.id} 
                        className="flex gap-4 group"
                      >
                        <div className="relative w-24 h-28 bg-white border border-border-light rounded-sm overflow-hidden flex-shrink-0">
                          <Image src={item.imageUrl} alt={item.name} fill sizes="96px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start">
                              <h3 className="text-sm font-medium text-charcoal line-clamp-1 group-hover:text-deep-sage transition-colors">{item.name}</h3>
                              <button onClick={() => removeItem(item.id)} className="text-muted/40 hover:text-terracotta flex-shrink-0 ml-2 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-muted mt-1 font-light tracking-wide">{item.category}</p>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center border border-border-light rounded-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1.5 hover:bg-border-light/50 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1.5 hover:bg-border-light/50 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-sm font-medium tracking-tight">{(item.price * item.quantity).toLocaleString()}원</p>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t border-border-light p-8 bg-white/50 backdrop-blur-md">
                  <div className="flex justify-between text-sm text-muted mb-2">
                    <span>주문 소계</span>
                    <span>{totalAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted mb-6 pb-6 border-b border-border-light/50">
                    <span>배송비</span>
                    <span className="text-deep-sage font-medium">무료</span>
                  </div>
                  <div className="flex justify-between text-lg font-serif mb-8">
                    <span>총 결제 금액</span>
                    <span className="text-charcoal font-bold">{totalAmount.toLocaleString()}원</span>
                  </div>
                  <button 
                    className="w-full bg-charcoal hover:bg-deep-sage text-white py-5 rounded-sm transition-all duration-300 text-lg font-medium shadow-lg active:scale-[0.98]"
                    onClick={() => { alert('준비 중인 기능입니다.'); }}
                  >
                    주문서 작성하기
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}