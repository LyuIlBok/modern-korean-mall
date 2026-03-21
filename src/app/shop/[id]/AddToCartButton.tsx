'use client';

import { useState } from 'react';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { ShoppingCart, CreditCard } from 'lucide-react';

export default function PurchaseButtons({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem(product);
    
    // 알림 띄우기
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
    
    setTimeout(() => {
      setIsAdding(false);
    }, 500);
  };

  const handleBuyNow = () => {
    alert('결제 페이지로 이동합니다. (가상 결제창)');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-md border-t border-border-light md:static md:p-0 md:bg-transparent md:border-none md:z-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 w-full">
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
      </div>
    </div>
  );
}