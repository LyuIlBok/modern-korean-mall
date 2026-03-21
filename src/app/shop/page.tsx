'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { products as mockProducts, Category, Product } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function ShopContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [activeCategory, setActiveCategory] = useState<Category | '전체'>('전체');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setProducts(data);
        } else {
          // Supabase에 데이터가 없으면 mock 데이터 사용
          setProducts(mockProducts);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 검색어와 카테고리에 따른 필터링
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === '전체' || p.category === activeCategory;
    const matchesQuery = !query || 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.description.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const categories: (Category | '전체')[] = ['전체', '농산물', '농자재'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="font-serif text-4xl mb-4">만물상</h1>
          {query ? (
            <div className="flex items-center gap-2 text-deep-sage">
              <Search className="w-4 h-4" />
              <span className="text-lg">"{query}"에 대한 검색 결과</span>
              <button 
                onClick={() => window.history.pushState(null, '', '/shop')}
                className="ml-2 p-1 hover:bg-deep-sage/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-muted">자연의 결이 꼼꼼하게 선별한 농산물과 농자재를 만나보세요.</p>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-border-light pb-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 text-sm tracking-widest transition-all duration-300 relative whitespace-nowrap ${
                activeCategory === cat 
                  ? 'text-deep-sage font-medium' 
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              {cat}
              {activeCategory === cat && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-deep-sage"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12"
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts.map(product => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredProducts.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-muted italic">
            {query ? `"${query}"에 대한 검색 결과가 없습니다.` : '해당 카테고리의 상품이 곧 준비될 예정입니다.'}
          </p>
          {query && (
            <button 
              onClick={() => window.location.href = '/shop'}
              className="mt-6 text-sm text-deep-sage border-b border-deep-sage pb-1"
            >
              전체 상품 보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-24 text-center">불러오는 중...</div>}>
      <ShopContent />
    </Suspense>
  );
}