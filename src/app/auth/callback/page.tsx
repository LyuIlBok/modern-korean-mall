'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // URL에서 인증 코드를 추출하여 세션을 확정합니다.
      const { error } = await supabase.auth.getSession();
      
      if (!error) {
        // 로그인 성공 시 마이페이지로 이동
        router.push('/mypage');
      } else {
        console.error('Auth error:', error.message);
        router.push('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-hanji-white min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-deep-sage mb-4" />
      <p className="text-sm text-muted font-serif italic">인증을 완료하는 중입니다...</p>
    </div>
  );
}
