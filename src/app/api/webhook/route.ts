import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 서버 사이드 전용 Supabase 클라이언트 (RLS 우회 권한 필요 - 내부 로직용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    // 1. [보안] 포트원 V2 서명 검증 (가장 먼저 실행)
    if (!WEBHOOK_SECRET || !signature) {
      console.error('[Webhook] Missing secret or signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 포트원 V2 서명 검증 (HMAC-SHA256)
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Webhook] Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const { paymentId, status } = payload;

    console.log(`[Webhook Verified] PaymentId: ${paymentId}, Status: ${status}`);

    // 포트원 V2 상태값 매핑
    let dbStatus = '';
    if (status === 'PAID') dbStatus = '결제완료';
    else if (status === 'VIRTUAL_ACCOUNT_ISSUED') dbStatus = '입금대기';
    else if (status === 'FAILED') dbStatus = '결제실패';
    else if (status === 'CANCELLED') dbStatus = '취소됨';

    if (dbStatus && paymentId) {
      // 1. 주문 정보 조회 (유저 ID 및 결제 금액 확인)
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, total_price, status')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        console.error('[Webhook Fetch Error]:', fetchError.message);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // 2. 주문 상태 업데이트
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('[Webhook DB Update Error]:', updateError.message);
        return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
      }

      // 3. 결제 완료(PAID)인 경우 적립금 및 누적 금액 처리 (회원인 경우에만)
      if (status === 'PAID' && order.user_id && order.status !== '결제완료') {
        const rewardPoints = Math.floor(Number(order.total_price) * 0.01); // 1% 적립
        
        // profiles 테이블 업데이트 (RPC 대신 개별 쿼리로 처리)
        // 주의: 동시성 이슈를 방지하려면 RPC가 좋지만, 여기서는 지시대로 직접 UPDATE 수행
        const { data: profile } = await supabase
          .from('profiles')
          .select('points, total_spent')
          .eq('id', order.user_id)
          .single();

        if (profile) {
          const newPoints = (Number(profile.points) || 0) + rewardPoints;
          const newTotalSpent = (Number(profile.total_spent) || 0) + Number(order.total_price);

          await supabase
            .from('profiles')
            .update({ 
              points: newPoints, 
              total_spent: newTotalSpent,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.user_id);
            
          console.log(`[Webhook Success] Points awarded: ${rewardPoints}, Total spent updated for ${order.user_id}`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    // [보안] 에러 메시지 은닉: 실제 에러는 서버 로그에만 남김
    console.error('[Webhook Exception]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
