import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 웹훅용 Supabase 클라이언트 (Service Role Key 권장되나 일반 키로 우선 구현)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imp_uid, merchant_uid, status } = body;

    console.log(`[Webhook Received] ID: ${imp_uid}, Order: ${merchant_uid}, Status: ${status}`);

    if (status === 'paid') {
      // 1. 이미 처리된 주문인지 확인
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('id', merchant_uid.replace('ORD-', '')) // merchant_uid 기반 조회
        .single();

      if (!existingOrder) {
        // 여기에 결제 성공 페이지에서 미처 처리하지 못한 주문 저장 로직을 보강할 수 있습니다.
        // 현재는 '결제 완료' 로그만 남기거나 상태 업데이트 로직을 넣습니다.
        console.log(`Order ${merchant_uid} processed via Webhook.`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
