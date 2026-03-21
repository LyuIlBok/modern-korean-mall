import Image from 'next/image';
import { Leaf, Heart, Sun, Droplets } from 'lucide-react';

export const metadata = {
  title: '우리의 결 | 자연의 결',
};

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col bg-hanji-white">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=2000"
          alt="자연과 농지"
          fill
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-charcoal/20" />
        <div className="relative z-10 text-center px-4">
          <span className="text-xs uppercase tracking-[0.4em] text-white/80 mb-6 block">Our Philosophy</span>
          <h1 className="font-serif text-5xl md:text-7xl text-white mb-8 leading-tight tracking-tighter">
            자연이 쓰고<br/>농부가 옮기다
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            경기도 연천, 맑은 임진강 물줄기가 흐르는 땅에서<br/>
            자연의 결을 거스르지 않는 정직한 산물을 기릅니다.
          </p>
        </div>
      </section>

      {/* Narrative Content */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center mb-32">
          <div className="relative aspect-[3/4] rounded-sm overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&q=80&w=1000"
              alt="농부의 손"
              fill
              className="object-cover"
            />
          </div>
          <div className="space-y-8">
            <h2 className="font-serif text-4xl text-charcoal tracking-tight">01. 덜어냄의 미학</h2>
            <p className="text-lg text-charcoal/70 leading-relaxed font-light">
              우리는 화려한 포장과 인위적인 공정을 지양합니다. 
              산물이 가진 고유의 색과 결이 오롯이 돋보일 수 있도록, 
              가장 단순하면서도 품격 있는 방식을 택합니다. 
              비움으로써 비로소 채워지는 자연의 진정한 가치를 전합니다.
            </p>
            <div className="pt-4 flex gap-6 text-deep-sage opacity-60">
               <Leaf className="w-6 h-6" />
               <Heart className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center mb-32">
          <div className="order-2 md:order-1 space-y-8 text-right">
            <h2 className="font-serif text-4xl text-charcoal tracking-tight">02. 연천의 숨결</h2>
            <p className="text-lg text-charcoal/70 leading-relaxed font-light">
              비무장지대와 맞닿은 청정 연천의 바람과 햇살을 담았습니다. 
              요령 피우지 않고 정직하게 흙을 일구는 농부의 마음이 
              당신의 식탁 위에 그대로 닿기를 바라는 진심, 
              그것이 '자연의 결'이 약속하는 품질입니다.
            </p>
            <div className="pt-4 flex gap-6 justify-end text-deep-sage opacity-60">
               <Sun className="w-6 h-6" />
               <Droplets className="w-6 h-6" />
            </div>
          </div>
          <div className="order-1 md:order-2 relative aspect-[3/4] rounded-sm overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1592919016327-5162eddbad03?auto=format&fit=crop&q=80&w=1000"
              alt="수확한 채소"
              fill
              className="object-cover"
            />
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto py-24">
          <h2 className="font-serif text-4xl mb-10">결결이 깃든 우리의 약속</h2>
          <p className="text-lg text-charcoal/70 leading-relaxed font-light italic">
            "우리는 단순히 농산물을 파는 것이 아니라,<br/>
            자연과 사람이 함께 호흡하는 단아한 삶의 방식을 제안합니다."
          </p>
          <div className="mt-12 w-12 h-0.5 bg-deep-sage mx-auto opacity-30" />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="bg-charcoal text-hanji-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl mb-8">자연의 결을 당신의 일상에 품어보세요</h2>
          <Link 
            href="/shop" 
            className="inline-block border border-white/30 px-12 py-4 text-sm uppercase tracking-[0.3em] hover:bg-white hover:text-charcoal transition-all duration-500"
          >
            Explore Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
