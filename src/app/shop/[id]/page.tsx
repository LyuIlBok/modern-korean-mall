import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/mockData';
import { notFound } from 'next/navigation';
import PurchaseButtons from './AddToCartButton';
import { ArrowLeft, Truck, ShieldCheck, Heart } from 'lucide-react';

export async function generateStaticParams() {
  return products.map((product) => ({
    id: product.id,
  }));
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = products.find(p => p.id === resolvedParams.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 목록으로 돌아가기
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 mb-24">
        {/* Product Image */}
        <div className="relative aspect-[4/5] bg-border-light/20 rounded-sm overflow-hidden group">
          <Image 
            src={product.imageUrl} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <button className="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm">
            <Heart className="w-5 h-5 text-terracotta" />
          </button>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <span className="text-sm font-medium text-terracotta tracking-wider mb-2 block uppercase">{product.category}</span>
            <h1 className="font-serif text-4xl md:text-5xl mb-4 leading-tight">{product.name}</h1>
            <p className="text-2xl font-serif text-charcoal">{product.price.toLocaleString()}원</p>
          </div>
          
          {/* Trust Indicators (Shipping, Benefit) - Naver Style */}
          <div className="bg-hanji-white border border-border-light p-5 rounded-sm space-y-4 mb-10 text-sm">
            <div className="flex gap-4">
              <Truck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">오늘 주문 시, 내일(3/22) 도착 보장 (배송비 무료)</p>
                <p className="text-muted text-xs mt-1">지역에 따라 상이할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex gap-4 border-t border-border-light pt-4">
              <ShieldCheck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">네이버 포인트 최대 1,200원 적립 (회원가입 시)</p>
              </div>
            </div>
          </div>

          <div className="prose prose-stone mb-12">
            <p className="text-charcoal/80 leading-relaxed text-lg whitespace-pre-line">{product.description}</p>
          </div>

          <PurchaseButtons product={product} />
        </div>
      </div>

      {/* Tabs / Extra Info - Coupang/Naver Style */}
      <div className="border-t border-border-light pt-16">
        <div className="flex gap-8 border-b border-border-light mb-12">
          <button className="pb-4 border-b-2 border-charcoal font-serif text-xl px-2">상세 정보</button>
          <button className="pb-4 text-muted font-serif text-xl px-2 hover:text-charcoal transition-colors">리뷰 (12)</button>
          <button className="pb-4 text-muted font-serif text-xl px-2 hover:text-charcoal transition-colors">Q&A (3)</button>
        </div>
        
        <div className="max-w-3xl mx-auto space-y-12">
           <div className="relative aspect-[16/9] w-full mb-8">
             <Image src={product.imageUrl} alt="상세1" fill className="object-cover rounded-sm" />
           </div>
           <p className="text-lg text-center font-light leading-relaxed">
             자연의 결은 가장 자연스러운 방식을 지향합니다. <br/>
             우리가 직접 먹고 쓰는 것과 동일한 기준으로 선별했습니다.
           </p>
        </div>
      </div>
    </div>
  );
}