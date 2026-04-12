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
  ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, 
  ChevronRight, ChevronDown, Plus, Minus, ShoppingBag, CreditCard, MessageSquare,
  Star, StarHalf, MessageCircle, Camera, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import ProductTabs from './ProductTabs';
import { Product } from '@/data/mockData';
import { supabase } from '@/lib/supabaseClient';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  content: string;
  image_url?: string;
  created_at: string;
}

interface ProductOption {
  id: string;
  option_name: string;
  additional_price: number;
  stock: number;
  is_active: boolean;
}

export default function ProductDetailClient({ 
  product, 
  relatedProducts 
}: { 
  product: any, 
  relatedProducts: any[] 
}) {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { toggleWish, isInWishlist } = useWishlistStore();
  const { addItem, toggleCart } = useCartStore();
  const { setInquiryProduct, toggleChat, triggerAutoSend } = useChatStore();
  const hasMounted = useHasMounted();
  
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);

  const isWished = (hasMounted && product) ? isInWishlist(product.id) : false;
  const galleryImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const detailImages = product.detail_content_images || [];

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      
      if (data) setReviews(data as Review[]);
      setLoadingReviews(false);
    };
    
    const fetchOptions = async () => {
      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });
      
      if (data) setOptions(data as ProductOption[]);
    };

    fetchReviews();
    fetchOptions();
  }, [product.id]);

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const basePrice = Number(product.discount_rate || 0) > 0 
    ? Math.floor(product.price * (1 - (product.discount_rate || 0) / 100))
    : product.price;

  const totalPrice = (basePrice + (selectedOption?.additional_price || 0)) * quantity;

  const handleAddToCart = () => {
    if (!product) return;
    if (options.length > 0 && !selectedOption) {
      alert(language === 'ko' ? '상품 옵션을 먼저 선택해 주세요.' : 'Please select a product option first.');
      return;
    }
    addItem({ 
      id: product.id, 
      name: product.name, 
      price: product.price, // useCartStore handles discount/options if updated accordingly
      imageUrl: product.imageUrl, 
      category: product.category,
      description: product.description,
      shipping_fee: product.shipping_fee || 0,
      quantity,
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
      quantity,
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-amber-400 fill-current' : 'text-border-light'}`} />
    ));
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
              
              {/* Rating Summary */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-0.5">{renderStars(Number(avgRating))}</div>
                <span className="text-xs font-bold text-charcoal">{avgRating}</span>
                <span className="text-[10px] text-muted uppercase tracking-widest">({reviews.length} Reviews)</span>
              </div>

              <div className="mb-8">
                {Number(product.discount_rate || 0) > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-terracotta text-white px-2 py-1 text-xs font-bold rounded-sm">{product.discount_rate}% OFF</span>
                      <p className="text-muted line-through decoration-muted/50 text-xl font-light">₩{Number(product.price).toLocaleString()}</p>
                    </div>
                    <p className="text-4xl font-serif text-terracotta font-extrabold">₩{Math.floor(product.price * (1 - (product.discount_rate || 0) / 100)).toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="text-4xl font-serif text-charcoal">₩{Number(product.price).toLocaleString()}</p>
                )}
                
                {Number(product.reward_points || 0) > 0 && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-deep-sage/5 border border-deep-sage/20 px-4 py-2 rounded-full">
                    <Plus className="w-4 h-4 text-deep-sage" />
                    <span className="text-sm font-medium text-deep-sage">구매 시 <span className="font-bold">{Number(product.reward_points).toLocaleString()}원</span> 적립</span>
                  </div>
                )}
              </div>
              
              {/* Rich Text Description Rendering */}
              <div 
                className="text-muted leading-relaxed font-light text-lg prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
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
                    : `₩${Number(product.shipping_fee).toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Options Selection */}
            {options.length > 0 && (
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
                          {opt.option_name} {opt.additional_price > 0 ? `(+₩${opt.additional_price.toLocaleString()})` : ''}
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
                    <span className="font-serif text-2xl w-12 text-center font-bold">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-hanji-white hover:text-deep-sage transition-all border-l border-border-light"><Plus className="w-5 h-5" /></button>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-border-light/50 flex justify-between items-end">
                  <span className="text-xs text-muted uppercase tracking-widest font-black">{t?.shop?.totalAmount || '최종 결제 금액'}</span>
                  <p className="text-4xl font-serif text-charcoal font-black tracking-tighter">₩{totalPrice.toLocaleString()}</p>
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

        {/* 2. Detail Tabs (Reviews, etc.) */}
        <ProductTabs product={product} />

        {/* 3. Review Section (New) */}
        <section id="reviews" className="mt-32 pt-24 border-t border-border-light">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4">
              <h2 className="font-serif text-4xl text-charcoal">회원님들의 솔직한 기록</h2>
              <p className="text-muted font-light italic">Nature Texture&apos;s verified customer reviews.</p>
            </div>
            <div className="flex items-center gap-6 bg-white px-8 py-4 border border-border-light rounded-sm shadow-sm">
              <div className="text-center border-r border-border-light pr-6">
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Average</p>
                <p className="text-2xl font-serif font-bold text-charcoal">{avgRating}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Total</p>
                <p className="text-2xl font-serif font-bold text-charcoal">{reviews.length}건</p>
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="py-24 text-center bg-white border border-dashed border-border-light rounded-sm">
              <MessageCircle className="w-10 h-10 text-muted/30 mx-auto mb-4" />
              <p className="text-muted italic font-light">아직 작성된 리뷰가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {reviews.map((review) => (
                <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="bg-white p-10 border border-border-light rounded-sm shadow-sm space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-hanji-white rounded-full flex items-center justify-center text-muted border border-border-light"><User className="w-5 h-5" /></div>
                      <div>
                        <p className="text-sm font-bold text-charcoal">{review.user_name || '익명'}</p>
                        <p className="text-[10px] text-muted uppercase tracking-tighter">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                  </div>
                  
                  <div className="flex gap-6">
                    {review.image_url && (
                      <div className="relative w-24 h-24 rounded-sm overflow-hidden border border-border-light flex-shrink-0">
                        <Image src={review.image_url} alt="Review" fill className="object-cover" />
                      </div>
                    )}
                    <p className="text-sm text-charcoal/80 leading-relaxed font-light">{review.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Detail Content Area (Long Vertical Images) */}
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
                  <div className="relative w-full h-[1000px]">
                    <Image src={img} alt={`Detail ${idx}`} fill className="object-contain" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-32 text-center border-y border-border-light border-dashed">
                <p className="text-muted italic font-light font-serif text-xl">상세 설명 이미지를 준비 중입니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 5. Related Products */}
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
