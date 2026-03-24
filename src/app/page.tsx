import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Leaf, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '@/components/ProductCard';
import { translations } from '@/lib/translations';

// This is now a Server Component
export default async function Home() {
  const t = translations.ko; // Default to Korean for server rendering

  // 1. Supabase에서 실제 상품 데이터 가져오기 (서버 사이드)
  const { data: products, error } = await supabase
    .from('products')
    .select('*, reviews(rating)')
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error('Error fetching products:', error);
  }

  // 평점 계산 로직 (서버 사이드)
  const productsWithRatings = products?.map((p: any) => {
    const ratings = p.reviews?.map((r: any) => r.rating) || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
      : 0;
    return {
      ...p,
      avgRating,
      reviewCount: ratings.length
    };
  }) || [];

  return (
    <div className="flex-1 bg-hanji-white">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
          alt="자연의 결 히어로" 
          fill 
          className="object-cover brightness-[0.9]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-hanji-white" />
        <div className="relative z-10 text-center px-4 space-y-8 max-w-4xl">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] text-white uppercase tracking-[0.3em] font-medium">
              <Leaf className="w-3 h-3 text-deep-sage" /> Nature Texture
            </span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl text-white leading-tight tracking-tight drop-shadow-sm">
            자연이 빚고,<br/>시간이 완성한 결
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
            연천의 맑은 공기와 비옥한 토양이 키워낸 정직한 산물.<br/>
            인위적인 가공을 최소화한 자연 본연의 결을 경험하세요.
          </p>
          <div className="pt-8">
            <Link href="/shop" className="group inline-flex items-center gap-3 px-10 py-4 bg-charcoal text-white rounded-sm hover:bg-deep-sage transition-all duration-500 font-serif text-lg shadow-2xl">
              {t.home.exploreBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-deep-sage font-bold tracking-[0.2em] text-xs uppercase">
              <TrendingUp className="w-4 h-4" /> Recommended
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-charcoal">{t.home.featuredTitle}</h2>
            <p className="text-muted font-light max-w-md">{t.home.featuredDesc}</p>
          </div>
          <Link href="/shop" className="text-xs uppercase tracking-[0.2em] font-bold border-b border-charcoal/20 pb-2 hover:border-deep-sage hover:text-deep-sage transition-all">
            {t.home.viewAll}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
          {productsWithRatings.length > 0 ? (
            productsWithRatings.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-32 text-center border border-dashed border-border-light rounded-sm bg-white/50">
              <p className="text-muted italic font-light">등록된 상품이 없습니다. 관리자 페이지에서 첫 상품을 등록해 주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* Brand Ethos Section */}
      <section className="bg-charcoal text-hanji-white py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[120%] bg-hanji-white blur-[120px] rounded-full rotate-12" />
        </div>
        <div className="max-w-5xl mx-auto px-4 text-center space-y-12 relative z-10">
          <Sparkles className="w-10 h-10 mx-auto text-deep-sage/40" />
          <h2 className="font-serif text-4xl md:text-6xl tracking-tight leading-tight">"우리는 자연의 질감을<br/>가장 투명하게 전달합니다"</h2>
          <p className="text-lg md:text-xl font-light text-hanji-white/60 leading-relaxed max-w-3xl mx-auto">
            {t.home.brandStoryDesc}
          </p>
          <div className="pt-8">
            <Link href="/about" className="text-xs uppercase tracking-[0.3em] border-b border-white/30 pb-2 hover:text-deep-sage hover:border-deep-sage transition-all">
              Our Story
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
