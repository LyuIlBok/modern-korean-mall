import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { products as mockProducts } from '@/data/mockData';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://modern-korean-mall.vercel.app';
  const canonicalUrl = `${siteUrl}/shop/${params.id}`;

  const { data: product } = await supabase.from('products').select('*').eq('id', params.id).single();

  if (!product) {
    const mock = mockProducts.find(p => p.id === params.id);
    if (!mock) return { title: '상품을 찾을 수 없습니다' };
    
    return {
      title: mock.name,
      description: mock.description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `${mock.name} | 자연의 결`,
        description: `${mock.price.toLocaleString()}원 - ${mock.description.substring(0, 160)}`,
        images: [{ url: mock.imageUrl }],
        url: canonicalUrl,
        type: 'website',
      }
    };
  }

  const plainDescription = product.description.replace(/<[^>]*>?/gm, '').substring(0, 160);

  return {
    title: product.name,
    description: plainDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${product.name} | 자연의 결`,
      description: `${product.price.toLocaleString()}원 - ${plainDescription}`,
      images: [{ url: product.imageUrl }],
      url: canonicalUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: plainDescription,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const productId = params.id;

  // Supabase에서 상품 정보 가져오기 (images, detail_content_images, specs 포함)
  const { data: product, error } = await supabase
    .from('products')
    .select('*, reviews(rating)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    // DB에 없으면 Mock 데이터에서 확인 (테스트용)
    const mockProduct = mockProducts.find(p => p.id === productId);
    if (!mockProduct) return notFound();
    
    return <ProductDetailClient product={mockProduct} relatedProducts={mockProducts.slice(0, 4)} />;
  }

  // 관련 상품 가져오기
  const { data: relatedProducts } = await supabase
    .from('products')
    .select('*')
    .eq('category', product.category)
    .neq('id', product.id)
    .limit(4);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://modern-korean-mall.vercel.app';
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: [product.imageUrl],
    description: product.description.replace(/<[^>]*>?/gm, '').substring(0, 160),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: '자연의 결'
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/shop/${product.id}`,
      priceCurrency: 'KRW',
      price: product.price,
      availability: product.is_sold_out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient 
        product={product} 
        relatedProducts={relatedProducts || []} 
      />
    </>
  );
}
