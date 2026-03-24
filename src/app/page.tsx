import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Leaf, Sparkles, TrendingUp, ShieldCheck, Award } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '@/components/ProductCard';
import { translations } from '@/lib/translations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * [복이네농장 공식 메인 페이지]
 * - 모든 사용자에게 버튼이 항상 보이도록 수정됨
 */
export default async function Home() {
  const t = translations.ko;

  // 1. Supabase에서 모든 상품 데이터 불러오기
  const { data: products, error } = await supabase
    .from('products')
    .select('*, reviews(rating)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('데이터를 불러오는 중 오류가 발생했습니다:', error);
  }

  // 2. 상품 데이터 가공 (평점 평균 등)
  const displayProducts = products?.map((p: any) => {
    const ratings = p.reviews?.map((r: any) => r.rating) || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
      : 0;
    return { ...p, avgRating, reviewCount: ratings.length };
  }) || [];

  return (
    <main className="flex-1 bg-hanji-white min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
          alt="복이네농장 연천 농경지" 
          fill 
          className="object-cover brightness-[0.75] scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-hanji-white/80" />
        
        <div className="relative z-10 text-center px-4 space-y-8 max-w-5xl">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-deep-sage/20 backdrop-blur-xl border border-white/30 text-[12px] text-white uppercase tracking-[0.5em] font-bold">
              <Leaf className="w-4 h-4 text-deep-sage" /> Agricultural Corp. Boki
            </span>
          </div>
          <h1 className="font-serif text-6xl md:text-8xl text-white leading-[1.1] tracking-tighter drop-shadow-2xl">
            연천의 자연을 그대로,<br/>
            <span className="text-deep-sage-light">복이네농장</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light tracking-wide max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
            경기도 연천의 비옥한 토양과 맑은 물이 키워낸 정직한 결실.<br/>
            우리는 땅의 정직함을 믿으며, 자연 본연의 맛을 식탁까지 전합니다.
          </p>
          
          {/* [수정] 로그인 여부와 관계없이 무조건 렌더링되는 버튼 영역 */}
          <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/shop" className="group inline-flex items-center gap-4 px-12 py-5 bg-deep-sage text-white rounded-sm hover:bg-charcoal transition-all duration-700 font-serif text-xl shadow-2xl hover:scale-105">
              추천 농산물 보기 <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform duration-500" />
            </Link>
            <Link href="/about" className="px-12 py-5 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-sm hover:bg-white hover:text-charcoal transition-all duration-500 font-serif text-xl">
              브랜드 이야기
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-y border-border-light py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center justify-center gap-4 text-charcoal">
            <ShieldCheck className="w-10 h-10 text-deep-sage" />
            <div className="text-left">
              <p className="font-bold text-sm tracking-widest uppercase">Certified Origin</p>
              <p className="text-xs text-muted">100% 연천군 생산 보장</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-charcoal border-x border-border-light">
            <Award className="w-10 h-10 text-deep-sage" />
            <div className="text-left">
              <p className="font-bold text-sm tracking-widest uppercase">Premium Quality</p>
              <p className="text-xs text-muted">엄격한 선별 과정을 거친 특상품</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-charcoal">
            <TrendingUp className="w-10 h-10 text-deep-sage" />
            <div className="text-left">
              <p className="font-bold text-sm tracking-widest uppercase">Farm Direct</p>
              <p className="text-xs text-muted">농장 직송으로 가장 신선하게</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-3 text-deep-sage font-bold tracking-[0.3em] text-[10px] uppercase">
              <Sparkles className="w-4 h-4" /> Seasonal Best
            </div>
            <h2 className="font-serif text-5xl md:text-6xl text-charcoal tracking-tight underline underline-offset-[12px] decoration-deep-sage/20">추천 농산물</h2>
            <p className="text-muted text-lg font-light max-w-xl leading-relaxed">
              지금 이 계절, 연천의 대지가 선사하는 가장 정직한 선물입니다.<br/>
              복이네 농장이 자신 있게 추천하는 명품 산물을 만나보세요.
            </p>
          </div>
          <Link href="/shop" className="text-xs uppercase tracking-[0.3em] font-black border-b-2 border-charcoal/10 pb-3 hover:border-deep-sage hover:text-deep-sage transition-all duration-500">
            전체 상품 보기
          </Link>
        </div>

        {displayProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-24">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-48 text-center bg-white/40 border border-dashed border-border-light rounded-sm backdrop-blur-sm">
            <div className="mb-6 opacity-20"><Leaf className="w-20 h-20 mx-auto" /></div>
            <p className="text-muted italic font-light text-2xl">아직 등록된 상품이 없습니다.</p>
            <p className="text-muted/60 text-sm mt-4 font-sans italic">대지의 결실을 준비 중이오니 잠시만 기다려 주세요.</p>
          </div>
        )}
      </section>

      {/* Brand Ethos */}
      <section className="bg-charcoal text-hanji-white py-40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 text-center space-y-16 relative z-10">
          <h2 className="font-serif text-5xl md:text-7xl tracking-tighter leading-[1.2]">
            "우리는 땅의 정직함을<br/>식탁으로 배달합니다"
          </h2>
          <div className="w-px h-24 bg-hanji-white/20 mx-auto" />
          <p className="text-xl md:text-2xl font-light text-hanji-white/70 leading-relaxed max-w-4xl mx-auto font-serif italic">
            복이네농장은 단순한 판매를 넘어, 자연과 사람을 잇는 가교가 되고자 합니다.<br/>
            인위적인 가공을 최소화하고, 시간이 빚어낸 결을 그대로 보존하는 것.<br/>
            그것이 우리가 지키는 농부의 자부심입니다.
          </p>
          <div className="pt-10">
            <Link href="/about" className="group text-[12px] uppercase tracking-[0.5em] font-bold border-b border-white/20 pb-2 hover:border-deep-sage hover:text-deep-sage transition-all duration-500">
              Explore Our Values <ArrowRight className="inline-block w-4 h-4 ml-3 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
