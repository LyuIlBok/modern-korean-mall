import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import { products as mockProducts } from '@/data/mockData';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const { data: product } = await supabase.from('products').select('*').eq('id', params.id).single();

  if (!product) {
    const mock = mockProducts.find(p => p.id === params.id);
    if (!mock) return { title: '상품을 찾을 수 없습니다' };
    return {
      title: mock.name,
      description: mock.description,
      openGraph: {
        title: `${mock.name} | 자연의 결`,
        description: `${mock.price.toLocaleString()}원 - ${mock.description}`,
        images: [{ url: mock.imageUrl }],
      }
    };
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} | 자연의 결`,
      description: `${product.price.toLocaleString()}원 - ${product.description}`,
      images: [{ url: product.imageUrl }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
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

  return (
    <ProductDetailClient 
      product={product} 
      relatedProducts={relatedProducts || []} 
    />
  );
}
