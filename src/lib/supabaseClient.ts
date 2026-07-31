import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

/**
 * [Supabase Browser Client]
 * - @supabase/ssr 패키지의 createBrowserClient를 사용합니다.
 * - 이 클라이언트는 쿠키를 기반으로 세션을 관리하며 서버와 자동으로 동기화됩니다.
 *
 * 주의: 서비스 롤 키를 쓰는 supabaseAdmin은 반드시 './supabaseAdmin'에서
 * 따로 import 하세요. 예전에는 이 파일에 같이 있었는데, 그러면 브라우저에서
 * 이 모듈을 로드할 때마다(거의 모든 페이지) GoTrueClient가 두 개(브라우저용 +
 * 관리자용) 생성돼 "Multiple GoTrueClient instances" 경고와 세션 동기화 문제가
 * 발생했습니다.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
