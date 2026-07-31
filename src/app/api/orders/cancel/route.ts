import { NextResponse } from 'next/server';
import { supabase as supabasePublic } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!authHeader) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 요청자의 세션을 기반으로 동작하는 Supabase 클라이언트
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('[Order Cancel] Order not found:', orderId);
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      console.error(`[Order Cancel] Unauthorized attempt: User ${user.id} tried to cancel Order ${orderId} owned by ${order.user_id}`);
      return NextResponse.json({ error: '본인의 주문만 취소할 수 있습니다.' }, { status: 403 });
    }

    const allowedStatus = ['결제완료', '입금대기', '결제대기'];
    if (!allowedStatus.includes(order.status)) {
      return NextResponse.json({ error: `이미 ${order.status} 상태인 주문은 취소할 수 없습니다.` }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: '주문취소',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 차감했던 재고를 되돌려줍니다. (reserve된 적 없으면 함수 내부에서 아무 것도 안 함)
    const { error: restoreError } = await supabaseAdmin.rpc('restore_stock_for_order', { p_order_id: orderId });
    if (restoreError) {
      console.error('[Order Cancel] Stock restore failed:', restoreError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Order Cancel Exception]:', msg);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
