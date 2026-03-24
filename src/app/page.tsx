import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Leaf, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // 실 운영 중인 클라이언트 경로 사용
import ProductCard from '@/components/ProductCard';
import { translations } from '@/lib/translations';

/**
 * [고도화된 메인 페이지 - 서버 컴포넌트]
 * 1. Supabase에서 직접 상품 데이터를 비동기로 페칭합니다.
 * 2. '한지 화이트' 테마와 모던한 레이아웃을 적용합니다.
 * 3. 반응형 그리드 시스템을 통해 다양한 기기에서 최적의 UI를 제공합니다.
 */
export default async function Home() {
  const t = translations.ko; // 기본 한국어 설정

  // 1. Supabase 'products' 테이블에서 데이터 조회 (서버 사이드)
  const { data: products, error } = await supabase
    .from('products')
    .select('*, reviews(rating)')
    .order('created_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error('Supabase fetch error:', error);
  }

  // 2. 평점 평균 계산 로직 (서버 사이드 가공)
  const enhancedProducts = products?.map((p: any) => {
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
    <main className="flex-1 bg-hanji-white min-h-screen">
      {/* 1. Hero Section: 압도적인 비주얼과 브랜드 철학 */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
          alt="자연의 결 메인 히어로" 
          fill 
          className="object-cover brightness-[0.85] scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-hanji-white" />
        
        <div className="relative z-10 text-center px-4 space-y-10 max-w-5xl">
          <div className="flex justify-center animate-bounce duration-[3000ms]">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-[11px] text-white uppercase tracking-[0.4em] font-medium">
              <Leaf className="w-3.5 h-3.5 text-deep-sage" /> Nature Texture
            </span>
          </div>
          <h1 className="font-serif text-6xl md:text-8xl text-white leading-[1.1] tracking-tighter drop-shadow-lg">
            자연이 빚고,<br/>시간이 완성한 결
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light tracking-wide max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            연천의 맑은 숨결을 그대로 담았습니다.<br/>
            인위적인 가공을 최소화한, 대지 본연의 결을 경험해 보세요.
          </p>
          <div className="pt-10">
            <Link href="/shop" className="group inline-flex items-center gap-4 px-12 py-5 bg-charcoal text-white rounded-sm hover:bg-deep-sage transition-all duration-700 font-serif text-xl shadow-2xl hover:scale-105">
              {t.home.exploreBtn} <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-500" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Featured Grid: Supabase 실시간 연동 상품 목록 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-40">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-deep-sage font-bold tracking-[0.3em] text-[10px] uppercase">
              <TrendingUp className="w-4 h-4" /> Selected Items
            </div>
            <h2 className="font-serif text-5xl md:text-6xl text-charcoal tracking-tight">이 계절의 추천 산물</h2>
            <p className="text-muted text-lg font-light max-w-xl leading-relaxed border-l-2 border-deep-sage/20 pl-6">
              지금 이 순간, 대지가 선사하는 가장 정직한 결실입니다.<br/>
              복이네 농장이 직접 검수하고 선별한 명품 산물을 만나보세요.
            </p>
          </div>
          <Link href="/shop" className="text-xs uppercase tracking-[0.3em] font-black border-b-2 border-charcoal/10 pb-3 hover:border-deep-sage hover:text-deep-sage transition-all duration-500">
            {t.home.viewAll}
          </Link>
        </div>

        {/* 반응형 그리드 시스템 (Tailwind CSS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-24">
          {enhancedProducts.length > 0 ? (
            enhancedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-48 text-center bg-white/40 border border-dashed border-border-light rounded-sm backdrop-blur-sm">
              <div className="mb-6 opacity-20"><Leaf className="w-16 h-16 mx-auto" /></div>
              <p className="text-muted italic font-light text-xl">대지의 결실을 준비 중입니다.</p>
              <p className="text-muted/60 text-sm mt-2 font-sans">관리자 페이지에서 첫 상품을 등록해 주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* 3. Brand Philosophy: 신뢰감을 주는 모던한 푸터 섹션 */}
      <section className="bg-charcoal text-hanji-white py-40 relative overflow-hidden">
        {/* Subtle Paper Texture Effect */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 text-center space-y-16 relative z-10">
          <div className="inline-block animate-pulse">
            <Sparkles className="w-12 h-12 mx-auto text-deep-sage/50" />
          </div>
          <h2 className="font-serif text-5xl md:text-7xl tracking-tighter leading-[1.2]">
            "우리는 자연의 질감을<br/>가장 투명하게 전달합니다"
          </h2>
          <div className="w-px h-20 bg-hanji-white/20 mx-auto" />
          <p className="text-xl md:text-2xl font-light text-hanji-white/70 leading-relaxed max-w-4xl mx-auto font-serif italic">
            {t.home.brandStoryDesc}
          </p>
          <div className="pt-10">
            <Link href="/about" className="group text-[11px] uppercase tracking-[0.4em] font-bold border-b border-white/20 pb-2 hover:border-deep-sage hover:text-deep-sage transition-all duration-500">
              Our Sincerity <ArrowRight className="inline-block w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
