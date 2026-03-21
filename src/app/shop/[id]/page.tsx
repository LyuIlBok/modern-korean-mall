'use client';

import Image from 'next/image';
import Link from 'next/link';
import { products as mockProducts, Product } from '@/data/mockData';
import { notFound, useParams } from 'next/navigation';
import PurchaseButtons from './AddToCartButton';
import ProductTabs from './ProductTabs';
import ProductCard from '@/components/ProductCard';
import { ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setProduct(data);
        } else {
          // Fallback to mock data
          const mockProduct = mockProducts.find(p => p.id === params.id);
          setProduct(mockProduct || null);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        const mockProduct = mockProducts.find(p => p.id === params.id);
        setProduct(mockProduct || null);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const allImages = product.images || [product.imageUrl];

  // 연관 상품
  const relatedProducts = mockProducts
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-8 group text-xs uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Collection
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
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Sold Out Overlay */}
            {product.is_sold_out && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                <div className="bg-white/90 border border-charcoal/10 px-6 py-3 shadow-sm">
                  <span className="font-serif text-sm tracking-[0.4em] text-charcoal uppercase">Sold Out</span>
                </div>
              </div>
            )}

            <button className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm z-30">
              <Heart className="w-5 h-5 text-terracotta" />
            </button>

            {/* Navigation Arrows */}
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

          {/* Thumbnails */}
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
                {product.price.toLocaleString()}원
              </p>
              {product.is_sold_out && <span className="text-xs text-terracotta font-medium tracking-widest uppercase bg-terracotta/5 px-2 py-1">Out of Stock</span>}
            </div>
          </div>
          
          <div className="bg-hanji-white border border-border-light p-6 rounded-sm space-y-5 mb-12 text-[13px]">
            <div className="flex gap-4">
              <Truck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">오늘 주문 시, 내일 도착 보장</p>
                <p className="text-muted text-[11px] mt-1">자연의 결은 가장 신선한 상태의 산물을 약속합니다.</p>
              </div>
            </div>
            <div className="flex gap-4 border-t border-border-light pt-5">
              <ShieldCheck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">정직한 원산지 보장제</p>
                <p className="text-muted text-[11px] mt-1">모든 산물은 연천군 농부의 손에서 직접 전달됩니다.</p>
              </div>
            </div>
          </div>

          <div className="prose prose-stone mb-16">
            <p className="text-charcoal/80 leading-relaxed text-lg font-light whitespace-pre-line">{product.description}</p>
          </div>

          <PurchaseButtons product={product} />
        </div>
      </div>

      <ProductTabs product={product} />

      <div className="mt-32 pt-24 border-t border-border-light">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 text-charcoal">함께하면 좋은 산물</h2>
            <p className="text-muted text-sm tracking-wide">자연의 결이 추천하는 어우러짐이 좋은 상품들입니다.</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-all border-b border-current pb-1 text-xs uppercase tracking-widest">View All</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {relatedProducts.length > 0 ? relatedProducts.map(p => <ProductCard key={p.id} product={p} />) : mockProducts.slice(0, 4).filter(p => p.id !== product.id).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
