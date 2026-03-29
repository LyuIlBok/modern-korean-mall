import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

  try {
    const body = await req.text();
    const signature = req.headers.get('x-portone-signature');

    // 1. [보안] 포트원 V2 서명 검증 (가장 먼저 실행)
    if (!WEBHOOK_SECRET || !signature) {
      console.error('[Webhook] Missing secret or signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    let dbStatus = '';
    if (status === 'PAID') dbStatus = '결제완료';
    else if (status === 'VIRTUAL_ACCOUNT_ISSUED') dbStatus = '입금대기';
    else if (status === 'FAILED') dbStatus = '결제실패';
    else if (status === 'CANCELLED') dbStatus = '취소됨';

    if (dbStatus && paymentId) {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, total_price, status')
        .eq('id', paymentId)
        .single();

      if (fetchError) {
        console.error('[Webhook Fetch Error]:', fetchError.message);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

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

      if (status === 'PAID' && order.user_id && order.status !== '결제완료') {
        const { data: itemsWithPoints } = await supabase
          .from('order_items')
          .select('quantity, products(reward_points)')
          .eq('order_id', paymentId);

        const totalRewardPoints = itemsWithPoints?.reduce((sum, item: any) => {
          const points = Number(item.products?.reward_points || 0);
          return sum + (points * item.quantity);
        }, 0) || 0;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('points, total_spent')
          .eq('id', order.user_id)
          .single();

        if (profile) {
          const newPoints = (Number(profile.points) || 0) + totalRewardPoints;
          const newTotalSpent = (Number(profile.total_spent) || 0) + Number(order.total_price);

          await supabase
            .from('profiles')
            .update({ 
              points: newPoints, 
              total_spent: newTotalSpent,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.user_id);
            
          console.log(`[Webhook Success] Custom Reward: ${totalRewardPoints}, Total spent updated for ${order.user_id}`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[Webhook Exception]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
