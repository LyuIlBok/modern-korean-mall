import { createClient } from '@supabase/supabase-js';

// TODO: Vercel 배포 시 환경 변수(.env)에서 실제 키 값으로 주입 예정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 다중 웹앱 간 SSO 공유를 위한 쿠키 및 세션 스토리지 옵션 설정
    cookieOptions: {
      name: 'agrileitner-sso-auth',
      lifetime: 60 * 60 * 24 * 7,
      domain: 'localhost', // 향후 실 배포 도메인(예: bokine.com)에 맞춰 수정
      path: '/',
      sameSite: 'lax',
    }
  }
});

console.log("[AgriLeitner SSO] Supabase 기반 통합 인증 클라이언트 로드 완료.");
