'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function UpdatePasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('New password should be different')) {
          setErrorMsg('기존 비밀번호와 다른 비밀번호를 입력해 주세요.');
        } else if (error.message.includes('weak_password')) {
          setErrorMsg('비밀번호 보안 수준이 낮습니다. 더 복잡한 비밀번호를 사용해 주세요.');
        } else {
          setErrorMsg('비밀번호 변경 중 오류가 발생했습니다: ' + error.message);
        }
        return;
      }

      alert('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');
      
      // 로그아웃 처리 후 로그인 페이지로 이동
      await supabase.auth.signOut();
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg('문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="font-serif text-2xl text-charcoal mb-2">새 비밀번호 설정</h1>
          <p className="text-sm text-muted">안전한 비밀번호로 변경하여 계정을 보호하세요.</p>
        </div>

        <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
          {isSuccess ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-deep-sage/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-deep-sage" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-xl text-charcoal font-bold">변경 완료</h3>
                <p className="text-sm text-muted">
                  비밀번호가 성공적으로 변경되었습니다.<br/>
                  잠시 후 로그인 페이지로 이동합니다.
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-deep-sage mx-auto" />
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="새 비밀번호 (6자 이상)"
                    className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 확인"
                    className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                  />
                </div>
              </div>

              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="flex items-center gap-3 p-4 rounded-sm bg-terracotta/5 border border-terracotta/10"
                >
                  <AlertCircle className="w-4 h-4 text-terracotta flex-shrink-0" />
                  <p className="text-xs text-terracotta font-medium leading-relaxed">
                    {errorMsg}
                  </p>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>비밀번호 변경하기 <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-deep-sage" />
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
}
