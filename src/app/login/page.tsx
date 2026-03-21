'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Leaf, ArrowRight, Chrome, MessageCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true); // 로그인/회원가입 모드 전환
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 이미 로그인된 경우 메인으로 이동
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // 실제 로그인 시도
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert('반갑습니다! 로그인이 완료되었습니다.');
      } else {
        // 실제 회원가입 시도
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('가입 신청이 완료되었습니다! 이메일로 발송된 확인 링크를 클릭해 주세요.');
      }
      router.push('/');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24 bg-hanji-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-deep-sage">
            <Leaf className="w-10 h-10 mx-auto" />
          </Link>
          <h1 className="font-serif text-3xl mb-3 text-charcoal">자연의 결</h1>
          <p className="text-muted text-xs tracking-widest uppercase">
            {isLogin ? 'Member Login' : 'Create Account'}
          </p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해 주세요"
              className="w-full bg-white border border-border-light px-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              className="w-full bg-white border border-border-light px-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 flex items-center justify-center gap-2 group font-medium"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입 완료'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        {/* Social Login Section */}
        <div className="mt-8">
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-border-light w-full absolute" />
            <span className="bg-hanji-white px-4 text-[10px] text-muted uppercase tracking-widest relative z-10">또는 간편 로그인</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialLogin('kakao')}
              className="flex items-center justify-center gap-2 py-3 bg-[#FEE500] text-charcoal rounded-sm text-sm hover:opacity-90 transition-opacity font-medium"
            >
              <MessageCircle className="w-4 h-4 fill-charcoal" /> 카카오톡
            </button>
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-border-light text-charcoal rounded-sm text-sm hover:bg-hanji-white transition-colors font-medium"
            >
              <Chrome className="w-4 h-4 text-[#4285F4]" /> 구글
            </button>
          </div>
          
          <button 
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-[#03C75A] text-white rounded-sm text-sm hover:opacity-90 transition-opacity font-medium"
          >
             <span className="font-bold">N</span> 네이버 로그인
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="mt-10 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-muted hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-1"
          >
            {isLogin ? '처음이신가요? 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}