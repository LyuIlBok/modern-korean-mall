import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin Coupons API]
 * - GET: 쿠폰 목록 (발급/사용 건수 포함)
 * - POST: 신규 쿠폰 생성
 * - DELETE: 쿠폰 삭제 (?id=...)
 */

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select('*, user_coupons(id, is_used)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withStats = (coupons || []).map((c) => ({
      ...c,
      issued_count: c.user_coupons?.length || 0,
      used_count: c.user_coupons?.filter((uc: { is_used: boolean }) => uc.is_used).length || 0,
      user_coupons: undefined,
    }));

    return NextResponse.json({ success: true, data: withStats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Coupons GET Error]:', msg);
    return NextResponse.json({ error: '쿠폰 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { couponData } = body;

    if (!couponData?.code || !couponData?.discount_amount) {
      return NextResponse.json({ error: '쿠폰 코드와 할인 금액은 필수입니다.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert([{
        code: String(couponData.code).trim().toUpperCase(),
        discount_type: couponData.discount_type || 'fixed',
        discount_amount: couponData.discount_amount,
        min_order_amount: couponData.min_order_amount || 0,
        valid_until: couponData.valid_until || null,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Coupons POST Error]:', msg);
    const isDuplicate = msg.includes('duplicate') || msg.includes('unique');
    return NextResponse.json(
      { error: isDuplicate ? '이미 존재하는 쿠폰 코드입니다.' : '쿠폰 생성에 실패했습니다.' },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '쿠폰 ID가 필요합니다.' }, { status: 400 });

    const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Coupons DELETE Error]:', msg);
    return NextResponse.json({ error: '쿠폰 삭제에 실패했습니다.' }, { status: 500 });
  }
}
