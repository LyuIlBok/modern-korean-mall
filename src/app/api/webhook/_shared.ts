import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// PortOne V2 Webhook Payload Interface
interface PortOneWebhookPayload {
  paymentId: string;
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'VIRTUAL_ACCOUNT_ISSUED' | string;
  transactionId?: string;
  txId?: string;
  merchantId?: string;
  storeId?: string;
}

interface RPCResult {
  success: boolean;
  message: string;
  already_processed: boolean;
  points_added?: number;
}

/**
 * [결제 웹훅 공통 처리 로직]
 * - PortOne V2 웹훅 서명 검증
 * - PortOne 서버에 재조회하여 실제 결제금액 검증 (위변조 방지)
 * - Supabase RPC(process_payment_webhook)를 통한 멱등성 및 트랜잭션 보장
 *
 * 과거 웹훅 URL이 두 개(/api/webhook, /api/webhook/portone)로 나뉘어 있었고
 * 그중 하나는 아무 처리도 하지 않는 빈 스텁이었습니다. PortOne 콘솔에 어느 URL이
 * 등록돼 있어도 동일하게 동작하도록 두 라우트 모두 이 함수를 호출하게 통일했습니다.
 */
export async function handlePaymentWebhook(req: NextRequest) {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook Error] Missing PORTONE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    if (!signature) {
      console.error('[Webhook Error] Missing signature header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Webhook Error] Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: PortOneWebhookPayload = JSON.parse(body);
    const { paymentId, status } = payload;

    if (!paymentId || !status) {
      console.error('[Webhook Error] Invalid payload structure');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log(`[Webhook Verified] Processing PaymentId: ${paymentId}, Status: ${status}`);

    let verifiedAmount: number | null = null;
    if (status === 'PAID') {
      const portoneApiSecret = process.env.PORTONE_API_SECRET;
      if (!portoneApiSecret) {
        console.error('[Webhook Error] Missing PORTONE_API_SECRET — cannot verify payment amount');
        return NextResponse.json({ error: 'Server configuration error (PORTONE_API_SECRET missing)' }, { status: 500 });
      }

      const verifyRes = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `PortOne ${portoneApiSecret}` },
      });

      if (!verifyRes.ok) {
        console.error('[Webhook Error] Failed to verify payment with PortOne:', await verifyRes.text());
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 502 });
      }

      const verifyData = await verifyRes.json();
      verifiedAmount = verifyData?.amount?.total ?? null;

      if (verifiedAmount === null) {
        console.error('[Webhook Error] PortOne response missing amount.total');
        return NextResponse.json({ error: 'Payment verification failed (no amount)' }, { status: 502 });
      }
    }

    const { data, error } = await supabaseAdmin.rpc('process_payment_webhook', {
      p_payment_id: paymentId,
      p_status: status,
      p_raw_payload: payload,
      p_verified_amount: verifiedAmount,
    });

    if (error) {
      console.error('[Webhook RPC Error]:', error.message);
      return NextResponse.json({ error: 'Database transaction failed' }, { status: 500 });
    }

    const result = data as RPCResult;

    if (result.already_processed) {
      console.log(`[Webhook Skip] Already processed: ${paymentId}`);
      return NextResponse.json({ message: result.message }, { status: 200 });
    }

    if (!result.success) {
      console.error(`[Webhook Logic Error] ${result.message}`);
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    console.log(`[Webhook Success] ${result.message}`);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook Exception]:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
