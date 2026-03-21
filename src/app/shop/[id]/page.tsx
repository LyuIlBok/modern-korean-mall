'use client';

import Image from 'next/image';
import Link from 'next/link';
import { products as mockProducts } from '@/data/mockData';
import { notFound, useParams } from 'next/navigation';
import PurchaseButtons from './AddToCartButton';
import ProductTabs from './ProductTabs';
import ProductCard, { ProductWithRating } from '@/components/ProductCard';
import { ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useHasMounted } from '@/hooks/useHasMounted';

export default function ProductDetailPage() {
  const params = useParams();
  const { t, language } = useLanguageStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const hasMounted = useHasMounted();
  
  const [product, setProduct] = useState<ProductWithRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // 찜하기 상태 - 마운트 후에만 정확한 값 계산
  const isWished = (hasMounted && product) ? isInWishlist(product.id) : false;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, reviews(rating)')
          .eq('id', params.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          const ratings = data.reviews?.map((r: any) => r.rating) || [];
          const avgRating = ratings.length > 0 
            ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
            : 0;
          setProduct({
            ...data,
            avgRating,
            reviewCount: ratings.length
          });
        } else {
          const mockProduct = mockProducts.find(p => p.id === params.id);
          setProduct(mockProduct ? { ...mockProduct, avgRating: 0, reviewCount: 0 } : null);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        const mockProduct = mockProducts.find(p => p.id === params.id);
        setProduct(mockProduct ? { ...mockProduct, avgRating: 0, reviewCount: 0 } : null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 bg-hanji-white min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const allImages = product.images || [product.imageUrl];
  const relatedProducts = mockProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // 다국어 텍스트 안전 참조
  const deliveryText = language === 'ko' ? '오늘 주문 시, 내일 도착 보장' : 'Guaranteed delivery tomorrow';
  const originText = language === 'ko' ? '정직한 원산지 보장제' : 'Honest Origin Guarantee';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1 bg-hanji-white">
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-8 group text-xs uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> {t?.common?.shop || 'Shop'}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-24">
        {/* Product Gallery */}
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
                  onError={(e: any) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=800';
                  }}
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
                <button 
                  onClick={() => setActiveImage((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-all z-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setActiveImage((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/50 hover:bg-white rounded-full transition-all z-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-20 h-24 flex-shrink-0 border-2 transition-all rounded-sm overflow-hidden ${
                    activeImage === idx ? 'border-deep-sage shadow-md scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col pt-4">
          <div className="mb-10">
            <span className="text-xs font-medium text-terracotta tracking-[0.3em] mb-3 block uppercase">{product.category}</span>
            <h1 className="font-serif text-4xl md:text-5xl mb-6 leading-[1.1] tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-4">
              <p className={`text-2xl font-serif ${product.is_sold_out ? 'text-muted line-through opacity-50' : 'text-charcoal'}`}>
                ₩{product.price.toLocaleString()}
              </p>
              {product.is_sold_out && <span className="text-xs text-terracotta font-medium tracking-widest uppercase bg-terracotta/5 px-2 py-1">Out of Stock</span>}
            </div>
          </div>
          
          <div className="bg-hanji-white border border-border-light p-6 rounded-sm space-y-5 mb-12 text-[13px]">
            <div className="flex gap-4">
              <Truck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">{deliveryText}</p>
                <p className="text-muted text-[11px] mt-1">{t?.common?.footerDesc || ''}</p>
              </div>
            </div>
            <div className="flex gap-4 border-t border-border-light pt-5">
              <ShieldCheck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">{originText}</p>
                <p className="text-muted text-[11px] mt-1">Direct from the farm.</p>
              </div>
            </div>
          </div>

          <div className="prose prose-stone mb-16">
            <p className="text-charcoal/80 leading-relaxed text-lg font-light whitespace-pre-line">{product.description}</p>
          </div>

          {/* Mandatory Product Info Table */}
          <div className="mb-16">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-4">{t?.shop?.specs || 'Specifications'}</h3>
            <div className="border-t border-border-light text-[12px]">
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.origin || 'Origin'}</span>
                <span className="col-span-2 text-charcoal font-medium">경기도 연천군 군남면 청정로2194번길 366-59 (Korea)</span>
              </div>
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.storage || 'Storage'}</span>
                <span className="col-span-2 text-charcoal font-medium">직사광선을 피하고 서늘한 곳에 보관 (Keep in a cool place)</span>
              </div>
              <div className="grid grid-cols-3 py-3 border-b border-border-light/50">
                <span className="text-muted">{t?.shop?.producer || 'Producer'}</span>
                <span className="col-span-2 text-charcoal font-medium">농업회사법인 복이네농장(주)</span>
              </div>
            </div>
          </div>

          <PurchaseButtons product={product} />
        </div>
      </div>

      <ProductTabs product={product} />

      <div className="mt-32 pt-24 border-t border-border-light">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 text-charcoal">{t?.shop?.relatedTitle || 'Related'}</h2>
            <p className="text-muted text-sm tracking-wide">Nature Texture's recommendation.</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-all border-b border-current pb-1 text-xs uppercase tracking-widest">{t?.home?.viewAll || 'View All'}</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {relatedProducts.length > 0 ? relatedProducts.map(p => <ProductCard key={p.id} product={p} />) : mockProducts.slice(0, 4).filter(p => p.id !== product.id).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
