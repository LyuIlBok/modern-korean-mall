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
      // paymentId가 주문 UUID인 경우
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        console.error('[Webhook DB Update Error]:', error.message);
        return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    // [보안] 에러 메시지 은닉: 실제 에러는 서버 로그에만 남김
    console.error('[Webhook Exception]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
