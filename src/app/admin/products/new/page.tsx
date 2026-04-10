'use client';

import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="min-h-screen bg-hanji-white p-12">
      <div className="max-w-7xl mx-auto">
        <ProductForm />
      </div>
    </div>
  );
}
