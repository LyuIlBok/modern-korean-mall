'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useState } from 'react';
import Skeleton from './ui/Skeleton';
import { Star, Heart, Plus } from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';
import { motion } from 'framer-motion';

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
    addItem({ ...product, shipping_fee: product.shipping_fee || 0 });
    addToast(`${product.name}이(가) 장바구니에 담겼습니다.`, 'success');
  };

  const handleToggleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWish(product);
  };

  const handleImgError = () => {
    setImgSrc('https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=800');
  };

  const discountRate = Number(product.discount_rate || 0);
  const discountedPrice = Math.floor(product.price * (1 - discountRate / 100));
  const rewardPoints = Number(product.reward_points || 0);

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link href={`/shop/${product.id}`} className={`group block h-full flex flex-col ${product.is_sold_out ? 'cursor-default' : ''}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-hanji-white rounded-sm mb-5 shadow-sm group-hover:shadow-xl transition-all duration-500">
          {!isLoaded && <Skeleton className="absolute inset-0 z-10" />}
          
          {product.is_sold_out && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <div className="bg-white/95 border border-charcoal/10 px-5 py-2.5 shadow-xl transform -rotate-2">
                <span className="font-serif text-xs tracking-[0.4em] text-charcoal uppercase font-bold">Sold Out</span>
              </div>
            </div>
          )}

          {!product.is_sold_out && discountRate > 0 && (
            <div className="absolute top-4 left-4 z-30 bg-terracotta text-white px-3 py-1.5 rounded-sm shadow-lg">
              <span className="text-[11px] font-bold tracking-tighter">{discountRate}% OFF</span>
            </div>
          )}

          {!product.is_sold_out && rewardPoints > 0 && (
            <div className="absolute bottom-4 left-4 z-30 bg-deep-sage/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-lg border border-white/20">
              <span className="text-[9px] font-bold flex items-center gap-1">
                <Plus className="w-2.5 h-2.5" /> {rewardPoints.toLocaleString()}원 적립
              </span>
            </div>
          )}

          <Image 
            src={imgSrc} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover transition-all duration-1000 ${product.is_sold_out ? 'grayscale opacity-50' : 'group-hover:scale-110 opacity-100'} ${isLoaded ? '' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={handleImgError}
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-75">
            <button 
              onClick={handleAddToCart}
              disabled={product.is_sold_out}
              className="p-3 bg-white text-charcoal rounded-full shadow-lg hover:bg-deep-sage hover:text-white transition-all transform hover:scale-110 active:scale-95"
              title="Add to Cart"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={handleToggleWish}
            className={`absolute top-4 right-4 z-30 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm ${
              isWished 
                ? 'bg-terracotta text-white scale-110' 
                : 'bg-white/80 text-charcoal/30 hover:text-terracotta hover:scale-110'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-terracotta/80 uppercase tracking-[0.2em]">{product.category}</span>
            {product.reviewCount !== undefined && product.reviewCount > 0 && (
              <div className="flex items-center gap-1 bg-terracotta/5 px-2 py-0.5 rounded-full">
                <Star className="w-2.5 h-2.5 fill-terracotta text-terracotta" />
                <span className="text-[10px] font-bold text-charcoal">{product.avgRating?.toFixed(1)}</span>
                <span className="text-[9px] text-muted">({product.reviewCount})</span>
              </div>
            )}
          </div>
          
          <h3 className={`font-serif text-xl mb-2 leading-tight ${product.is_sold_out ? 'text-muted' : 'text-charcoal group-hover:text-deep-sage'} transition-colors duration-300 line-clamp-1`}>
            {product.name}
          </h3>
          
          <div className="mt-auto flex items-end justify-between">
            <div className="flex flex-col">
              {discountRate > 0 ? (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted line-through decoration-muted/50 font-medium">
                    ₩{product.price.toLocaleString()}
                  </p>
                  <p className="text-lg font-serif font-extrabold text-terracotta">
                    ₩{discountedPrice.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className={`text-lg font-serif font-bold ${product.is_sold_out ? 'text-muted' : 'text-charcoal'}`}>
                  ₩{product.price.toLocaleString()}
                </p>
              )}
              {!product.is_sold_out && <span className="text-[9px] text-deep-sage font-medium uppercase tracking-tighter">Free Shipping</span>}
            </div>
            
            <span className="text-[10px] text-muted/40 group-hover:text-deep-sage transition-colors font-medium tracking-widest flex items-center gap-1">
              DETAILS <Plus className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
