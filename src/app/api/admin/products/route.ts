import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin Products API]
 * - POST: 신규 상품 등록
 * - PATCH: 기존 상품 정보 수정
 */

interface ProductOptionInput {
  id?: string;
  option_name: string;
  additional_price?: number;
  stock?: number;
  [key: string]: unknown;
}

/**
 * product_options는 예전엔 ProductForm.tsx가 브라우저 supabase 클라이언트로 직접
 * 쓰고 있었는데, 그 테이블의 RLS 정책이 실제 관리자 판정 기준(profiles.is_admin /
 * CONFIG.ADMIN_EMAILS)과 맞지 않는 옛날 하드코딩된 이메일 allowlist라서, 지금
 * 슈퍼관리자 계정으로는 옵션 추가/삭제가 RLS에 막히고 있었습니다(상품 본문은
 * service role로 저장되는 이 라우트를 타서 정상 저장되니 더 헷갈리는 버그였음).
 * RLS 정책을 손대는 대신, 다른 관리자 액션들과 동일하게 이 라우트가 service role로
 * 옵션까지 같이 처리하도록 옮겼습니다 — verifyAdmin으로 이미 관리자 검증이 끝난
 * 요청이므로 RLS 우회가 안전합니다.
 */
async function syncProductOptions(
  productId: string,
  options: ProductOptionInput[] | undefined,
  deletedOptionIds: string[] | undefined
) {
  if (deletedOptionIds && deletedOptionIds.length > 0) {
    const { error } = await supabaseAdmin.from('product_options').delete().in('id', deletedOptionIds);
    if (error) throw error;
  }

  if (options && options.length > 0) {
    const optionsToUpsert = options.map((opt) => {
      const { id, ...rest } = opt;
      const finalId = !id || id === '' || id.startsWith('temp-') ? crypto.randomUUID() : id;
      return { ...rest, id: finalId, product_id: productId };
    });
    const { error } = await supabaseAdmin.from('product_options').upsert(optionsToUpsert, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { productData, options } = body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;

    await syncProductOptions(data.id, options, undefined);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Product POST Error]:', msg);
    return NextResponse.json({ error: '상품 등록에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { productId, productData, options, deletedOptionIds } = body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    await syncProductOptions(productId, options, deletedOptionIds);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Product PATCH Error]:', msg);
    return NextResponse.json({ error: '상품/옵션 수정에 실패했습니다.' }, { status: 500 });
  }
}
