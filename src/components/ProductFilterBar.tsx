'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, ChevronDown, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['전체', '농산물', '농자재'];
const sortOptions = [
  { label: '최신순', value: 'latest' },
  { label: '가격 낮은순', value: 'price_asc' },
  { label: '가격 높은순', value: 'price_desc' },
  { label: '평점 높은순', value: 'rating_desc' },
];

export default function ProductFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '전체');
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'latest');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // URL 업데이트 함수
  const updateParams = useCallback((newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== '전체' && value !== 'latest') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/shop?${params.toString()}`);
  }, [router, searchParams]);

  // 검색 실행 (엔터키 또는 버튼 클릭)
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateParams({ q: q.trim() || null });
  };

  // 필터 초기화
  const handleReset = () => {
    setQ('');
    setActiveCategory('전체');
    setActiveSort('latest');
    router.push('/shop');
  };

  return (
    <div className="space-y-8 mb-16">
      {/* 1. Search & Sort Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearch} className="relative flex-1 group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-deep-sage transition-colors" />
          <input 
            type="text" 
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="찾으시는 농산물이나 농자재를 검색해 보세요..."
            className="w-full bg-white border border-border-light pl-14 pr-24 py-4 rounded-sm text-sm focus:outline-none focus:border-deep-sage focus:ring-1 focus:ring-deep-sage/20 transition-all shadow-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {q && (
              <button type="button" onClick={() => { setQ(''); updateParams({ q: null }); }} className="p-2 text-muted hover:text-charcoal"><X className="w-4 h-4" /></button>
            )}
            <button type="submit" className="bg-charcoal text-white px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-deep-sage transition-all">Search</button>
          </div>
        </form>

        {/* Sort Dropdown */}
        <div className="relative w-full md:w-48">
          <button 
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full bg-white border border-border-light px-6 py-4 rounded-sm text-sm flex items-center justify-between hover:border-deep-sage transition-all shadow-sm"
          >
            <span className="font-medium text-charcoal">{sortOptions.find(o => o.value === activeSort)?.label}</span>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-border-light shadow-xl z-50 overflow-hidden"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setActiveSort(opt.value);
                        updateParams({ sort: opt.value });
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-6 py-3.5 text-xs hover:bg-hanji-white transition-colors ${activeSort === opt.value ? 'text-deep-sage font-bold bg-deep-sage/5' : 'text-muted'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Category & Reset Row */}
      <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-border-light/50">
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                updateParams({ category: cat });
              }}
              className={`px-8 py-2.5 rounded-full text-xs tracking-widest uppercase transition-all border ${
                activeCategory === cat 
                  ? 'bg-charcoal text-white border-charcoal shadow-lg font-bold' 
                  : 'bg-white text-muted border-border-light hover:border-deep-sage hover:text-deep-sage'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button 
          onClick={handleReset}
          className="flex items-center gap-2 text-[10px] text-muted hover:text-terracotta transition-colors uppercase tracking-[0.2em] font-bold"
        >
          <RotateCcw className="w-3 h-3" /> Reset Filters
        </button>
      </div>
    </div>
  );
}
