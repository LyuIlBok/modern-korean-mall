import Image from 'next/image';
import Link from 'next/link';
import { products as mockProducts, Product } from '@/data/mockData';
import { notFound } from 'next/navigation';
import PurchaseButtons from './AddToCartButton';
import ProductTabs from './ProductTabs';
import ProductCard from '@/components/ProductCard';
import { ArrowLeft, Truck, ShieldCheck, Heart, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductDetailClient from './ProductDetailClient';

// This is now a Server Component
export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const productId = params.id;

  // 서버에서 데이터 직접 페칭 (SEO 최적화 및 로딩 속도 향상)
  const { data: product, error } = await supabase
    .from('products')
    .select('*, reviews(rating)')
    .eq('id', productId)
    .single();

  if (error || !product) {
    // DB에 없으면 Mock 데이터 확인
    const mockProduct = mockProducts.find(p => p.id === productId);
    if (!mockProduct) notFound();
    
    return <ProductDetailClient product={mockProduct} relatedProducts={mockProducts.slice(0, 4)} />;
  }

  // 관련 상품 페칭
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
