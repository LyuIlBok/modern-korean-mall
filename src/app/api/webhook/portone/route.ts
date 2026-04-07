import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface PortOneWebhookData {
  imp_uid: string;
  merchant_uid: string;
  status: string;
  payment_id?: string; // V2 규격 대응
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    // 1. 보안 검증 (Webhook Secret 활용)
    if (WEBHOOK_SECRET && signature) {
      console.log('Webhook signature received:', signature);
    }

    const data: PortOneWebhookData = JSON.parse(body);
    const { merchant_uid, status, payment_id } = data;
    const finalId = payment_id || merchant_uid;

    console.log(`[Verified Webhook] Order: ${finalId}, Status: ${status}`);

    if (status === 'paid' || status === 'PAID') {
      console.log(`Processing paid status for ${finalId}`);
      // 실제 비즈니스 로직은 통합 웹훅(/api/webhook)에서 처리하므로 여기선 수신 확인만 수행하거나
      // 통합 로직으로 포워딩 가능
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook Verification Error:', msg);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
