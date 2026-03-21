'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useState } from 'react';
import Skeleton from './ui/Skeleton';
import { Star, Heart } from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';

export interface ProductWithRating extends Product {
  avgRating?: number;
  reviewCount?: number;
}

export default function ProductCard({ product }: { product: ProductWithRating }) {
  const { addItem } = useCartStore();
  const { addToast } = useToastStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(product.imageUrl);

  const isWished = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.is_sold_out) return;
    addItem(product);
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
  };

  const handleToggleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWish(product);
    addToast(
      isWished ? '관심 상품에서 제거되었습니다.' : '관심 상품에 추가되었습니다.',
      isWished ? 'info' : 'success'
    );
  };

  // 이미지 에러 시 대체 이미지 (한지 느낌의 플레이스홀더)
  const handleImgError = () => {
    setImgSrc('https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=800');
  };

  return (
    <Link href={`/shop/${product.id}`} className={`group block ${product.is_sold_out ? 'cursor-default' : ''}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-border-light/20 rounded-sm mb-4">
        {!isLoaded && <Skeleton className="absolute inset-0 z-10" />}
        
        {product.is_sold_out && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="bg-white/90 border border-charcoal/10 px-4 py-2 shadow-sm transform -rotate-3">
              <span className="font-serif text-xs tracking-[0.3em] text-charcoal uppercase">Sold Out</span>
            </div>
          </div>
        )}

        <Image 
          src={imgSrc} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-all duration-700 ${product.is_sold_out ? 'grayscale-[0.5] opacity-60' : 'group-hover:scale-105 opacity-100'} ${isLoaded ? '' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={handleImgError}
        />
        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors duration-300" />
        
        <button 
          onClick={handleToggleWish}
          className={`absolute top-3 right-3 z-30 p-2 rounded-full backdrop-blur-md transition-all duration-300 ${
            isWished 
              ? 'bg-terracotta text-white shadow-md' 
              : 'bg-white/70 text-charcoal/40 hover:bg-white hover:text-terracotta'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-terracotta uppercase tracking-widest">{product.category}</span>
          {product.reviewCount !== undefined && product.reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-terracotta text-terracotta" />
              <span className="text-[10px] font-bold text-charcoal">{product.avgRating?.toFixed(1)}</span>
              <span className="text-[10px] text-muted">({product.reviewCount})</span>
            </div>
          )}
        </div>
        <h3 className={`font-serif text-lg ${product.is_sold_out ? 'text-muted' : 'text-charcoal group-hover:text-deep-sage'} transition-colors line-clamp-1`}>{product.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <p className={`font-serif font-bold ${product.is_sold_out ? 'text-muted' : 'text-charcoal'}`}>
            ₩{product.price.toLocaleString()}
          </p>
          <button 
            onClick={handleAddToCart}
            disabled={product.is_sold_out}
            className={`text-[10px] uppercase tracking-widest border-b pb-0.5 transition-all ${
              product.is_sold_out 
              ? 'text-muted border-transparent' 
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
