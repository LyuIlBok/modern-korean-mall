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

    // 주의: coupons 테이블에는 discount_amount 컬럼 하나만 존재합니다.
    // 관리자 쿠폰 생성 화면(AdminDashboard.tsx)도 percent 타입일 때 퍼센트 숫자를
    // discount_amount 컬럼에 그대로 저장합니다(discount_value 컬럼은 실제로 쓰이지 않음).
    // 예전 코드가 percent 분기에서 discount_value를 읽어서 항상 NaN 할인액이 나오던
    // 버그였습니다(퍼센트 쿠폰 적용 시 결제 화면에 "₩NaN"이 표시되는 문제).
    let discount = 0;
    if (coupon.discount_type === 'amount' || coupon.discount_type === 'fixed') {
      discount = Number(coupon.discount_amount);
    } else if (coupon.discount_type === 'percent' || coupon.discount_type === 'rate') {
      discount = Math.floor(amount * (Number(coupon.discount_amount) / 100));
    }

    // 할인액이 주문 금액을 초과하지 않도록 방어
    if (!Number.isFinite(discount) || discount < 0) discount = 0;
    if (discount > amount) discount = amount;

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
