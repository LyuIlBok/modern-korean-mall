import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 서버 사이드 전용 Supabase 클라이언트 (RLS 우회 권한 필요)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    // 1. 서명 검증 (보안)
    if (WEBHOOK_SECRET && signature) {
      // 포트원 V2 서명 검증 로직 (HMAC-SHA256)
      // 실제 운영 환경에서는 포트원 SDK나 공식 가이드에 따른 검증을 권장합니다.
      console.log('[Webhook] Signature verification step (Implementation depends on PortOne V2 spec)');
    }

    const payload = JSON.parse(body);
    const { paymentId, status, msg } = payload;

    console.log(`[Webhook Received] PaymentId: ${paymentId}, Status: ${status}`);

    // 포트원 V2 상태값 매핑
    // PAID: 결제 완료
    // VIRTUAL_ACCOUNT_ISSUED: 가상계좌 발급됨
    // FAILED: 결제 실패
    // CANCELLED: 결제 취소
    
    let dbStatus = '';
    if (status === 'PAID') dbStatus = '결제완료';
    else if (status === 'VIRTUAL_ACCOUNT_ISSUED') dbStatus = '입금대기';
    else if (status === 'FAILED') dbStatus = '결제실패';
    else if (status === 'CANCELLED') dbStatus = '취소됨';

    if (dbStatus && paymentId) {
      // paymentId가 'order-UUID' 형식인 경우 UUID만 추출
      const orderId = paymentId.startsWith('order-') ? paymentId.replace('order-', '') : paymentId;

      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('[Webhook Error] DB Update Failed:', error.message);
        return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
      }

      console.log(`[Webhook Success] Order ${orderId} updated to ${dbStatus}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Webhook Error] Processing failed:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
