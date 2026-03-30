'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Loader2, Chrome, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useLanguageStore } from '@/store/useLanguageStore';

export default function LoginPage() {
  const { t } = useLanguageStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 일치하지 않습니다.' : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 소셜 로그인 처리 고도화
  const handleSocialLogin = async (e: React.MouseEvent, provider: 'google' | 'kakao' | 'naver') => {
    e.preventDefault();
    if (socialLoading) return; // 중복 클릭 방지

    setSocialLoading(provider);
    console.log(`[OAuth Debug] ${provider} 로그인 시도 시작`);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        // Supabase Custom Config에 맞춰 provider 명칭 전달 (타입 에러 방지를 위해 as any 사용)
        provider: provider === 'naver' ? 'custom:naver' as any : provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error(`[OAuth Error] ${provider}:`, error.message);
        alert(`로그인 실패 (${provider}): ${error.message}`);
        setSocialLoading(null);
        return;
      }

      if (data?.url) {
        console.log(`[OAuth Success] Redirecting to: ${data.url}`);
        // [Foolproof 리다이렉트] 2중 강제 이동 전략 적용
        window.location.assign(data.url);
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.href = data.url;
        }, 150);
      }
    } catch (err: any) {
      console.error(`[OAuth Exception] ${provider}:`, err);
      alert(`시스템 오류가 발생했습니다: ${err.message}`);
      setSocialLoading(null);
    }
  };

  const isAnyLoading = isLoading || !!socialLoading;

  return (
    <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 px-4 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-8">
            <div className="relative h-12 w-56">
              <Image 
                src="/logo_main.png" 
                alt="자연의 결" 
                fill 
                className="object-contain"
                priority
                unoptimized={true}
              />
            </div>
          </Link>
          <h1 className="font-serif text-2xl text-charcoal mb-2">다시 만나서 반가워요</h1>
          <p className="text-sm text-muted">당신의 일상에 자연의 결을 더해보세요.</p>
        </div>

        <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="email" 
                  disabled={isAnyLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] uppercase tracking-widest text-muted">Password</label>
                <Link href="#" className="text-[10px] text-deep-sage hover:underline">비밀번호 찾기</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="password" 
                  disabled={isAnyLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {errorMsg && (
              <motion.p 
                initial={{ opacity: 0, x: -5 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-xs text-terracotta bg-terracotta/5 p-3 rounded-sm border border-terracotta/10"
              >
                {errorMsg}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isAnyLoading}
              className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>로그인하기 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="relative my-10 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-light"></div></div>
            <span className="relative bg-white px-4 text-[10px] text-muted uppercase tracking-widest">Or Continue With</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button 
              type="button"
              disabled={isAnyLoading}
              onClick={(e) => handleSocialLogin(e, 'google')}
              className="flex flex-col items-center justify-center gap-2 py-3 border border-border-light rounded-sm hover:bg-hanji-white transition-colors text-[10px] font-bold uppercase tracking-tighter disabled:opacity-50"
            >
              {socialLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin text-[#4285F4]" /> : <Chrome className="w-5 h-5 text-[#4285F4]" />}
              Google
            </button>
            <button 
              type="button"
              disabled={isAnyLoading}
              onClick={(e) => handleSocialLogin(e, 'kakao')}
              className="flex flex-col items-center justify-center gap-2 py-3 border border-border-light rounded-sm hover:bg-[#FEE500]/10 transition-colors text-[10px] font-bold uppercase tracking-tighter disabled:opacity-50"
            >
              {socialLoading === 'kakao' ? <Loader2 className="w-5 h-5 animate-spin text-[#3C1E1E]" /> : <MessageCircle className="w-5 h-5 text-[#3C1E1E] fill-[#FEE500]" />}
              Kakao
            </button>
            <button 
              type="button"
              disabled={isAnyLoading}
              onClick={(e) => handleSocialLogin(e, 'naver')}
              className="flex flex-col items-center justify-center gap-2 py-3 border border-border-light rounded-sm hover:bg-[#03C75A]/10 transition-colors text-[10px] font-bold uppercase tracking-tighter disabled:opacity-50"
            >
              {socialLoading === 'naver' ? <Loader2 className="w-5 h-5 animate-spin text-[#03C75A]" /> : <div className="w-5 h-5 bg-[#03C75A] rounded-full flex items-center justify-center text-white font-extrabold text-[10px]">N</div>}
              Naver
            </button>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-muted">
            아직 회원이 아니신가요?{' '}
            <Link href="/signup" className="text-deep-sage border-b border-deep-sage pb-0.5 font-medium hover:text-charcoal hover:border-charcoal transition-colors">
              30초만에 회원가입하기
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
