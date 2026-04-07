import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '@/components/ProductCard';
import ProductFilterBar from '@/components/ProductFilterBar';
import { SearchX, ArrowRight, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import { Category } from '@/data/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Review {
  rating: number;
}

interface ProductWithReviews {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: Category;
  stock: number;
  shipping_fee: number;
  is_sold_out: boolean;
  created_at: string;
  reviews?: Review[];
  avgRating?: number;
  reviewCount?: number;
}

async function ProductList({ 
  searchParams 
}: { 
  searchParams: { q?: string; category?: string; sort?: string } 
}) {
  const q = searchParams.q || '';
  const category = searchParams.category || '전체';
  const sort = searchParams.sort || 'latest';

  // 1. Supabase Query Build
  let query = supabase
    .from('products')
    .select('*, reviews(rating)');

  // 2. Filters
  if (category !== '전체') {
    query = query.eq('category', category);
  }

  if (q) {
    // 상품명 또는 설명에서 부분 일치 검색
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  // 3. Sorting (기본 정렬)
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('Fetch error:', error.message);
  }

  // 4. 데이터 가공 (평점 평균 등)
  const displayProducts = (products as ProductWithReviews[] | null)?.map((p) => {
    const ratings = p.reviews?.map((r) => r.rating) || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
      : 0;
    return { ...p, avgRating, reviewCount: ratings.length };
  }) || [];

  // 5. 평점순 정렬 (메모리 정렬)
  if (sort === 'rating_desc') {
    displayProducts.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  }

  if (displayProducts.length === 0) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-center space-y-8 bg-white border border-border-light rounded-sm shadow-sm">
        <div className="w-24 h-24 bg-hanji-white rounded-full flex items-center justify-center text-muted/30">
          <SearchX className="w-12 h-12" />
        </div>
        <div className="space-y-3">
          <h3 className="font-serif text-3xl text-charcoal">찾으시는 상품이 없습니다</h3>
          <p className="text-muted font-light">검색어나 필터 조건을 변경하여 다시 시도해 보세요.</p>
        </div>
        <Link 
          href="/shop" 
          className="group inline-flex items-center gap-3 px-10 py-4 bg-charcoal text-white rounded-sm hover:bg-deep-sage transition-all shadow-xl uppercase text-xs font-bold tracking-widest"
        >
          전체 상품 보기 <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
      {displayProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default async function ShopPage(props: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="bg-hanji-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <header className="mb-20 space-y-6">
          <div className="flex items-center gap-4 text-deep-sage mb-2">
            <div className="w-12 h-px bg-current"></div>
            <span className="text-[10px] uppercase tracking-[0.5em] font-bold">Nature&apos;s Essence Market</span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-charcoal tracking-tight">만물상</h1>
          <p className="text-muted font-light text-lg max-w-2xl leading-relaxed">
            자연의 결이 엄선한 연천의 정직한 농산물과<br/>
            농사를 짓는 데 필요한 소중한 자재들을 한데 모았습니다.
          </p>
        </header>

        <Suspense fallback={<div className="h-20 bg-white/50 animate-pulse rounded-sm mb-16" />}>
          <ProductFilterBar />
        </Suspense>

        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-10 h-10 animate-spin text-deep-sage mb-4" />
            <p className="text-[10px] uppercase tracking-widest text-muted">농산물을 불러오는 중입니다...</p>
          </div>
        }>
          <ProductList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
