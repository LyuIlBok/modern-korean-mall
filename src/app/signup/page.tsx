'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Mail, Lock, User, Loader2, ShieldCheck, Check, 
  Phone, CheckCircle2, ChevronRight, AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // 약관 동의 상태
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  // 휴대폰 번호 자동 하이픈
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;
    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  // 전체 동의 핸들러
  const handleAllAgreement = (checked: boolean) => {
    setAgreements({
      all: checked,
      terms: checked,
      privacy: checked,
      marketing: checked
    });
  };

  // 개별 동의 핸들러
  const handleSingleAgreement = (key: keyof typeof agreements, checked: boolean) => {
    const updated = { ...agreements, [key]: checked };
    const allChecked = updated.terms && updated.privacy && updated.marketing;
    setAgreements({ ...updated, all: allChecked });
  };

  const isPasswordMatch = password && confirmPassword && password === confirmPassword;
  const isFormValid = fullName && email && password.length >= 6 && isPasswordMatch && agreements.terms && agreements.privacy && phone.length >= 12;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setErrorMsg('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            marketing_consent: agreements.marketing
          },
        },
      });

      if (error) throw error;
      
      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg === 'User already registered' ? '이미 등록된 이메일 주소입니다.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 px-4 min-h-screen">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md w-full bg-white p-12 border border-border-light rounded-sm shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-deep-sage" />
          <div className="w-24 h-24 bg-deep-sage/10 text-deep-sage rounded-full flex items-center justify-center mx-auto mb-10">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="font-serif text-4xl text-charcoal mb-6 tracking-tight">반갑습니다!</h1>
          <div className="space-y-4 mb-12">
            <p className="text-muted leading-relaxed font-light">
              <span className="font-bold text-charcoal">{fullName}님</span>, 회원가입이 완료되었습니다.<br/>
              자연의 결이 선사하는 정직한 결실을 만나보세요.
            </p>
            <p className="text-xs text-muted/60 italic font-light">잠시 후 로그인 페이지로 자동 이동합니다...</p>
          </div>
          <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-deep-sage/30" /></div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-hanji-white py-24 px-4 min-h-screen font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div className="text-center mb-16">
          <Link href="/" className="inline-block mb-10 group">
            <div className="relative h-12 w-56 grayscale group-hover:grayscale-0 transition-all duration-700">
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
          <h1 className="font-serif text-3xl text-charcoal mb-3 tracking-tight">새로운 인연의 시작</h1>
          <p className="text-sm text-muted font-light">정직한 산물과 단아한 일상을 제안합니다.</p>
        </div>

        <div className="bg-white p-12 border border-border-light rounded-sm shadow-xl relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-deep-sage/20" />
          
          <form onSubmit={handleSignup} className="space-y-10">
            {/* 기본 정보 섹션 */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-deep-sage" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/60">Account Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1 font-bold">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="성함" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-all text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1 font-bold">Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required type="tel" value={phone} onChange={handlePhoneChange} placeholder="010-0000-0000" maxLength={13} className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-all text-sm font-mono" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-muted ml-1 font-bold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-all text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1 font-bold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-all text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1 font-bold">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required type="password" value={confirmPassword} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="비밀번호 확인" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm focus:outline-none focus:border-deep-sage transition-all text-sm" />
                    {confirmPassword && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isPasswordMatch ? <Check className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-terracotta" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {password && confirmPassword && !isPasswordMatch && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] text-terracotta font-medium italic ml-1">비밀번호가 일치하지 않습니다.</motion.p>
                )}
              </AnimatePresence>
            </section>

            {/* 약관 동의 섹션 */}
            <section className="space-y-6 pt-4 border-t border-border-light/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-deep-sage" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/60">Terms & Agreements</h3>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-hanji-white/50 border border-border-light rounded-sm cursor-pointer hover:bg-hanji-white transition-all group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={agreements.all} onChange={(e) => handleAllAgreement(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-muted/30 rounded-full checked:bg-deep-sage checked:border-deep-sage transition-all cursor-pointer" />
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-xs font-bold text-charcoal uppercase tracking-widest">전체 약관에 동의합니다</span>
                </label>

                <div className="grid grid-cols-1 gap-3 px-2">
                  {[
                    { key: 'terms' as const, label: '이용약관 동의', required: true },
                    { key: 'privacy' as const, label: '개인정보 수집 및 이용 동의', required: true },
                    { key: 'marketing' as const, label: '마케팅 정보 수신 동의', required: false },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between group/item">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" checked={agreements[item.key]} onChange={(e) => handleSingleAgreement(item.key, e.target.checked)} className="peer appearance-none w-4 h-4 border border-muted/40 rounded-sm checked:bg-charcoal checked:border-charcoal transition-all cursor-pointer" />
                          <Check className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                        <span className={`text-xs ${item.required ? 'font-medium' : 'text-muted'}`}>
                          {item.label} <span className="text-[9px] opacity-50">({item.required ? '필수' : '선택'})</span>
                        </span>
                      </label>
                      <button type="button" className="text-[10px] text-muted hover:text-charcoal flex items-center gap-1 transition-colors uppercase tracking-widest font-bold">View <ChevronRight className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {errorMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-4 rounded-sm bg-terracotta/5 border border-terracotta/10 text-[11px] text-terracotta font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || !isFormValid}
              className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all duration-500 font-bold flex items-center justify-center gap-3 shadow-2xl mt-8 active:scale-[0.98] disabled:opacity-20 disabled:grayscale"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>자연의 결 멤버십 시작하기 <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted font-light">
            이미 회원이신가요?{' '}
            <Link href="/login" className="text-deep-sage border-b border-deep-sage/30 pb-0.5 font-medium hover:text-charcoal hover:border-charcoal transition-all">
              로그인하러 가기
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
