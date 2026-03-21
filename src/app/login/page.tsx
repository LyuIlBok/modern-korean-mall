'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Leaf, ArrowRight, Chrome, MessageCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // 이미 로그인된 경우 메인으로 이동
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push('/');
    };
    checkUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: formData.email, 
        password: formData.password 
      });
      if (error) throw error;
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
          queryParams: {
            prompt: 'select_account', // 항상 계정 선택창을 띄워 기존/새 계정 구분 가능하게 함
          }
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
        className="max-w-md w-full bg-white p-8 sm:p-12 border border-border-light shadow-sm rounded-sm"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-deep-sage">
            <Leaf className="w-10 h-10 mx-auto" />
          </Link>
          <h1 className="font-serif text-3xl mb-3 text-charcoal tracking-tight">자연의 결</h1>
          <p className="text-muted text-[10px] tracking-[0.2em] uppercase">
            Member Login
          </p>
        </div>

        {/* Email Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
              <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="이메일을 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
              <input name="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange} placeholder="비밀번호를 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/40 hover:text-charcoal transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-500 flex items-center justify-center gap-2 group font-medium mt-8 shadow-lg shadow-charcoal/5 active:scale-[0.98]"
          >
            {loading ? '처리 중...' : '로그인하기'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        {/* Social Login Section */}
        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-8">
            <div className="border-t border-border-light w-full absolute" />
            <span className="bg-white px-4 text-[9px] text-muted uppercase tracking-[0.3em] relative z-10">Simple Login</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialLogin('kakao')}
              className="flex items-center justify-center gap-2 py-3 bg-[#FEE500] text-charcoal rounded-sm text-xs hover:opacity-90 transition-opacity font-medium"
            >
              <MessageCircle className="w-4 h-4 fill-charcoal" /> 카카오톡
            </button>
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-border-light text-charcoal rounded-sm text-xs hover:bg-hanji-white transition-colors font-medium"
            >
              <Chrome className="w-4 h-4 text-[#4285F4]" /> 구글
            </button>
          </div>
          <p className="text-[9px] text-center text-muted mt-4 font-light italic">
            * 클릭 시 다른 계정으로 로그인하거나 기존 계정을 선택할 수 있습니다.
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="mt-12 text-center pt-6 border-t border-border-light/50">
          <Link 
            href="/signup"
            className="text-xs text-muted hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-1 font-medium"
          >
            처음이신가요? 30초만에 회원가입하기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
