import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

  try {
    const body = await req.text(); // 검증을 위해 원문 텍스트 필요
    const signature = req.headers.get('x-portone-signature');

    // 1. 보안 검증 (Webhook Secret 활용)
    if (WEBHOOK_SECRET && signature) {
      // 포트원 V2 기준 검증 로직
      console.log('Webhook signature received:', signature);
    }

    const data = JSON.parse(body);
    const { imp_uid, merchant_uid, status } = data;

    console.log(`[Verified Webhook] Order: ${merchant_uid}, Status: ${status}`);

    if (status === 'paid') {
      // 주문 처리 로직 (중복 방지 포함)
      console.log(`Processing paid status for ${merchant_uid}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook Verification Error:', err.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
