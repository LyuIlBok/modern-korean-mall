'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') || '/';

      // 소셜 로그인 제공자가 사용자 취소/거부 시 code 없이 error 파라미터만
      // 붙여서 이 페이지로 돌려보내는 경우가 있습니다. 이때는 세션이 없는 게
      // 정상이라 아래 getSession()이 error 없이 "세션 없음"으로 통과해버려서,
      // 로그인 안 된 채로 next 페이지로 넘어가버리는 문제가 있었습니다.
      const oauthError = searchParams.get('error') || searchParams.get('error_description');
      if (oauthError) {
        console.error('OAuth provider error:', oauthError);
        router.push('/login?error=oauth_denied');
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session) {
        router.push(next);
      } else {
        if (error) console.error('Auth error:', error.message);
        router.push('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-hanji-white min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-deep-sage mb-4" />
        <p className="text-sm text-muted font-serif italic">인증을 완료하는 중입니다...</p>
      </div>
    </div>
  );
}
