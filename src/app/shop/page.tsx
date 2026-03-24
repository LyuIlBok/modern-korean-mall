'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { products as mockProducts } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductCard, { ProductWithRating } from '@/components/ProductCard';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';

function ShopContent() {
  const { t, language } = useLanguageStore();
  const hasMounted = useHasMounted();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [products, setProducts] = useState<ProductWithRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, reviews(rating)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const productsWithRatings = data.map((p: any) => {
            const ratings = p.reviews?.map((r: any) => r.rating) || [];
            const avgRating = ratings.length > 0 
              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length 
              : 0;
            return {
              ...p,
              avgRating,
              reviewCount: ratings.length
            };
          });
          setProducts(productsWithRatings);
        } else {
          setProducts(mockProducts.map(p => ({ ...p, avgRating: 0, reviewCount: 0 })));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts(mockProducts.map(p => ({ ...p, avgRating: 0, reviewCount: 0 })));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 검색어와 카테고리에 따른 필터링
  const filteredProducts = products.filter(p => {
    const catMatch = activeCategory === 'all' || 
                    (activeCategory === 'produce' && p.category === '농산물') ||
                    (activeCategory === 'materials' && p.category === '농자재');
    const queryMatch = !query || 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.description.toLowerCase().includes(query.toLowerCase());
    return catMatch && queryMatch;
  });

  const categories = [
    { id: 'all', label: t?.shop?.all || 'All' },
    { id: 'produce', label: t?.shop?.category1 || 'Produce' },
    { id: 'materials', label: t?.shop?.category2 || 'Materials' },
  ];

  if (loading || !hasMounted) {
    return (
      <div className="flex-1 flex items-center justify-center py-32 bg-hanji-white min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1 bg-hanji-white">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="font-serif text-4xl mb-4 text-charcoal">{t?.shop?.title || 'Shop'}</h1>
          {query ? (
            <div className="flex items-center gap-2 text-deep-sage">
              <Search className="w-4 h-4" />
              <span className="text-lg">"{query}" {language === 'ko' ? '검색 결과' : 'Search Results'}</span>
              <button 
                onClick={() => window.history.pushState(null, '', '/shop')}
                className="ml-2 p-1 hover:bg-deep-sage/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-muted">{t?.shop?.desc || ''}</p>
          )}
        </div>

        <div className="flex gap-2 border-b border-border-light pb-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 text-sm tracking-widest transition-all duration-300 relative whitespace-nowrap ${
                activeCategory === cat.id 
                  ? 'text-deep-sage font-medium' 
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              {cat.label}
              {activeCategory === cat.id && (
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
          <p className="text-muted italic">{t?.shop?.noResult || 'No results found.'}</p>
          {query && (
            <button 
              onClick={() => window.location.href = '/shop'}
              className="mt-6 text-sm text-deep-sage border-b border-deep-sage pb-1"
            >
              {t?.home?.viewAll || 'View All'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center py-32 bg-hanji-white min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-deep-sage" /></div>}>
      <ShopContent />
    </Suspense>
  );
}
