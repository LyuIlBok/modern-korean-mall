import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * [비회원 주문조회 API]
 * - RLS 정책상 orders 테이블은 로그인한 본인(user_id = auth.uid())만 SELECT 가능하도록 막혀있습니다.
 * - 비회원(guest) 주문 조회는 이 서버 라우트를 통해서만 허용하며,
 *   주문번호(id) + 결제 시 입력한 이메일(guest_email)이 정확히 일치할 때만 결과를 반환합니다.
 * - service role 키를 사용하되, 서버에서 두 조건을 모두 검증하므로 임의 조회는 불가능합니다.
 */
export async function POST(request: Request) {
  try {
    const { orderNumber, email } = await request.json();

    if (!orderNumber || !email) {
      return NextResponse.json({ error: '주문번호와 이메일을 모두 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderNumber.trim())
      .eq('guest_email', email.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '일치하는 주문 정보가 없습니다. 주문번호와 이메일을 확인해주세요.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Guest Order Lookup Error]:', msg);
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
