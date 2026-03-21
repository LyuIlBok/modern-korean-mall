'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ArrowRight, Chrome, MessageCircle, Mail, User, Phone, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });

  // Agreement States
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
  });

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    
    // 실시간 에러 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAgreementChange = (key: keyof typeof agreements) => {
    if (key === 'all') {
      const newValue = !agreements.all;
      setAgreements({ all: newValue, terms: newValue, privacy: newValue });
    } else {
      setAgreements(prev => {
        const newState = { ...prev, [key]: !prev[key] };
        newState.all = newState.terms && newState.privacy;
        return newState;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.includes('@')) newErrors.email = '유효한 이메일 주소를 입력해주세요.';
    if (formData.password.length < 6) newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    
    if (!isLogin) {
      if (!formData.name) newErrors.name = '성함을 입력해주세요.';
      if (!formData.phone) newErrors.phone = '연락처를 입력해주세요.';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
      if (!agreements.terms || !agreements.privacy) {
        newErrors.agreements = '필수 약관에 동의해주세요.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: formData.email, 
          password: formData.password 
        });
        if (error) throw error;
        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: formData.email, 
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              phone: formData.phone,
            }
          }
        });
        if (error) throw error;
        alert('가입 신청이 완료되었습니다! 이메일로 발송된 확인 링크를 클릭해 주시면 가입이 최종 완료됩니다.');
        setIsLogin(true);
      }
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
        options: { redirectTo: window.location.origin },
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
            {isLogin ? 'Member Login' : 'Create New Account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Sign Up Fields */}
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-5 overflow-hidden"
              >
                <div className="space-y-1">
                  <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                    <input name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="성함을 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
                  </div>
                  {errors.name && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                    <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="010-0000-0000" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
                  </div>
                  {errors.phone && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.phone}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email & Password */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
              <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="이메일을 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
            </div>
            {errors.email && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
              <input name="password" type={showPassword ? "text" : "password"} required value={formData.password} onChange={handleChange} placeholder="6자 이상 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/40 hover:text-charcoal transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.password}</p>}
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">Confirm Password</label>
              <div className="relative">
                <CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-deep-sage' : 'text-muted/40'}`} />
                <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="비밀번호를 한번 더 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* Terms & Conditions */}
          {!isLogin && (
            <div className="pt-4 pb-2 space-y-3 border-t border-border-light mt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={agreements.all} onChange={() => handleAgreementChange('all')} className="w-4 h-4 rounded-sm accent-deep-sage" />
                <span className="text-xs font-bold text-charcoal">전체 약관에 동의합니다</span>
              </label>
              <div className="pl-7 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={agreements.terms} onChange={() => handleAgreementChange('terms')} required className="w-3.5 h-3.5 rounded-sm accent-deep-sage" />
                  <span className="text-[11px] text-muted group-hover:text-charcoal transition-colors underline underline-offset-2">이용약관 동의 (필수)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={agreements.privacy} onChange={() => handleAgreementChange('privacy')} required className="w-3.5 h-3.5 rounded-sm accent-deep-sage" />
                  <span className="text-[11px] text-muted group-hover:text-charcoal transition-colors underline underline-offset-2">개인정보 처리방침 동의 (필수)</span>
                </label>
              </div>
              {errors.agreements && <p className="text-[10px] text-terracotta mt-1 ml-1">{errors.agreements}</p>}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-500 flex items-center justify-center gap-2 group font-medium mt-8 shadow-lg shadow-charcoal/5 active:scale-[0.98]"
          >
            {loading ? '처리 중...' : isLogin ? '로그인하기' : '회원가입 완료'}
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
        </div>

        {/* Toggle Mode */}
        <div className="mt-12 text-center pt-6 border-t border-border-light/50">
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-xs text-muted hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-1 font-medium"
          >
            {isLogin ? '처음이신가요? 30초만에 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
