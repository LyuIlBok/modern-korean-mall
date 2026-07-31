import { supabaseAdmin } from './supabaseAdmin';
import { CONFIG } from './config';

export interface AdminAuthResult {
  userId: string;
  email: string | null;
}

/**
 * [관리자 API 인증 헬퍼]
 *
 * 예전 방식: 클라이언트가 body/query로 보낸 raw user id(`adminToken`)를 그대로
 * "인증 토큰"처럼 신뢰했습니다. 이건 실제 인증이 아니라 그냥 UUID 값 비교라서,
 * 그 UUID만 알면(GET 요청 쿼리스트링이라 브라우저 히스토리/서버 로그/Referer로
 * 얼마든지 유출될 수 있음) 로그인 세션 없이도 아무나 관리자 API를 호출할 수
 * 있는 구조적 취약점이었습니다.
 *
 * 새 방식: 클라이언트가 `Authorization: Bearer <supabase access_token>` 헤더로
 * 실제 로그인 세션의 서명된 JWT를 보내고, 서버는 그 서명을 검증해서 진짜
 * 로그인된 사용자인지 확인합니다. 이후 그 사용자의 profiles.is_admin을 봅니다.
 * 세션이 없거나 만료됐거나 위조됐으면 여기서 걸러집니다.
 */
export async function verifyAdmin(request: Request): Promise<AdminAuthResult | null> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, email')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) return null;

  const isSuperAdmin = profile.email === CONFIG.ADMIN_EMAILS[0];
  if (!profile.is_admin && !isSuperAdmin) return null;

  return { userId: userData.user.id, email: profile.email ?? null };
}
