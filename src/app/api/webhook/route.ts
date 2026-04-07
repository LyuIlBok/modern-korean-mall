import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// PortOne V2 Webhook Payload Interface
interface PortOneWebhookPayload {
  paymentId: string;
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'VIRTUAL_ACCOUNT_ISSUED' | string;
  transactionId?: string;
  txId?: string;
  merchantId?: string;
  storeId?: string;
}

// Supabase RPC Result Interface
interface RPCResult {
  success: boolean;
  message: string;
  already_processed: boolean;
  points_added?: number;
}

/**
 * [결제 웹훅 처리 라우트]
 * - PortOne V2 웹훅 서명 검증
 * - Supabase RPC(process_payment_webhook)를 통한 멱등성 및 트랜잭션 보장
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Webhook Error] Missing PORTONE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    // 1. [보안] 포트원 V2 서명 검증
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

    // 2. Supabase RPC 호출 (All-or-Nothing 트랜잭션 처리)
    // p_payment_id는 TEXT로 넘기면 RPC 내부에서 UUID 변환 처리를 하도록 설계됨
    const { data, error } = await supabaseAdmin.rpc('process_payment_webhook', {
      p_payment_id: paymentId,
      p_status: status,
      p_raw_payload: payload
    });

    if (error) {
      console.error('[Webhook RPC Error]:', error.message);
      // DB 일시적 장애 등을 대비해 500을 반환하여 PG사 재시도 유도
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
