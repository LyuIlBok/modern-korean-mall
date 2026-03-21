import Image from 'next/image';

export const metadata = {
  title: '브랜드 철학 | 자연의 결',
};

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-charcoal">
        <Image 
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=2000"
          alt="자연과 농지"
          fill
          className="object-cover opacity-50"
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="font-serif text-4xl md:text-6xl text-hanji-white mb-6">자연의 결, 우리의 진심</h1>
          <p className="text-hanji-white/80 text-lg md:text-xl max-w-2xl mx-auto font-light">
            불필요한 것을 덜어내고, 본질에 집중하는 한국적 미학을 농산물에 담았습니다.
          </p>
        </div>
      </section>

      {/* Philosophy Content */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="space-y-20">
          <div className="text-center md:text-left">
            <h2 className="font-serif text-3xl mb-8 border-b border-border-light pb-4 inline-block">01. 여백의 미</h2>
            <p className="text-lg/relaxed text-charcoal/80">
              우리는 화려한 포장과 불필요한 가공을 지양합니다. 농산물이 가진 고유의 색과 결이 돋보일 수 있도록, 
              가장 단순하면서도 품격 있는 방식을 택합니다. 비움으로써 채워지는 자연의 가치를 전합니다.
            </p>
          </div>

          <div className="text-center md:text-right">
            <h2 className="font-serif text-3xl mb-8 border-b border-border-light pb-4 inline-block">02. 정직한 땀방울</h2>
            <p className="text-lg/relaxed text-charcoal/80">
              경기도 연천의 맑은 공기와 건강한 흙에서 자란 산물만을 엄선합니다. 
              요령 피우지 않고 정직하게 기른 농부의 마음이 소비자에게 그대로 닿기를 바라는 진심을 담았습니다.
            </p>
          </div>

          <div className="text-center md:text-left">
            <h2 className="font-serif text-3xl mb-8 border-b border-border-light pb-4 inline-block">03. 상생의 가치</h2>
            <p className="text-lg/relaxed text-charcoal/80">
              농부는 좋은 결실을 맺고, 소비자는 건강한 생명을 얻는 선순환을 꿈꿉니다. 
              자연과 사람, 도시와 농촌이 함께 어우러지는 모던 코리안 라이프스타일을 제안합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Image Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 h-[400px]">
        <div className="relative h-full">
          <Image 
            src="https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&q=80&w=1000"
            alt="농부의 손"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative h-full">
          <Image 
            src="https://images.unsplash.com/photo-1592919016327-5162eddbad03?auto=format&fit=crop&q=80&w=1000"
            alt="수확한 채소"
            fill
            className="object-cover"
          />
        </div>
      </section>
    </div>
  );
}