'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useState } from 'react';
import Skeleton from './ui/Skeleton';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();
  const [isLoaded, setIsLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
  };

  return (
    <Link href={`/shop/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-border-light/20 rounded-sm mb-4">
        {!isLoaded && <Skeleton className="absolute inset-0 z-10" />}
        <Image 
          src={product.imageUrl} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-all duration-700 group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-300" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-terracotta uppercase tracking-widest">{product.category}</span>
        <h3 className="font-serif text-lg text-charcoal group-hover:text-deep-sage transition-colors">{product.name}</h3>
        <p className="text-muted text-[13px] line-clamp-2 font-light leading-relaxed">{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-medium text-lg tracking-tight">{product.price.toLocaleString()}원</span>
          <button 
            onClick={handleAddToCart}
            className="text-xs text-charcoal/60 border-b border-charcoal/20 pb-0.5 hover:text-deep-sage hover:border-deep-sage transition-all uppercase tracking-tighter"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}
