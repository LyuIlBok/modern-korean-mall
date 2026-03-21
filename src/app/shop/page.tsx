'use client';

import { useState } from 'react';
import { products, Category } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category | '전체'>('전체');

  const filteredProducts = activeCategory === '전체' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const categories: (Category | '전체')[] = ['전체', '농산물', '농자재'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="font-serif text-4xl mb-4">만물상</h1>
          <p className="text-muted">자연의 결이 꼼꼼하게 선별한 농산물과 농자재를 만나보세요.</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-border-light pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 text-sm tracking-widest transition-all duration-300 relative ${
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
          <p className="text-muted italic">해당 카테고리의 상품이 곧 준비될 예정입니다.</p>
        </div>
      )}
    </div>
  );
}