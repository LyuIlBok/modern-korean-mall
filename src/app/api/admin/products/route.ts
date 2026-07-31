import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin Products API]
 * - POST: 신규 상품 등록
 * - PATCH: 기존 상품 정보 수정
 */

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { productData } = body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;

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
    const { productId, productData } = body;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(productData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Product PATCH Error]:', msg);
    return NextResponse.json({ error: '상품 수정에 실패했습니다.' }, { status: 500 });
  }
}
