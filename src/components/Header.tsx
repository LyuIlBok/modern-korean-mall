'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

export default function Header() {
  const { toggleCart, items } = useCartStore();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-hanji-white/90 backdrop-blur-md border-b border-border-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl tracking-tighter text-deep-sage">
          자연의 결
        </Link>
        <nav className="hidden md:flex gap-8">
          <Link href="/shop" className="text-charcoal/80 hover:text-terracotta transition-colors">
            상품보기
          </Link>
          <Link href="#" className="text-charcoal/80 hover:text-terracotta transition-colors">
            브랜드 철학
          </Link>
        </nav>
        <button 
          onClick={toggleCart}
          className="relative p-2 text-charcoal/80 hover:text-terracotta transition-colors"
          aria-label="장바구니 열기"
        >
          <ShoppingBag className="w-6 h-6" />
          {itemCount > 0 && (
            <span className="absolute top-0 right-0 bg-terracotta text-white text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}