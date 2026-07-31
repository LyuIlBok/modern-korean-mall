import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { code, amount } = await request.json();

    if (!code) {
      return NextResponse.json({ error: '쿠폰 코드를 입력해 주세요.' }, { status: 400 });
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json({ error: '유효하지 않거나 만료된 쿠폰입니다.' }, { status: 404 });
    }

    // 최소 주문 금액 체크
    if (amount < (coupon.min_order_amount || 0)) {
      return NextResponse.json({ 
        error: `이 쿠폰은 최소 ${Number(coupon.min_order_amount).toLocaleString()}원 이상 주문 시 사용 가능합니다.` 
      }, { status: 400 });
    }

    // 기간 체크
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ error: '아직 사용 가능한 기간이 아닙니다.' }, { status: 400 });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ error: '이미 만료된 쿠폰입니다.' }, { status: 400 });
    }

    let discount = 0;
    if (coupon.discount_type === 'amount' || coupon.discount_type === 'fixed') {
      discount = Number(coupon.discount_amount || coupon.discount_value);
    } else if (coupon.discount_type === 'percent' || coupon.discount_type === 'rate') {
      discount = Math.floor(amount * (Number(coupon.discount_value) / 100));
    }

    return NextResponse.json({ 
      success: true, 
      discount_amount: discount,
      coupon_name: coupon.name 
    });

  } catch (err: any) {
    console.error('[Coupon Verify Error]:', err.message);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
