'use client';

import Image from 'next/image';
import Link from 'next/link';
import { products as mockProducts } from '@/data/mockData';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ProductCard, { ProductWithRating } from '@/components/ProductCard';
import { useLanguageStore } from '@/store/useLanguageStore';

export default function Home() {
  const { t } = useLanguageStore();
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, reviews(rating)')
          .limit(3)
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
          setFeaturedProducts(productsWithRatings);
        } else {
          setFeaturedProducts(mockProducts.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setFeaturedProducts(mockProducts.slice(0, 3));
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
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
          <h1 className="font-serif text-5xl md:text-7xl mb-8 text-charcoal leading-[1.2] tracking-tighter whitespace-pre-line">
            {t.home.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-charcoal/80 mb-12 max-w-xl mx-auto font-light leading-relaxed">
            {t.home.heroDesc}
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-3 bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all duration-500 tracking-widest text-sm uppercase"
          >
            {t.home.exploreBtn} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 text-charcoal">{t.home.featuredTitle}</h2>
            <p className="text-muted text-sm tracking-wide">{t.home.featuredDesc}</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-all border-b border-current pb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            {t.home.viewAll} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-20 min-h-[400px]">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
            </div>
          ) : (
            featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>
      
      {/* Brand Story Teaser */}
      <section className="bg-charcoal text-hanji-white py-32 mt-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[120%] bg-hanji-white blur-[120px] rounded-full rotate-12" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative w-24 h-24 opacity-80">
              <Image 
                src="/seal.png" 
                alt="복이네농장 인감" 
                fill 
                className="object-contain filter brightness-0 invert" 
              />
            </div>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl mb-8 tracking-tight">{t.home.brandStoryTitle}</h2>
          <p className="text-lg md:text-xl/relaxed opacity-80 mb-12 font-light leading-relaxed">
            {t.home.brandStoryDesc}
          </p>
          <Link href="/about" className="text-xs uppercase tracking-[0.3em] border-b border-white/30 pb-2 hover:text-deep-sage hover:border-deep-sage transition-all">
            {t.common.about}
          </Link>
        </div>
      </section>
    </>
  );
}
