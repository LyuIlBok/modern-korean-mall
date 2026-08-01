import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Heart, Sun, Droplets } from 'lucide-react';

export const metadata = {
  title: '우리의 결 | 자연의 결',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// 프레임워크 호환성을 위해 대문자로 시작하는 컴포넌트 정의
const MotionDivMinimal = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

export default function AboutPage() {
  return (
    <div className="bg-hanji-white min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
          alt="Boki Farm Nature" 
          fill 
          className="object-cover brightness-75 scale-105"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-center px-4 space-y-6">
          <MotionDivMinimal>
            <span className="text-white/80 text-sm font-bold tracking-[0.5em] uppercase mb-4 block">Our Heritage</span>
            <h1 className="font-serif text-5xl md:text-7xl text-white leading-tight mb-8">땅의 정직함을<br/>식탁으로 전합니다</h1>
            <div className="w-24 h-1 bg-white/30 mx-auto" />
          </MotionDivMinimal>
        </div>
      </section>

      {/* Story Section */}
      <section className="max-w-5xl mx-auto px-4 py-32 space-y-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-block p-3 rounded-full bg-deep-sage/5 mb-4">
              <Leaf className="w-8 h-8 text-deep-sage" />
            </div>
            <h2 className="font-serif text-4xl text-charcoal leading-snug">자연이 빚어낸 결을<br/>그대로 담다</h2>
            <p className="text-muted leading-relaxed font-normal text-lg">
              &apos;자연의 결&apos;은 경기도 연천의 비옥한 토양 위에서 시작되었습니다. 
              우리는 인위적인 기술보다 기다림의 미학을 믿습니다. 
              계절의 흐름에 따라 대지가 빚어낸 본연의 맛과 향을 보존하기 위해 
              오늘도 농부의 정직한 손길을 더합니다.
            </p>
          </div>
          <div className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-2xl">
            <Image src="https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&q=80&w=1000" alt="Farm story" fill className="object-cover" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-2xl order-2 md:order-1">
            <Image src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=1000" alt="Farmer hands" fill className="object-cover" />
          </div>
          <div className="space-y-8 order-1 md:order-2">
            <div className="inline-block p-3 rounded-full bg-terracotta/5 mb-4">
              <Heart className="w-8 h-8 text-terracotta" />
            </div>
            <h2 className="font-serif text-4xl text-charcoal leading-snug">사람과 자연을 잇는<br/>정직한 가교</h2>
            <p className="text-muted leading-relaxed font-normal text-lg">
              농부와 소비자가 서로의 이름을 기억하는 곳. 
              우리는 단순한 거래를 넘어 신뢰를 배달합니다. 
              복이네농장이 지켜온 수십 년의 노하우는 
              더 건강하고 안전한 먹거리를 향한 약속입니다.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-charcoal text-hanji-white py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl mb-24 tracking-tight">자연의 결이 지키는 네 가지 원칙</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                <Sun className="w-8 h-8 text-deep-sage-light" />
              </div>
              <h4 className="font-serif text-xl">기다림의 철학</h4>
              <p className="text-white/50 text-sm font-normal leading-relaxed">자연의 속도에 맞춰 가장 완벽하게 익었을 때 수확합니다.</p>
            </div>
            <div className="space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                <Droplets className="w-8 h-8 text-deep-sage-light" />
              </div>
              <h4 className="font-serif text-xl">맑은 생명력</h4>
              <p className="text-white/50 text-sm font-normal leading-relaxed">연천의 맑은 물과 공기가 키워낸 깨끗한 산물만을 고집합니다.</p>
            </div>
            <div className="space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                <Leaf className="w-8 h-8 text-deep-sage-light" />
              </div>
              <h4 className="font-serif text-xl">순수한 결</h4>
              <p className="text-white/50 text-sm font-normal leading-relaxed">인위적인 가공을 배제하고 원물 본연의 가치를 지켜냅니다.</p>
            </div>
            <div className="space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                <Heart className="w-8 h-8 text-deep-sage-light" />
              </div>
              <h4 className="font-serif text-xl">상생의 가치</h4>
              <p className="text-white/50 text-sm font-normal leading-relaxed">지역 사회와 함께 성장하며 지속 가능한 농업을 실천합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="bg-charcoal py-40 text-center relative overflow-hidden border-t border-white/5">
        <div className="relative z-10 space-y-12">
          <h2 className="font-serif text-5xl md:text-7xl text-white opacity-90 tracking-tighter italic">&quot;Experience the Texture of Nature&quot;</h2>
          <Link 
            href="/shop" 
            className="inline-block border border-white/30 px-12 py-4 text-sm uppercase tracking-[0.3em] text-white hover:bg-white hover:text-charcoal transition-all duration-500"
          >
            Explore Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
