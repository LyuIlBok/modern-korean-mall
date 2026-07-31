import { supabase } from './supabaseClient';

/**
 * 관리자 API 호출 전용 fetch 래퍼.
 * 현재 로그인 세션의 access_token을 Authorization: Bearer 헤더에 자동으로 실어 보냅니다.
 * (서버는 src/lib/adminAuth.ts의 verifyAdmin()으로 이 헤더를 검증합니다.)
 * 더 이상 URL/body에 adminToken(raw user id)을 직접 넣지 마세요 — 유출 시 위조 가능합니다.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
