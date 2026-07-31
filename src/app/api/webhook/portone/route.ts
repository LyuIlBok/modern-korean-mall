import { NextRequest } from 'next/server';
import { handlePaymentWebhook } from '../_shared';

export const dynamic = 'force-dynamic';

/**
 * [결제 웹훅 처리 라우트 - 구(舊) URL]
 * 예전에는 아무 처리도 하지 않는 빈 스텁이었습니다. PortOne 콘솔에 이 URL이
 * 등록돼 있었다면 결제 확인이 영영 반영되지 않는 심각한 문제였습니다.
 * 지금은 /api/webhook과 동일한 실제 처리 로직(./_shared.ts)을 사용합니다.
 */
export async function POST(req: NextRequest) {
  return handlePaymentWebhook(req);
}
