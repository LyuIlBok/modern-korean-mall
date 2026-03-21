'use client';

import { useState } from 'react';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem, toggleCart } = useCartStore();
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    setIsAdding(true);
    addItem(product);
    setTimeout(() => {
      setIsAdding(false);
      toggleCart();
    }, 200);
  };

  return (
    <button 
      onClick={handleAdd}
      disabled={isAdding}
      className={`w-full py-5 text-lg font-medium rounded-sm transition-all duration-300 ${
        isAdding 
          ? 'bg-terracotta text-white scale-[0.98]' 
          : 'bg-charcoal text-white hover:bg-deep-sage'
      }`}
    >
      {isAdding ? '담는 중...' : '장바구니에 담기'}
    </button>
  );
}