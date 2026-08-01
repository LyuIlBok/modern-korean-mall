import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

interface OrderItemRow {
  product_name: string | null;
  option_name: string | null;
  quantity: number;
  price: number;
}

/**
 * [주문완료 안내 메일]
 * 이전에는 클라이언트가 보낸 email/buyerName/totalAmount/items를 그대로 믿고 메일을
 * 발송했습니다 — orderId만 있으면 누구나 임의의 이메일 주소로, 임의의 금액/상품이
 * 적힌 "자연의 결 주문완료" 메일을 보낼 수 있는 스팸/사칭 경로였습니다(주문 위조는
 * 아니지만 사이트 도메인 평판을 이용한 스팸 발송 및 제3자 괴롭힘에 악용 가능).
 * 이제는 orderId만 받고, 수신자/금액/상품 정보는 전부 서버가 DB에서 직접 조회합니다.
 */
export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: '주문번호가 필요합니다.' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_name, total_price, guest_email, user_id, order_items(product_name, option_name, quantity, price)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: '주문 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    let recipientEmail: string | null = order.guest_email ?? null;
    if (!recipientEmail && order.user_id) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      recipientEmail = userData?.user?.email ?? null;
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: '수신 이메일을 확인할 수 없습니다.' }, { status: 400 });
    }

    // Safety check for missing API Key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_dummy')) {
      console.warn('Missing Resend API Key. Skipping order confirmation email.');
      return NextResponse.json({ success: true, message: 'Mock email sent (API key missing)' });
    }

    const items = (order.order_items ?? []) as OrderItemRow[];
    const itemsHtml = items
      .map(
        (item) => `
      <li style="margin-bottom: 10px; list-style: none; padding: 10px; background: #f9f9f9; border-radius: 4px;">
        <strong>${item.product_name ?? '상품'}</strong> ${item.option_name ? `(${item.option_name})` : ''}<br/>
        <span style="color: #666; font-size: 14px;">${item.quantity}개 | ₩${Number(item.price).toLocaleString()}</span>
      </li>
    `
      )
      .join('');

    const { error } = await resend.emails.send({
      from: '자연의 결 <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `[자연의 결] 주문이 정상적으로 완료되었습니다. (주문번호: ${order.id.slice(0, 8)})`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.6;">
          <h2 style="color: #4A5D4E; margin-bottom: 24px; border-bottom: 2px solid #4A5D4E; padding-bottom: 10px;">주문해주셔서 감사합니다.</h2>
          <p style="font-size: 16px;">안녕하세요 <strong>${order.customer_name}</strong>님,</p>
          <p>고객님의 주문이 성공적으로 접수되었습니다. 정성을 다해 준비하여 보내드리겠습니다.</p>

          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin-top: 0; font-size: 18px;">주문 요약</h3>
            <p style="margin-bottom: 5px;"><strong>주문번호:</strong> ${order.id}</p>
            <p style="margin-top: 0;"><strong>총 결제금액:</strong> ₩${Number(order.total_price).toLocaleString()}</p>
            <ul style="padding: 0; margin: 20px 0;">
              ${itemsHtml}
            </ul>
          </div>

          <div style="background-color: #fff9f5; border: 1px solid #ffe7d9; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #d97706;">
              <strong>비회원 주문 안내:</strong><br/>
              비회원으로 주문하신 경우, 쇼핑몰의 <strong>'비회원 주문조회'</strong> 페이지에서<br/>
              위 <strong>주문번호</strong>와 <strong>이메일</strong>로 실시간 배송 조회가 가능합니다.
            </p>
          </div>

          <p style="font-size: 14px; color: #666;">
            궁금하신 점이 있다면 고객센터 혹은 1:1 채팅을 이용해 주세요.<br/>
            감사합니다.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #999;">
            © 2026 NATURE TEXTURE (복이네농장). All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email Send Error:', error);
      return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Order Success Email API Catch Error:', msg);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
