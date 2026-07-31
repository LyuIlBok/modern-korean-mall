'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useChatStore } from '@/store/useChatStore';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, ShieldCheck, Heart, ChevronLeft, 
  ChevronRight, ChevronDown, Plus, Minus, ShoppingBag, CreditCard, MessageSquare,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import ProductTabs from './ProductTabs';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Product, ProductOption } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/utils';

export default function ProductDetailClient({ 
  product, 
  relatedProducts,
  initialOptions = []
}: { 
  product: Product, 
  relatedProducts: Product[],
  initialOptions?: ProductOption[]
}) {
  const router = useRouter();
  const { t, language } = useLanguageStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const { addItem, toggleCart } = useCartStore();
  const { setInquiryProduct, toggleChat, triggerAutoSend } = useChatStore();
  const hasMounted = useHasMounted();
  
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const [options, setOptions] = useState<ProductOption[]>(initialOptions);
  const [loadingOptions, setLoadingOptions] = useState(initialOptions.length === 0);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);

  const isWished = (hasMounted && product) ? isInWishlist(product.id) : false;
  const galleryImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];

  useEffect(() => {
    const fetchOptions = async () => {
      if (initialOptions.length > 0) {
        setLoadingOptions(false);
        return;
      }
      setLoadingOptions(true);
      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });
      
      if (data) setOptions(data as ProductOption[]);
      setLoadingOptions(false);
    };

    fetchOptions();
  }, [product.id, initialOptions]);

  const basePrice = Number(product.discount_rate || 0) > 0
    ? Math.floor(product.price * (1 - (product.discount_rate || 0) / 100))
    : product.price;

  const totalPrice = (basePrice + (selectedOption?.additional_price || 0)) * quantity;

  // 옵션을 선택했으면 옵션 재고, 아니면 상품 재고가 실제 구매 가능한 최대치입니다.
  // (최종 검증은 주문 시 서버(reserve_stock_for_order RPC)에서 다시 하지만,
  // 여기서 미리 막아두면 사용자 경험이 훨씬 좋아집니다.)
  const maxQuantity = Math.max(1, selectedOption ? selectedOption.stock : product.stock);

  const handleAddToCart = () => {
    if (!product) return;
    if (options.length > 0 && !selectedOption) {
      alert(language === 'ko' ? '상품 옵션을 먼저 선택해 주세요.' : 'Please select a product option first.');
      return;
    }
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      imageUrl: product.imageUrl, 
      category: product.category,
      description: product.description,
      shipping_fee: product.shipping_fee || 0,
      quantity: Math.min(quantity, maxQuantity),
      optionName: selectedOption?.option_name,
      optionPrice: selectedOption?.additional_price
    });
    toggleCart(true);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (options.length > 0 && !selectedOption) {
      alert(language === 'ko' ? '상품 옵션을 먼저 선택해 주세요.' : 'Please select a product option first.');
      return;
    }
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      imageUrl: product.imageUrl, 
      category: product.category,
      description: product.description,
      shipping_fee: product.shipping_fee || 0,
      quantity: Math.min(quantity, maxQuantity),
      optionName: selectedOption?.option_name,
      optionPrice: selectedOption?.additional_price
    });
    router.push('/checkout');
  };

  const handleProductInquiry = () => {
    if (!product) return;
    
    const metadata = {
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      price: product.price
    };

    setInquiryProduct({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: product.price
    });

    triggerAutoSend(
      `이 상품에 대해 궁금한 점이 있습니다.`,
      metadata
    );
    toggleChat(true);
  };

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-charcoal/5 rounded-sm ${className}`} />
  );

  const breadcrumbItems = [
    { label: t?.common?.shop || 'SHOP', href: '/shop' },
    { label: product.category, href: `/shop?category=${product.category}` },
    { label: product.name }
  ];

  return (
    <div className="bg-hanji-white min-h-screen flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        {/* Navigation */}
        <div className="flex flex-col gap-2 mb-12">
          <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors group text-xs uppercase tracking-widest w-fit">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> {t?.common?.shop || 'Back to Shop'}
          </Link>
          <Breadcrumb items={breadcrumbItems} />
        </div>

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
                  className="w-full h-full"
                >
                  <div className="relative aspect-[4/5] w-full h-full">
                    <Image 
                      src={galleryImages[activeImage]} 
                      alt={product.name} 
                      fill 
                      priority
                      className="object-cover" 
                    />
                  </div>
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
              <h1 className="font-serif text-5xl text-charcoal leading-tight mb-4 tracking-tight">{product.name}</h1>
              
              <div className="mb-8">
                {Number(product.discount_rate || 0) > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-terracotta text-white px-2 py-1 text-xs font-bold rounded-sm">{product.discount_rate}% OFF</span>
                      <p className="text-muted line-through decoration-muted/50 text-xl font-light">{formatPrice(Number(product.price))}</p>
                    </div>
                    <p className="text-4xl font-serif text-terracotta font-extrabold">{formatPrice(Math.floor(product.price * (1 - (product.discount_rate || 0) / 100)))}</p>
                  </div>
                ) : (
                  <p className="text-4xl font-serif text-charcoal">{formatPrice(Number(product.price))}</p>
                )}
                
                {Number(product.reward_points || 0) > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-deep-sage/5 border border-deep-sage/20 px-4 py-2 rounded-full">
                    <Plus className="w-4 h-4 text-deep-sage" />
                    <span className="text-sm font-medium text-deep-sage">구매 시 <span className="font-bold">{formatPrice(Number(product.reward_points))}</span> 적립</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Specs */}
            <div className="space-y-4 mb-12">
              <div className="grid grid-cols-3 text-sm py-2">
                <span className="text-muted uppercase tracking-widest font-bold text-xs">{t?.shop?.origin || '원산지'}</span>
                <span className="col-span-2 text-charcoal font-medium">{product.origin || '경기도 연천군'}</span>
              </div>
              <div className="grid grid-cols-3 text-sm py-2">
                <span className="text-muted uppercase tracking-widest font-bold text-xs">{t?.shop?.producer || '제조사'}</span>
                <span className="col-span-2 text-charcoal font-medium">{product.producer || '농업회사법인 복이네농장(주)'}</span>
              </div>
              <div className="grid grid-cols-3 text-sm py-2">
                <span className="text-muted uppercase tracking-widest font-bold text-xs">{t?.admin?.distributor || '유통사'}</span>
                <span className="col-span-2 text-charcoal font-medium">복이네농장</span>
              </div>
              <div className="grid grid-cols-3 text-sm py-2 border-b border-border-light/50 pb-4">
                <span className="text-muted uppercase tracking-widest font-bold text-xs">{t?.shop?.shipping || '배송 안내'}</span>
                <span className="col-span-2 text-charcoal font-medium">
                  {Number(product.shipping_fee) === 0 
                    ? (t?.shop?.freeShipping || '무료배송') 
                    : formatPrice(Number(product.shipping_fee))}
                </span>
              </div>
            </div>

            {/* Options Selection */}
            {loadingOptions ? (
              <div className="space-y-4 mb-8">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-[58px] w-full" />
              </div>
            ) : options.length > 0 && (
              <div className="space-y-4 mb-8">
                <label className="text-xs text-muted uppercase tracking-[0.2em] font-bold ml-1">{t?.shop?.optionSelection || '옵션 선택'}</label>
                <div className="relative">
                  <select 
                    value={selectedOption?.id || ''} 
                    onChange={(e) => {
                      const opt = options.find(o => o.id === e.target.value);
                      setSelectedOption(opt || null);
                    }}
                    className="w-full bg-hanji-white/50 border border-border-light px-6 py-4 rounded-sm text-base focus:border-deep-sage outline-none appearance-none cursor-pointer transition-all shadow-sm"
                  >
                    <option value="">{t?.shop?.optionSelection || '옵션을 선택해 주세요'} (필수)</option>
                    {options.map(opt => {
                      const isSoldOut = opt.stock <= 0 || !opt.is_active;
                      return (
                        <option key={opt.id} value={opt.id} disabled={isSoldOut}>
                          {opt.option_name} {opt.additional_price > 0 ? `(+${formatPrice(opt.additional_price)})` : ''}
                          {isSoldOut ? ` (${t?.common?.soldOut || '품절'})` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-muted" />
                  </div>
                </div>
              </div>
            )}

            {/* Quantity & Buttons */}
            <div className="space-y-8">
              <div className="flex flex-col gap-4 bg-hanji-white border border-border-light p-8 rounded-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest text-muted">{t?.shop?.quantity || '수량'}</span>
                  <div className="flex items-center gap-8 bg-white border border-border-light rounded-sm shadow-sm overflow-hidden">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-hanji-white hover:text-deep-sage transition-all border-r border-border-light"><Minus className="w-5 h-5" /></button>
                    <span className="font-serif text-2xl w-12 text-center font-bold">{Math.min(quantity, maxQuantity)}</span>
                    <button onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="p-3 hover:bg-hanji-white hover:text-deep-sage transition-all border-l border-border-light"><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border-light/50 flex justify-between items-end">
                  <span className="text-xs text-muted uppercase tracking-widest font-black">{t?.shop?.totalAmount || '최종 결제 금액'}</span>
                  <p className="text-4xl font-serif text-charcoal font-black tracking-tighter">{formatPrice(totalPrice)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.is_sold_out}
                  className="flex items-center justify-center gap-4 py-6 bg-white border-2 border-charcoal text-charcoal hover:bg-hanji-white transition-all font-serif text-xl rounded-sm disabled:opacity-50 font-bold shadow-lg"
                >
                  <ShoppingBag className="w-6 h-6" /> {t?.common?.addToCart || '장바구니 담기'}
                </button>
                <button 
                  onClick={handleBuyNow}
                  disabled={product.is_sold_out}
                  className="flex items-center justify-center gap-4 py-6 bg-charcoal text-white hover:bg-deep-sage transition-all font-serif text-xl rounded-sm shadow-2xl disabled:opacity-50 font-bold group"
                >
                  <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" /> {t?.common?.buyNow || '바로 구매하기'}
                </button>
              </div>
              
              <button 
                onClick={handleProductInquiry}
                className="w-full py-4 border border-border-light text-muted hover:text-charcoal hover:border-charcoal transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-sm"
              >
                <MessageSquare className="w-4 h-4" /> 이 제품 상담하기
              </button>
            </div>
          </div>
        </div>

        {/* 2. Detail Tabs (Details, Reviews, Q&A) */}
        <ProductTabs product={product} />

        {/* 3. Related Products */}
        <div className="mt-48 pt-24 border-t border-border-light">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-serif text-4xl text-charcoal">이런 산물은 어떠세요?</h2>
              <p className="text-muted mt-2 font-light italic">Nature Texture&apos;s premium selection.</p>
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
