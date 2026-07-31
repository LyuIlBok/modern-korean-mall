import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 중요: getUser()를 호출하여 세션을 검증하고 쿠키를 갱신합니다.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 1. 보호된 경로 리다이렉트 처리
  const isProtectedRoute = pathname.startsWith('/admin') || 
                           pathname.startsWith('/mypage')

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // 2. 관리자 권한 추가 검증 (/admin 경로 접근 시)
  if (pathname.startsWith('/admin') && user) {
    // 최고 관리자 화이트리스트 (Email 기반) - 환경 변수로 관리
    const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    
    if (SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL) {
      // 화이트리스트 이메일이면 DB 조회 없이 통과
      return response;
    }

    // 그 외 일반 관리자 권한은 DB(profiles) 조회
    // 주의: profiles 테이블에는 `role` 컬럼이 없습니다. 예전에 `select('is_admin, role')`로
    // 존재하지 않는 컬럼을 조회하면 PostgREST가 에러를 반환해서 profile이 항상 null이 되고,
    // 결과적으로 슈퍼 관리자 화이트리스트 이메일이 아닌 모든 관리자(is_admin=true로 승격된
    // 계정 포함)가 /admin에서 튕겨나가는 버그가 있었습니다. is_admin 컬럼만 조회하도록 수정.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      console.warn(`[Security Alert] Unauthorized admin access attempt by ${user.email}`);
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 3. 이미 로그인된 상태에서 로그인 페이지 접근 시
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청에 미들웨어 적용:
     * - api (API routes)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - public 폴더 내 이미지 등
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
