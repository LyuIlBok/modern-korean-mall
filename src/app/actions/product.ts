'use server';

import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

/**
 * 현재 로그인한 사용자가 관리자인지 서버에서 직접 검증합니다.
 * (products 테이블 RLS가 서비스 롤 전용 쓰기로 좁혀졌기 때문에,
 *  일반 삭제/수정 액션은 이 검증을 통과한 뒤 supabaseAdmin으로 수행해야 합니다.)
 */
async function requireAdmin() {
  const supabaseSSR = await createClient();
  const { data: { user } } = await supabaseSSR.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: profile } = await supabaseSSR
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) throw new Error('관리자 권한이 없습니다.');
}

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
  // 관리자만 상품을 삭제할 수 있습니다.
  await requireAdmin();

  // 1. Storage에서 이미지 삭제
  if (product.imageUrl && product.imageUrl.includes('product-images')) {
    const urlParts = product.imageUrl.split('product-images/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabaseAdmin.storage.from('product-images').remove([filePath]);
    }
  }

  // 2. Database에서 삭제 (관리자 검증 완료 후 서비스 롤로 수행)
  const { error } = await supabaseAdmin.from('products').delete().eq('id', product.id);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/shop');
}
