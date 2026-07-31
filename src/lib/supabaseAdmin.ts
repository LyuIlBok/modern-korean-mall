import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

/**
 * [Supabase Admin Client - Server Side ONLY]
 * - RLS를 우회하는 서비스 롤 키 전용 클라이언트입니다.
 * - 절대 클라이언트 사이드에서 노출되거나 사용되어서는 안 됩니다.
 *
 * 원래는 src/lib/supabaseClient.ts 안에 브라우저용 supabase 클라이언트와
 * 같이 정의돼 있었는데, 그러면 브라우저에서 supabaseClient.ts를 import할 때마다
 * (예: Header.tsx) 이 파일도 같이 평가되면서 GoTrueClient가 두 번(브라우저용 +
 * 이 관리자용) 만들어져 "Multiple GoTrueClient instances" 경고가 모든 페이지에서
 * 발생하고 있었습니다. supabaseAdmin을 이 서버 전용 파일로 분리해서, 브라우저
 * 번들에는 아예 포함되지 않도록(그리고 GoTrueClient도 하나만 생기도록) 했습니다.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
