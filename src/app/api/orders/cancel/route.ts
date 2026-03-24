import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. 요청자의 세션을 기반으로 동작하는 Supabase 클라이언트 설정 (서버 컴포넌트용 아님)
// 이 API는 클라이언트의 쿠키(세션) 정보를 가져와 권한을 직접 확인합니다.
const getSupabaseWithAuth = (authHeader: string | null) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader || '',
        },
      },
    }
  );
};

// 관리자용 무적 키는 주문 상태를 강제로 바꿀 때만 사용 (단, 소유권 확인 후)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 2. [보안] 요청자의 세션 정보로 유저 식별
    const supabase = getSupabaseWithAuth(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 3. [보안] 주문의 소유권(user_id) 확인
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('[Order Cancel] Order not found:', orderId);
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 소유권 확인 (주문 유저 ID와 현재 로그인 유저 ID 비교)
    if (order.user_id !== user.id) {
      console.error(`[Order Cancel] Unauthorized attempt: User ${user.id} tried to cancel Order ${orderId} owned by ${order.user_id}`);
      return NextResponse.json({ error: '본인의 주문만 취소할 수 있습니다.' }, { status: 403 });
    }

    // 4. 취소 가능 상태 확인
    const allowedStatus = ['결제완료', '입금대기', '결제대기'];
    if (!allowedStatus.includes(order.status)) {
      return NextResponse.json({ error: `이미 ${order.status} 상태인 주문은 취소할 수 없습니다.` }, { status: 400 });
    }

    // 5. DB 상태 업데이트 (안전하게 관리자 클라이언트로 수행)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: '주문취소',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // [보안] 에러 메시지 은닉
    console.error('[Order Cancel Exception]:', err.message);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
