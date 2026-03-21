import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const featuredProducts = products.slice(0, 3);

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1501262174620-2f1624c965e6?auto=format&fit=crop&q=80&w=2000"
            alt="한국의 자연"
            fill
            className="object-cover opacity-80"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-hanji-white/40 via-transparent to-hanji-white" />
        </div>
        
        <div className="relative z-10 text-center max-w-3xl px-4">
          <h1 className="font-serif text-5xl md:text-7xl mb-6 text-charcoal drop-shadow-sm">
            자연이 빚은<br />본연의 가치
          </h1>
          <p className="text-lg md:text-xl text-charcoal/80 mb-10 max-w-xl mx-auto">
            꾸밈없는 자연의 산물과 정직한 농자재를 제안합니다. 여백의 미가 깃든 단아한 삶을 경험해보세요.
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 bg-charcoal text-white px-8 py-4 rounded-sm hover:bg-deep-sage transition-colors duration-300"
          >
            상품 둘러보기 <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-3">정성을 담은 산물</h2>
            <p className="text-muted">이 계절, 가장 추천하는 제품들입니다.</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-colors border-b border-current pb-1 flex items-center gap-2">
            전체보기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      
      {/* Brand Story Teaser */}
      <section className="bg-deep-sage text-hanji-white py-24 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-6">여백과 채움의 미학</h2>
          <p className="text-lg/relaxed opacity-90 mb-8">
            우리는 자연에서 얻은 것을 그대로 전하는 것에 가치를 둡니다.<br/>
            필요 이상의 가공을 덜어내고, 본질에 집중하는 삶.<br/>
            그것이 '자연의 결'이 추구하는 모던 코리안 미니멀리즘입니다.
          </p>
        </div>
      </section>
    </>
  );
}