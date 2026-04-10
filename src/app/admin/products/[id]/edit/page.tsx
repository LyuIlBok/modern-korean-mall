'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProductForm from '@/components/admin/ProductForm';
import { Loader2 } from 'lucide-react';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error || !data) {
        alert('상품을 찾을 수 없습니다.');
        router.push('/admin');
        return;
      }
      
      setProduct(data);
      setLoading(false);
    };

    fetchProduct();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hanji-white">
        <Loader2 className="w-10 h-10 animate-spin text-deep-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hanji-white p-12">
      <div className="max-w-7xl mx-auto">
        <ProductForm initialData={product} />
      </div>
    </div>
  );
}
