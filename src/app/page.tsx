'use client';

import Image from 'next/image';
import Link from 'next/link';
import { products as mockProducts, Product } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .limit(3)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setFeaturedProducts(data);
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
          <h1 className="font-serif text-5xl md:text-7xl mb-8 text-charcoal leading-[1.2] tracking-tighter">
            결결이 살아있는<br />자연의 진심
          </h1>
          <p className="text-lg md:text-xl text-charcoal/80 mb-12 max-w-xl mx-auto font-light leading-relaxed">
            과한 것은 덜어내고 본질만을 남긴 정직한 산물을 제안합니다.<br/>
            당신의 일상에 단아한 자연의 결이 깃들기를 바랍니다.
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-3 bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all duration-500 tracking-widest text-sm uppercase"
          >
            만물상 탐색하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 text-charcoal">정성을 담은 산물</h2>
            <p className="text-muted text-sm tracking-wide">이 계절, 자연의 결이 선별한 가장 귀한 제품들입니다.</p>
          </div>
          <Link href="/shop" className="text-deep-sage hover:text-terracotta transition-all border-b border-current pb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            View All <ArrowRight className="w-3.5 h-3.5" />
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
          <h2 className="font-serif text-3xl md:text-5xl mb-8 tracking-tight">비움으로써 채워지는 미학</h2>
          <p className="text-lg md:text-xl/relaxed opacity-80 mb-12 font-light">
            우리는 자연에서 얻은 것을 그대로 전하는 것에 가치를 둡니다.<br/>
            필요 이상의 가공을 덜어내고, 본질에 집중하는 단아한 삶.<br/>
            그것이 '자연의 결'이 추구하는 모던 코리안 미니멀리즘입니다.
          </p>
          <Link href="/about" className="text-xs uppercase tracking-[0.3em] border-b border-white/30 pb-2 hover:text-deep-sage hover:border-deep-sage transition-all">
            Our Story
          </Link>
        </div>
      </section>
    </>
  );
}
