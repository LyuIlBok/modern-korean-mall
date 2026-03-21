import { products } from '@/data/mockData';
import ProductCard from '@/components/ProductCard';

export const metadata = {
  title: '상품보기 | 자연의 결',
};

export default function ShopPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <div className="mb-12">
        <h1 className="font-serif text-4xl mb-4">전체 상품</h1>
        <p className="text-muted">자연의 결이 꼼꼼하게 선별한 농산물과 농자재를 만나보세요.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}