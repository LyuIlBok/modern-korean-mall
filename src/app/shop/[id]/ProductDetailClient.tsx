'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import PurchaseButtons from './AddToCartButton';
import ProductTabs from './ProductTabs';
import ProductCard from '@/components/ProductCard';
import { ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function ProductDetailClient({ 
  product, 
  relatedProducts 
}: { 
  product: any, 
  relatedProducts: any[] 
}) {
  const { t, language } = useLanguageStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const hasMounted = useHasMounted();
  const [activeImage, setActiveImage] = useState(0);

  const isWished = (hasMounted && product) ? isInWishlist(product.id) : false;
  const allImages = product.images || [product.imageUrl];

  const deliveryText = language === 'ko' ? '오늘 주문 시, 내일 도착 보장' : 'Guaranteed delivery tomorrow';
  const originText = language === 'ko' ? '정직한 원산지 보장제' : 'Honest Origin Guarantee';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1 bg-hanji-white">
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-8 group text-xs uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> {t?.common?.shop || 'Shop'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-24">
        <div className="space-y-6">
          <div className="relative aspect-[4/5] bg-border-light/20 rounded-sm overflow-hidden group shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full h-full"
              >
                <Image 
                  src={allImages[activeImage]} 
                  alt={product.name} 
                  fill 
                  className="object-cover"
                  priority
                />
              </motion.div>
            </AnimatePresence>
            
            {product.is_sold_out && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                <div className="bg-white/90 border border-charcoal/10 px-6 py-3 shadow-sm">
                  <span className="font-serif text-sm tracking-[0.4em] text-charcoal uppercase">{t?.common?.soldOut || 'Sold Out'}</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => toggleWish(product)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all shadow-sm z-30 ${
                isWished ? 'bg-terracotta text-white' : 'bg-white/80 text-terracotta hover:bg-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
            </button>

            {allImages.length > 1 && (
              <>
                <button onClick={() => setActiveImage((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-all z-30"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setActiveImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-all z-30"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((img: string, idx: number) => (
                <button key={idx} onClick={() => setActiveImage(idx)} className={`relative w-20 h-24 flex-shrink-0 border-2 transition-all rounded-sm overflow-hidden ${activeImage === idx ? 'border-deep-sage shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}><Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" /></button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col pt-4">
          <div className="mb-10">
            <span className="text-xs font-medium text-terracotta tracking-[0.3em] mb-3 block uppercase">{product.category}</span>
            <h1 className="font-serif text-4xl md:text-5xl mb-6 leading-[1.1] tracking-tight">{product.name}</h1>
            <p className="text-2xl font-serif text-charcoal">₩{product.price.toLocaleString()}</p>
          </div>
          
          <div className="bg-hanji-white border border-border-light p-6 rounded-sm space-y-5 mb-12 text-[13px]">
            <div className="flex gap-4">
              <Truck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div><p className="font-medium text-charcoal">{deliveryText}</p><p className="text-muted text-[11px] mt-1">{t?.common?.footerDesc || ''}</p></div>
            </div>
          </div>

          <div className="prose prose-stone mb-16"><p className="text-charcoal/80 leading-relaxed text-lg font-light whitespace-pre-line">{product.description}</p></div>

          {/* Mandatory Product Info Table */}
          <div className="mb-16">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-4">{t?.shop?.specs || 'Specifications'}</h3>
            <div className="border-t border-border-light text-[12px]">
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.origin || 'Origin'}</span>
                <span className="col-span-2 text-charcoal font-medium">{product.specs?.origin || '경기도 연천군 군남면'}</span>
              </div>
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.producer || 'Producer'}</span>
                <span className="col-span-2 text-charcoal font-medium">{product.specs?.producer || '농업회사법인 복이네농장(주)'}</span>
              </div>
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.storage || 'Storage'}</span>
                <span className="col-span-2 text-charcoal font-medium">직사광선을 피하고 서늘한 곳에 보관</span>
              </div>
            </div>
          </div>

          <PurchaseButtons product={product} />
        </div>
      </div>

      <ProductTabs product={product} />

      {/* NEW: Large Detail Content Section (Professional Mall Style) */}
      <div className="mt-32 max-w-4xl mx-auto space-y-0">
        <div className="text-center mb-24 space-y-6">
          <span className="text-deep-sage text-xs font-bold tracking-[0.5em] uppercase">Brand Story</span>
          <h2 className="font-serif text-4xl md:text-5xl text-charcoal">자연의 결이 선사하는<br/>가장 정직한 산물</h2>
          <div className="w-px h-24 bg-border-light mx-auto"></div>
        </div>

        {product.detail_content_images?.length > 0 ? (
          product.detail_content_images.map((img: string, idx: number) => (
            <div key={idx} className="relative w-full aspect-[3/4] md:aspect-[2/3]">
              <Image src={img} alt={`Detail ${idx}`} fill className="object-cover" />
            </div>
          ))
        ) : (
          <div className="relative w-full aspect-[3/4] md:aspect-[2/3]">
            <Image 
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200" 
              alt="Default Detail" 
              fill 
              className="object-cover" 
            />
          </div>
        )}
      </div>

      <div className="mt-32 pt-24 border-t border-border-light">
        <h2 className="font-serif text-3xl md:text-4xl mb-16 text-charcoal">{t?.shop?.relatedTitle || 'Related'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {relatedProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
