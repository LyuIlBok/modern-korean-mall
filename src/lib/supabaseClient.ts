import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

/**
 * [Supabase Browser Client]
 * - @supabase/ssr 패키지의 createBrowserClient를 사용합니다.
 * - 이 클라이언트는 쿠키를 기반으로 세션을 관리하며 서버와 자동으로 동기화됩니다.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * [Supabase Admin Client - Server Side ONLY]
 * - RLS를 우회하는 서비스 롤 키 전용 클라이언트입니다.
 * - 절대 클라이언트 사이드에서 노출되거나 사용되어서는 안 됩니다.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
