'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white text-center">
        <div className="w-20 h-20 bg-white border border-border-light flex items-center justify-center rounded-full mb-6">
          <ShoppingBag className="w-8 h-8 text-muted/30" />
        </div>
        <h1 className="font-serif text-3xl mb-4">장바구니가 비어 있습니다</h1>
        <p className="text-muted mb-10 max-w-xs">자연의 결이 준비한 단아한 산물들을 만나보세요.</p>
        <Link 
          href="/shop" 
          className="bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium tracking-wide"
        >
          상품 보러가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl mb-12 border-b border-border-light pb-8">장바구니</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* 상품 목록 리스트 */}
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div 
                  key={item.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-6 pb-8 border-b border-border-light last:border-0"
                >
                  <div className="relative w-28 h-36 bg-white overflow-hidden rounded-sm flex-shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-deep-sage font-medium uppercase tracking-widest">{item.category}</span>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-muted hover:text-terracotta transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-serif text-xl text-charcoal">{item.name}</h3>
                      <p className="text-sm text-muted mt-1">₩{item.price.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-border-light bg-white rounded-sm">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 text-muted hover:text-charcoal transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 text-muted hover:text-charcoal transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-medium text-charcoal">₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 결제 요약 섹션 */}
          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-8 rounded-sm shadow-sm">
              <h2 className="font-serif text-2xl mb-8">주문 요약</h2>
              
              <div className="space-y-4 text-sm mb-8">
                <div className="flex justify-between text-muted">
                  <span>상품 금액</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>배송비</span>
                  <span>{shipping === 0 ? '무료' : `₩${shipping.toLocaleString()}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-terracotta/70 mt-1">50,000원 이상 구매 시 배송비 무료</p>
                )}
                <div className="pt-4 border-t border-border-light flex justify-between text-lg font-bold text-charcoal">
                  <span>총 결제 금액</span>
                  <span className="text-deep-sage">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <Link 
                href="/checkout"
                className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all duration-300 flex items-center justify-center gap-2 group font-medium tracking-wide"
              >
                결제하기 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/shop" 
                className="block text-center mt-6 text-xs text-muted hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-1 w-fit mx-auto"
              >
                쇼핑 계속하기
              </Link>
            </div>
            
            <div className="mt-8 p-4 bg-deep-sage/5 border border-deep-sage/10 rounded-sm">
              <p className="text-[11px] text-deep-sage leading-relaxed">
                * 산지 직송 제품의 경우 날씨에 따라 배송이 다소 지연될 수 있습니다. 정성을 다해 안전하게 보내드리겠습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
