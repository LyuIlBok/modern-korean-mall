import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=naver_auth_failed`);
  }

  try {
    // 1. 네이버 Access Token 발급 요청
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID || '',
        client_secret: process.env.NAVER_CLIENT_SECRET || '',
        code,
        state: state || '',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('Failed to get Naver access token');

    // 2. 네이버 유저 프로필 가져오기
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    if (userData.resultcode !== '00') throw new Error('Failed to get Naver profile');

    const naverUser = userData.response; // id, email, name, profile_image 등 포함
    const email = naverUser.email;
    const name = naverUser.name || naverUser.nickname || 'Naver User';

    // 3. Supabase Admin 클라이언트 생성 (유저 강제 생성용)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // 중요: Admin 권한 필요
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );

    // 4. Supabase에 유저 존재 확인 및 강제 생성
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let user = existingUser.users.find(u => u.email === email);

    if (!user) {
      // 새 유저 생성 (비밀번호는 랜덤 생성하여 보안 유지)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).substring(2) + '!Naver',
        email_confirm: true,
        user_metadata: { full_name: name, provider: 'naver' }
      });
      if (createError) throw createError;
      user = newUser.user;
    }

    // 5. 유저 세션 강제 생성 (Link Identity 효과)
    // Supabase native가 네이버를 안 도와주므로, 수동으로 세션을 생성하여 쿠키에 구워야 함
    // 여기서는 간단하게 해당 유저로 로그인된 세션을 가져오기 위해 admin.generateLink 사용 또는
    // 커스텀 JWT 발행이 필요하지만, 가장 안정적인 방법은 유저의 세션을 클라이언트에 전달하는 것임.
    // 다만, API 라우트에서 직접 세션을 만드는 API는 제한적이므로,
    // 이메일 기반으로 '매직 링크'를 즉시 승인하거나, DB Profiles를 동기화한 뒤
    // 클라이언트에서 해당 유저의 email로 자동 로그인을 시도하게 할 수 있음.
    
    // [보안 우회 핵심]: 서버에서 해당 유저의 '인증된' 상태를 쿠키에 기록
    // (이 예제에서는 Admin SDK로 유저 정보를 profiles에 Upsert 하고 메인으로 이동)
    await supabase.from('profiles').upsert({
      id: user.id,
      email: email,
      full_name: name,
      avatar_url: naverUser.profile_image || '',
      updated_at: new Date().toISOString()
    });

    // 주의: Supabase native OAuth가 아니므로, 실제 auth.users 세션을 쿠키에 굽기 위해서는
    // supabase.auth.setSession()을 호출해야 하지만 이는 클라이언트 사이드 함수임.
    // 따라서, 여기서는 '네이버 전용 임시 토큰'을 발행하거나, 
    // 유저를 생성한 뒤 로그인 페이지로 보내 '자동 로그인' 처리를 하게 유도함.
    
    // 가장 깔끔한 방법은 유저 이메일로 'OTP'를 발행하여 즉시 검증하는 것임.
    const { data: otpData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: '/' }
    });

    if (otpData?.properties?.action_link) {
      return NextResponse.redirect(otpData.properties.action_link);
    }

    return NextResponse.redirect(`${origin}/`);

  } catch (err: any) {
    console.error('Naver OAuth Error:', err.message);
    return NextResponse.redirect(`${origin}/login?error=naver_system_error`);
  }
}
