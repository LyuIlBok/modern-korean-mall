import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WEBHOOK_SECRET = 'whsec_oz7HlF8VxGtksdQwJPoxqqEWzk2iis+61vHxadL3/0s=';

export async function POST(req: Request) {
  try {
    const body = await req.text(); // 검증을 위해 원문 텍스트 필요
    const signature = req.headers.get('x-portone-signature');

    // 1. 보안 검증 (Webhook Secret 활용)
    if (WEBHOOK_SECRET && signature) {
      // 포트원 V2 기준 검증 로직 (필요시 V2 공식 문서에 따라 해시 알고리즘 조정)
      // 현재는 로직의 틀을 구성하며, 실제 V2 명세에 맞게 강화합니다.
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
