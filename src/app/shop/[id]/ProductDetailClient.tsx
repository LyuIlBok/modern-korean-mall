'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, ChevronRight, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartStore } from '@/store/useCartStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import ProductCard from '@/components/ProductCard';
import ProductTabs from './ProductTabs';

export default function ProductDetailClient({ 
  product, 
  relatedProducts 
}: { 
  product: any, 
  relatedProducts: any[] 
}) {
  const router = useRouter();
  const { language, t } = useLanguageStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const { addItem, toggleCart } = useCartStore();
  const hasMounted = useHasMounted();
  
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isWished = (hasMounted && product) ? isInWishlist(product.id) : false;
  const galleryImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const detailImages = product.detail_content_images || [];

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      imageUrl: product.imageUrl, 
      shipping_fee: product.shipping_fee || 0,
      quantity 
    });
    toggleCart(true);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      imageUrl: product.imageUrl, 
      shipping_fee: product.shipping_fee || 0,
      quantity 
    });
    router.push('/checkout');
  };

  return (
    <div className="bg-hanji-white min-h-screen flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        {/* Navigation */}
        <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-12 group text-xs uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> {t?.common?.shop || 'Back to Shop'}
        </Link>

        {/* 1. Purchase Area (Top Section) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 mb-32">
          
          {/* Left: Image Gallery */}
          <div className="space-y-6">
            <div className="relative aspect-square bg-white rounded-sm overflow-hidden shadow-sm group border border-border-light">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-full h-full"
                >
                  <Image 
                    src={galleryImages[activeImage]} 
                    alt={product.name} 
                    fill 
                    className="object-cover"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
              
              {product.is_sold_out && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                  <div className="bg-white/90 border border-charcoal/10 px-8 py-4 shadow-xl">
                    <span className="font-serif text-lg tracking-[0.4em] text-charcoal uppercase">{t?.common?.soldOut || 'Sold Out'}</span>
                  </div>
                </div>
              )}

              {galleryImages.length > 1 && (
                <>
                  <button onClick={() => setActiveImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full transition-all z-30 shadow-md"><ChevronLeft className="w-5 h-5 text-charcoal" /></button>
                  <button onClick={() => setActiveImage((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white rounded-full transition-all z-30 shadow-md"><ChevronRight className="w-5 h-5 text-charcoal" /></button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {galleryImages.map((img: string, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => setActiveImage(idx)} 
                    className={`relative w-24 h-24 flex-shrink-0 border-2 transition-all rounded-sm overflow-hidden ${activeImage === idx ? 'border-deep-sage shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info & Buy */}
          <div className="flex flex-col">
            <div className="mb-10 pb-10 border-b border-border-light">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-deep-sage tracking-[0.3em] uppercase">{product.category}</span>
                <button onClick={() => toggleWish(product)} className={`p-2 transition-colors ${isWished ? 'text-terracotta' : 'text-muted hover:text-terracotta'}`}>
                  <Heart className={`w-6 h-6 ${isWished ? 'fill-current' : ''}`} />
                </button>
              </div>
              <h1 className="font-serif text-5xl text-charcoal leading-tight mb-6 tracking-tight">{product.name}</h1>
              <p className="text-3xl font-serif text-charcoal mb-8">₩{Number(product.price).toLocaleString()}</p>
              <p className="text-muted leading-relaxed font-light whitespace-pre-line text-lg">{product.description}</p>
            </div>

            {/* Product Specs */}
            <div className="space-y-4 mb-12">
              <div className="grid grid-cols-3 text-sm py-2">
                <span className="text-muted uppercase tracking-widest font-bold text-[10px]">Origin</span>
                <span className="col-span-2 text-charcoal">{product.specs?.origin || '경기도 연천군'}</span>
              </div>
              <div className="grid grid-cols-3 text-sm py-2">
                <span className="text-muted uppercase tracking-widest font-bold text-[10px]">Producer</span>
                <span className="col-span-2 text-charcoal">{product.specs?.producer || '농업회사법인 복이네농장(주)'}</span>
              </div>
              <div className="grid grid-cols-3 text-sm py-2 border-b border-border-light/50 pb-4">
                <span className="text-muted uppercase tracking-widest font-bold text-[10px]">Shipping</span>
                <span className="col-span-2 text-charcoal">농장직송 / 신선배송</span>
              </div>
            </div>

            {/* Quantity & Buttons */}
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-hanji-white border border-border-light p-4 rounded-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-muted">Quantity</span>
                <div className="flex items-center gap-6">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 hover:text-deep-sage transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="font-serif text-xl w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-1 hover:text-deep-sage transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.is_sold_out}
                  className="flex items-center justify-center gap-3 py-5 bg-white border border-charcoal text-charcoal hover:bg-hanji-white transition-all font-serif text-lg rounded-sm disabled:opacity-50"
                >
                  <ShoppingBag className="w-5 h-5" /> 장바구니 담기
                </button>
                <button 
                  onClick={handleBuyNow}
                  disabled={product.is_sold_out}
                  className="flex items-center justify-center gap-3 py-5 bg-charcoal text-white hover:bg-deep-sage transition-all font-serif text-lg rounded-sm shadow-xl disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" /> 바로 구매하기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Detail Tabs (Reviews, etc.) */}
        <ProductTabs product={product} />

        {/* 3. Detail Content Area (Long Vertical Images) */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-24 space-y-6">
            <div className="inline-block p-3 rounded-full bg-deep-sage/5 mb-4"><ShieldCheck className="w-10 h-10 text-deep-sage" /></div>
            <h2 className="font-serif text-4xl md:text-5xl text-charcoal">자연의 결이 선사하는<br/>가장 정직한 산물</h2>
            <div className="w-px h-24 bg-deep-sage/20 mx-auto"></div>
          </div>

          <div className="space-y-0">
            {detailImages.length > 0 ? (
              detailImages.map((img: string, idx: number) => (
                <div key={idx} className="relative w-full overflow-hidden">
                  <img src={img} alt={`Detail ${idx}`} className="w-full h-auto block" />
                </div>
              ))
            ) : (
              <div className="py-32 text-center border-y border-border-light border-dashed">
                <p className="text-muted italic font-light font-serif text-xl">상세 설명 이미지를 준비 중입니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Related Products */}
        <div className="mt-48 pt-24 border-t border-border-light">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-serif text-4xl text-charcoal">이런 산물은 어떠세요?</h2>
              <p className="text-muted mt-2 font-light italic">Nature Texture's premium selection.</p>
            </div>
            <Link href="/shop" className="text-deep-sage hover:text-charcoal transition-all border-b border-current pb-1 text-xs uppercase tracking-[0.3em] font-bold">Explore All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {relatedProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
