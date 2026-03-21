'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const { t } = useLanguageStore();
  const hasMounted = useHasMounted();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  if (!hasMounted) return <div className="flex-1 bg-hanji-white h-screen" />;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white min-h-[70vh]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-24 h-24 bg-border-light/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="w-10 h-10 text-muted/30" />
          </div>
          <h1 className="font-serif text-3xl mb-6 text-charcoal">{t.cart.empty}</h1>
          <Link href="/shop" className="inline-flex items-center gap-2 bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all tracking-widest text-sm uppercase">
            {t.home.exploreBtn} <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl mb-16 text-charcoal">{t.cart.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-10">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id} 
                  className="flex flex-col sm:flex-row gap-8 pb-10 border-b border-border-light group"
                >
                  <div className="relative w-full sm:w-40 aspect-[4/5] bg-white rounded-sm overflow-hidden flex-shrink-0 border border-border-light">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] text-terracotta uppercase tracking-widest font-bold">{item.category}</span>
                          <h3 className="font-serif text-2xl text-charcoal mt-1">{item.name}</h3>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-muted hover:text-terracotta transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm text-muted font-light line-clamp-2 max-w-md">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-8 sm:mt-0">
                      <div className="flex items-center border border-border-light rounded-sm bg-white shadow-sm">
                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-2.5 hover:bg-hanji-white transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2.5 hover:bg-hanji-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xl font-serif font-bold text-charcoal tracking-tight">₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-10 rounded-sm shadow-md">
              <h2 className="font-serif text-2xl mb-8 border-b border-border-light pb-4 text-charcoal">{t.cart.summary}</h2>
              <div className="space-y-5 text-sm mb-10">
                <div className="flex justify-between text-muted">
                  <span>{t.cart.subtotal}</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>{t.cart.shipping}</span>
                  <span>{shipping === 0 ? 'FREE' : `₩${shipping.toLocaleString()}`}</span>
                </div>
                <div className="pt-6 border-t border-border-light flex justify-between items-end">
                  <span className="font-serif text-lg text-charcoal">{t.cart.total}</span>
                  <div className="text-right">
                    <span className="text-3xl font-serif font-bold text-deep-sage tracking-tighter">₩{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Link href="/checkout" className="block w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all duration-500 text-center font-medium tracking-[0.2em] uppercase text-sm shadow-lg group">
                {t.cart.checkoutBtn}
              </Link>
              <p className="text-[11px] text-center text-muted mt-6 leading-relaxed font-light italic">
                * {t.cart.freeShippingInfo}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
