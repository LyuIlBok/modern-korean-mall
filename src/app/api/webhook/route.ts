import { NextRequest } from 'next/server';
import { handlePaymentWebhook } from './_shared';

export const dynamic = 'force-dynamic';

/**
 * [결제 웹훅 처리 라우트]
 * 실제 처리 로직은 ./_shared.ts의 handlePaymentWebhook에 있습니다.
 * (동일한 로직을 /api/webhook/portone 에서도 공유합니다 — 두 URL 중 어느 쪽이
 * PortOne 콘솔에 등록돼 있어도 정상 동작하도록 통일했습니다.)
 */
export async function POST(req: NextRequest) {
  return handlePaymentWebhook(req);
}
