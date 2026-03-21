import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/mockData';
import { notFound } from 'next/navigation';
import PurchaseButtons from './AddToCartButton';
import ProductTabs from './ProductTabs';
import ProductCard from '@/components/ProductCard';
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

  // 연관 상품 (같은 카테고리에서 현재 상품 제외하고 최대 4개)
  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

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
          
          {/* Trust Indicators */}
          <div className="bg-hanji-white border border-border-light p-5 rounded-sm space-y-4 mb-10 text-sm">
            <div className="flex gap-4">
              <Truck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">오늘 주문 시, 내일 도착 보장 (배송비 무료)</p>
                <p className="text-muted text-xs mt-1">5만원 이상 구매 시 전 지역 무료 배송입니다.</p>
              </div>
            </div>
            <div className="flex gap-4 border-t border-border-light pt-4">
              <ShieldCheck className="w-5 h-5 text-deep-sage flex-shrink-0" />
              <div>
                <p className="font-medium text-charcoal">회원가입 시 첫 구매 5% 할인 혜택</p>
              </div>
            </div>
          </div>

          <div className="prose prose-stone mb-12">
            <p className="text-charcoal/80 leading-relaxed text-lg whitespace-pre-line">{product.description}</p>
          </div>

          <PurchaseButtons product={product} />
        </div>
      </div>

      {/* Tabs / Extra Info */}
      <ProductTabs product={product} />

      {/* Related Products Section */}
      <div className="mt-32 pt-24 border-t border-border-light">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-3 text-charcoal">함께하면 좋은 산물</h2>
            <p className="text-muted text-sm">자연의 결이 추천하는 어우러짐이 좋은 상품들입니다.</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-all border-b border-current pb-1 text-xs uppercase tracking-widest">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {relatedProducts.length > 0 ? (
            relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))
          ) : (
            products.slice(0, 4).filter(p => p.id !== product.id).map(p => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
