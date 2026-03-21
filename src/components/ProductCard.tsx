'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, toggleCart } = useCartStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toggleCart(); // Option to open cart on add
  };

  return (
    <Link href={`/shop/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-border-light/20 rounded-sm mb-4">
        <Image 
          src={product.imageUrl} 
          alt={product.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-300" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-terracotta">{product.category}</span>
        <h3 className="font-serif text-lg text-charcoal">{product.name}</h3>
        <p className="text-muted text-sm line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-medium text-lg">{product.price.toLocaleString()}원</span>
          <button 
            onClick={handleAddToCart}
            className="text-sm border-b border-charcoal/30 pb-0.5 hover:text-terracotta hover:border-terracotta transition-colors"
          >
            장바구니 담기
          </button>
        </div>
      </div>
    </Link>
  );
}