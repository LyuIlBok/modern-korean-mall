import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드 전용 Supabase 클라이언트 (RLS 우회 권한 필요)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. 주문 정보 확인
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. 취소 가능 상태 확인 (이미 배송 중이거나 완료된 경우 불가)
    const allowedStatus = ['결제완료', '입금대기', '결제대기'];
    if (!allowedStatus.includes(order.status)) {
      return NextResponse.json({ error: `현재 상태(${order.status})에서는 취소가 불가능합니다.` }, { status: 400 });
    }

    // 3. [옵션] 포트원 결제 취소 로직 (추후 구현 시 이 부분에 추가)
    // if (order.payment_method === 'card') {
    //   // 포트원 취소 API 호출...
    // }

    // 4. DB 상태 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: '주문취소',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: '주문이 취소되었습니다.' });
  } catch (err: any) {
    console.error('[Order Cancel Error]:', err.message);
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
