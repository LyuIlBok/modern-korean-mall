'use client';

import { useCartStore } from '@/store/useCartStore';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import Image from 'next/image';

export default function CartSidebar() {
  const { isOpen, toggleCart, items, updateQuantity, removeItem } = useCartStore();

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/30 backdrop-blur-sm transition-opacity"
        onClick={toggleCart}
      />
      
      {/* Sidebar */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
        <div className="w-full h-full bg-hanji-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
            <h2 className="font-serif text-xl">장바구니</h2>
            <button onClick={toggleCart} className="p-2 hover:text-terracotta transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted">
                <p>장바구니가 비어있습니다.</p>
              </div>
            ) : (
              <ul className="space-y-6">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 bg-white border border-border-light rounded-sm overflow-hidden flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium text-charcoal line-clamp-1">{item.name}</h3>
                        <button onClick={() => removeItem(item.id)} className="text-muted hover:text-terracotta flex-shrink-0 ml-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border-light rounded-sm">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-border-light/50 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-border-light/50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-medium">{(item.price * item.quantity).toLocaleString()}원</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border-light p-6 bg-hanji-white/50 backdrop-blur-sm">
              <div className="flex justify-between text-base font-medium mb-4">
                <span>총 결제 예상 금액</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
              <button 
                className="w-full bg-deep-sage hover:bg-deep-sage/90 text-white py-4 rounded-sm transition-colors text-lg"
                onClick={() => { alert('가상 결제 화면입니다. 결제가 완료되었습니다!'); toggleCart(); }}
              >
                결제하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}