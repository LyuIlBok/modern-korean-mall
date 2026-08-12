import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

export const dynamic = 'force-dynamic';

/**
 * [장바구니 이탈 리마인드]
 * Vercel Cron이 매일 1회 호출합니다(vercel.json 참고). 24시간 이상 담긴 채로
 * 결제되지 않은 cart_items를 가진 회원에게 "장바구니에 상품이 남아있어요" 메일을
 * 보냅니다. 같은 사람에게 매일 재발송되지 않도록 cart_abandonment_reminders에
 * 마지막 발송 시각을 기록하고 쿨다운(7일) 안에는 건너뜁니다.
 *
 * 이 기능은 원래 cart_items가 실제 서버 장바구니 상태와 어긋나 있어서(로그인 시
 * 1회성 동기화만 되고 이후 갱신 안 됨) 보류했던 트랙입니다. 클코가 useCartStore의
 * 담기/삭제/비우기 액션마다 cart_items를 실시간 동기화하도록 구현을 완료했고
 * (order-success 페이지에서 결제 완료 시 clearCart로 비워짐도 확인), 안티가 이
 * 선행조건 해소를 확인해줘서 이어서 만듭니다.
 *
 * 보안: Vercel Cron이 아닌 임의의 요청으로 대량 메일 발송/DB 쓰기가 트리거되는 걸
 * 막기 위해 CRON_SECRET 환경변수와 Authorization 헤더를 대조합니다. 아직
 * CRON_SECRET을 Vercel에 등록 전이라 지금은 기본적으로 요청을 거부합니다 —
 * 일복님이 Vercel에 CRON_SECRET을 추가해야 실제로 작동합니다(아래 AI_STATUS.md 참고).
 */
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_USERS_PER_RUN = 200;

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS).toISOString();

    const { data: cartRows, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select('user_id, quantity, created_at, product:products(name, imageUrl)')
      .lte('created_at', cutoff)
      .not('user_id', 'is', null);

    if (cartError) throw cartError;
    if (!cartRows || cartRows.length === 0) {
      return NextResponse.json({ success: true, message: '이탈 장바구니 없음', sent: 0 });
    }

    type CartRow = {
      user_id: string;
      quantity: number;
      created_at: string;
      product: { name: string | null; imageUrl: string | null } | { name: string | null; imageUrl: string | null }[] | null;
    };

    const byUser = new Map<string, { name: string; quantity: number }[]>();
    for (const row of cartRows as CartRow[]) {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      const list = byUser.get(row.user_id) ?? [];
      list.push({ name: product?.name ?? '상품', quantity: row.quantity });
      byUser.set(row.user_id, list);
    }

    const userIds = Array.from(byUser.keys()).slice(0, MAX_USERS_PER_RUN);

    const { data: recentReminders, error: reminderError } = await supabaseAdmin
      .from('cart_abandonment_reminders')
      .select('user_id, last_sent_at')
      .in('user_id', userIds);
    if (reminderError) throw reminderError;

    const cooldownCutoff = Date.now() - REMINDER_COOLDOWN_MS;
    const recentlySent = new Set(
      (recentReminders ?? [])
        .filter((r) => new Date(r.last_sent_at).getTime() > cooldownCutoff)
        .map((r) => r.user_id)
    );

    const targetUserIds = userIds.filter((id) => !recentlySent.has(id));

    const hasResendKey = !!process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_dummy');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://modern-korean-mall.vercel.app';

    let sentCount = 0;
    const errors: string[] = [];

    for (const userId of targetUserIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const items = byUser.get(userId) ?? [];
      if (hasResendKey) {
        const itemsHtml = items
          .map(
            (item) => `
          <li style="margin-bottom: 10px; list-style: none; padding: 10px; background: #f9f9f9; border-radius: 4px;">
            <strong>${item.name}</strong>
            <span style="color: #666; font-size: 14px;"> · ${item.quantity}개</span>
          </li>
        `
          )
          .join('');

        const { error: sendError } = await resend.emails.send({
          from: '자연의 결 <onboarding@resend.dev>',
          to: [email],
          subject: '[자연의 결] 장바구니에 담아두신 상품이 기다리고 있어요',
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.6;">
              <h2 style="color: #4A5D4E; margin-bottom: 24px; border-bottom: 2px solid #4A5D4E; padding-bottom: 10px;">장바구니에 상품이 남아있어요</h2>
              <p style="font-size: 16px;">담아두신 상품이 아직 그대로예요. 잊지 않으셨다면 마저 결제를 완료해보세요.</p>
              <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <ul style="padding: 0; margin: 0;">${itemsHtml}</ul>
              </div>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/cart" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500;">장바구니 보러 가기</a>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
              <p style="font-size: 12px; color: #999;">© 2026 NATURE TEXTURE (복이네농장). All rights reserved.</p>
            </div>
          `,
        });

        if (sendError) {
          errors.push(`${userId}: ${sendError.message}`);
          continue;
        }
      }

      const { error: upsertError } = await supabaseAdmin
        .from('cart_abandonment_reminders')
        .upsert({ user_id: userId, last_sent_at: new Date().toISOString() });
      if (upsertError) {
        errors.push(`${userId} (upsert): ${upsertError.message}`);
        continue;
      }
      sentCount += 1;
    }

    return NextResponse.json({
      success: true,
      candidates: userIds.length,
      sent: sentCount,
      skipped_cooldown: recentlySent.size,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cart Abandonment Reminder] Error:', msg);
    return NextResponse.json({ error: '리마인드 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
