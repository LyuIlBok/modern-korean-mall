'use server';

import { supabase } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';

interface ReviewFormData {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  photoUrl?: string | null;
}

interface ProductToDelete {
  id: string;
  imageUrl?: string;
}

export async function addReview(formData: ReviewFormData) {
  const { error } = await supabase.from('reviews').insert([{
    product_id: formData.productId,
    user_id: formData.userId,
    user_name: formData.userName,
    rating: formData.rating,
    content: formData.content,
    photo_url: formData.photoUrl,
    is_verified: true
  }]);

  if (error) throw new Error(error.message);

  // 해당 상품 페이지의 캐시를 갱신하여 즉시 반영
  revalidatePath(`/shop/${formData.productId}`);
}

export async function deleteProductAndImage(product: ProductToDelete) {
  // 1. Storage에서 이미지 삭제
  if (product.imageUrl && product.imageUrl.includes('product-images')) {
    const urlParts = product.imageUrl.split('product-images/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from('product-images').remove([filePath]);
    }
  }

  // 2. Database에서 삭제
  const { error } = await supabase.from('products').delete().eq('id', product.id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/shop');
}
