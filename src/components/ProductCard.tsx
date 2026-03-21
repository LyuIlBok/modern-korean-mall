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
    if (product.is_sold_out) return;
    addItem(product);
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
  };

  return (
    <Link href={`/shop/${product.id}`} className={`group block ${product.is_sold_out ? 'cursor-default' : ''}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-border-light/20 rounded-sm mb-4">
        {!isLoaded && <Skeleton className="absolute inset-0 z-10" />}
        
        {/* Sold Out Overlay */}
        {product.is_sold_out && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="bg-white/90 border border-charcoal/10 px-4 py-2 shadow-sm transform -rotate-3">
              <span className="font-serif text-xs tracking-[0.3em] text-charcoal uppercase">Sold Out</span>
            </div>
          </div>
        )}

        <Image 
          src={product.imageUrl} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-all duration-700 ${product.is_sold_out ? 'grayscale-[0.5] opacity-60' : 'group-hover:scale-105 opacity-100'} ${isLoaded ? '' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
        />
        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors duration-300" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-terracotta uppercase tracking-widest">{product.category}</span>
        <h3 className={`font-serif text-lg ${product.is_sold_out ? 'text-muted' : 'text-charcoal group-hover:text-deep-sage'} transition-colors`}>{product.name}</h3>
        <p className="text-muted text-[13px] line-clamp-2 font-light leading-relaxed">{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className={`font-medium text-lg tracking-tight ${product.is_sold_out ? 'text-muted line-through opacity-50' : ''}`}>
            {product.price.toLocaleString()}원
          </span>
          <button 
            onClick={handleAddToCart}
            disabled={product.is_sold_out}
            className={`text-xs border-b pb-0.5 transition-all uppercase tracking-tighter ${
              product.is_sold_out 
                ? 'text-muted border-transparent cursor-not-allowed opacity-50' 
                : 'text-charcoal/60 border-charcoal/20 hover:text-deep-sage hover:border-deep-sage'
            }`}
          >
            {product.is_sold_out ? '품절' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </Link>
  );
}
