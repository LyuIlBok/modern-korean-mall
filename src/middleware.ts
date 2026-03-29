import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호가 필요한 경로 정의
const PROTECTED_ROUTES = ['/mypage', '/checkout'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 세션 정보 가져오기
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  // 1. 일반 사용자 보호 경로 체크
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. 관리자 경로 체크 (철저한 차단)
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 서버 사이드에서 profiles 테이블의 is_admin 여부 직접 재확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_admin) {
      console.warn(`[Unauthorized Access] User ${session.user.email} tried to access ${pathname}`);
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/mypage/:path*', '/checkout/:path*', '/admin/:path*'],
};
