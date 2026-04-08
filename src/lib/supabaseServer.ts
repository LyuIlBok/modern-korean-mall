import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * [Supabase Server Client]
 * - 서버 컴포넌트, 서버 액션, API 라우트에서 사용합니다.
 * - next/headers의 cookies()를 통해 브라우저 쿠키에 직접 접근합니다.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트에서 쿠키를 설정하려고 할 때 발생하는 오류를 무시합니다.
            // (미들웨어에서 실제 쓰기 작업을 수행함)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // 서버 컴포넌트에서 쿠키를 제거하려고 할 때 발생하는 오류를 무시합니다.
          }
        },
      },
    }
  )
}
