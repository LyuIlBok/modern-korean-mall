import Image from 'next/image';
import Link from 'next/link';
import { products } from '@/data/mockData';
import { notFound } from 'next/navigation';
import AddToCartButton from './AddToCartButton';
import { ArrowLeft } from 'lucide-react';

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
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        {/* Product Image */}
        <div className="relative aspect-[4/5] bg-border-light/20 rounded-sm overflow-hidden">
          <Image 
            src={product.imageUrl} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-center">
          <span className="text-sm font-medium text-terracotta mb-2">{product.category}</span>
          <h1 className="font-serif text-4xl md:text-5xl mb-6">{product.name}</h1>
          <p className="text-xl md:text-2xl font-medium mb-8">{product.price.toLocaleString()}원</p>
          
          <div className="prose prose-stone mb-12 border-t border-border-light pt-8">
            <p className="text-charcoal/80 leading-relaxed text-lg">{product.description}</p>
          </div>

          <AddToCartButton product={product} />

          <div className="mt-12 text-sm text-muted space-y-2">
            <p>배송 안내: 영업일 기준 2~3일 내 발송됩니다.</p>
            <p>교환/반품: 상품 수령 후 7일 이내 가능합니다. (신선식품 제외)</p>
          </div>
        </div>
      </div>
    </div>
  );
}