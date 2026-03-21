'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Loader2, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      return setErrorMsg('비밀번호가 일치하지 않습니다.');
    }

    if (password.length < 6) {
      return setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      
      setIsSuccess(true);
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setErrorMsg(err.message === 'User already registered' ? '이미 등록된 이메일 주소입니다.' : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md bg-white p-12 border border-border-light rounded-sm shadow-xl">
          <div className="w-20 h-20 bg-deep-sage/10 text-deep-sage rounded-full flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl text-charcoal mb-4">환영합니다!</h1>
          <p className="text-muted leading-relaxed mb-8">
            회원가입이 완료되었습니다.<br/>
            이메일 인증이 필요한 경우 메일함을 확인해주세요.<br/>
            잠시 후 로그인 페이지로 이동합니다.
          </p>
          <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-deep-sage" /></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-8">
            <div className="relative h-12 w-48">
              <Image 
                src="/logo_horizontal.jfif" 
                alt="자연의 결" 
                fill 
                className="object-contain"
              />
            </div>
          </Link>
          <h1 className="font-serif text-2xl text-charcoal mb-2">새로운 인연의 시작</h1>
          <p className="text-sm text-muted">정직한 산물과 단아한 일상을 만나보세요.</p>
        </div>

        <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="이름"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상 입력"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                <input 
                  required
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="한 번 더 입력"
                  className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                />
                {confirmPassword && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {password === confirmPassword ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <span className="text-[10px] text-terracotta font-medium italic">불일치</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-terracotta bg-terracotta/5 p-3 rounded-sm border border-terracotta/10">
                {errorMsg}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-lg mt-4 active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>회원가입 완료하기 <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-muted">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-deep-sage border-b border-deep-sage pb-0.5 font-medium hover:text-charcoal hover:border-charcoal transition-colors">
              로그인하러 가기
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
