'use client';

import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartSidebar() {
  const { isOpen, toggleCart, items, addItem, removeItem, updateQuantity } = useCartStore();
  const { t } = useLanguageStore();
  const hasMounted = useHasMounted();

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-hanji-white h-screen shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-border-light flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-xl text-charcoal">{t.common.cart}</h2>
                <span className="bg-deep-sage/10 text-deep-sage text-[10px] font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
              </div>
              <button onClick={toggleCart} className="p-2 hover:bg-hanji-white rounded-full transition-colors">
                <X className="w-6 h-6 text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-border-light/20 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-muted/30" />
                  </div>
                  <p className="text-muted font-serif italic">{t.cart.empty}</p>
                  <button 
                    onClick={toggleCart}
                    className="text-xs uppercase tracking-widest border-b border-charcoal pb-1 hover:text-deep-sage hover:border-deep-sage transition-all"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-5 group">
                      <div className="relative w-20 h-24 bg-white border border-border-light rounded-sm overflow-hidden flex-shrink-0">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-serif text-sm text-charcoal">{item.name}</h3>
                            <button onClick={() => removeItem(item.id)} className="text-muted hover:text-terracotta transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-muted font-medium">₩{item.price.toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center border border-border-light rounded-sm bg-white">
                            <button 
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="p-1.5 hover:bg-hanji-white transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => addItem(item)}
                              className="p-1.5 hover:bg-hanji-white transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-serif font-bold text-charcoal">
                            ₩{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-white border-t border-border-light space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-muted uppercase tracking-wider">
                    <span>{t.cart.subtotal}</span>
                    <span>₩{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted uppercase tracking-wider">
                    <span>{t.cart.shipping}</span>
                    <span>{subtotal >= 50000 ? 'FREE' : '₩3,000'}</span>
                  </div>
                  <div className="pt-4 flex justify-between items-end">
                    <span className="font-serif text-lg text-charcoal">{t.cart.total}</span>
                    <span className="text-2xl font-serif font-bold text-deep-sage">
                      ₩{(subtotal >= 50000 ? subtotal : subtotal + 3000).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Link 
                    href="/checkout"
                    onClick={toggleCart}
                    className="w-full bg-charcoal hover:bg-deep-sage text-white py-5 rounded-sm transition-all duration-500 text-sm font-medium tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-lg group"
                  >
                    {t.cart.checkoutBtn}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <p className="text-[10px] text-center text-muted mt-4 font-light italic">
                    * {t.cart.freeShippingInfo}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
