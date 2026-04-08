import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * [Next.js 16 Proxy / Middleware]
 * - 모든 요청에 대해 Supabase 세션을 갱신하고 쿠키를 동기화합니다.
 * - 보호된 경로(/admin, /checkout, /mypage)에 대한 접근 제어를 수행합니다.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // 세션 유지를 위해 maxAge를 7일로 강제 설정 (Supabase 기본값보다 안정적)
          const cookieOptions = {
            ...options,
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          };
          request.cookies.set({ name, value, ...cookieOptions });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: CookieOptions) {
          const cookieOptions = {
            ...options,
            path: '/',
          };
          request.cookies.set({ name, value: '', ...cookieOptions });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...cookieOptions });
        },
      },
    }
  );

  // 중요: getUser()는 auth.user()보다 안전하며 서버사이드에서 항상 세션을 검증/갱신합니다.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // 로그인 페이지 자체에 대한 리다이렉트 루프 방지
  if (pathname === '/login') {
    // 이미 로그인된 사용자가 로그인 페이지에 오면 메인으로
    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return response;
  }

  // 1. 관리자 경로 보호 (/admin)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      console.warn(`[Security Alert] Non-admin access attempt to /admin by ${user.email}`);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 2. 일반 사용자 보호 경로 (/checkout, /mypage)
  if (pathname.startsWith('/checkout') || pathname.startsWith('/mypage')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
