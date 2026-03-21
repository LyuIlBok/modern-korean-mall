'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ArrowRight, User, Phone, Mail, Lock, MapPin, Search, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

declare global {
  interface Window {
    daum: any;
  }
}

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    postcode: '',
    address: '',
    detailAddress: '',
  });

  // Agreements
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 다음 주소 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setFormData({ ...formData, postcode: data.zonecode, address: data.address });
      }
    }).open();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAgreementChange = (key: keyof typeof agreements) => {
    if (key === 'all') {
      const newValue = !agreements.all;
      setAgreements({ all: newValue, terms: newValue, privacy: newValue, marketing: newValue });
    } else {
      setAgreements(prev => {
        const newState = { ...prev, [key]: !prev[key] };
        newState.all = newState.terms && newState.privacy && newState.marketing;
        return newState;
      });
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!agreements.terms || !agreements.privacy) {
        alert('필수 약관에 동의해주세요.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const newErrors: Record<string, string> = {};
      if (!formData.name) newErrors.name = '성함을 입력해주세요.';
      if (!formData.email.includes('@')) newErrors.email = '유효한 이메일을 입력해주세요.';
      if (formData.password.length < 6) newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(3);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone,
            address: `(${formData.postcode}) ${formData.address} ${formData.detailAddress}`,
          }
        }
      });

      if (error) throw error;

      alert('환영합니다! 회원가입 신청이 완료되었습니다. 이메일 확인 후 로그인이 가능합니다.');
      router.push('/login');
    } catch (err: any) {
      alert(`가입 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-hanji-white py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-16">
          <Link href="/" className="inline-block mb-6 text-deep-sage"><Leaf className="w-10 h-10 mx-auto" /></Link>
          <h1 className="font-serif text-4xl mb-4 text-charcoal tracking-tight">자연의 결 연 맺기</h1>
          <p className="text-muted text-[10px] tracking-[0.3em] uppercase">Join Our Community</p>
        </div>

        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-16 relative px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-border-light z-0" />
          {[1, 2, 3].map((s) => (
            <div key={s} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif transition-all duration-500 ${
              step >= s ? 'bg-charcoal text-white scale-110 shadow-lg' : 'bg-white border border-border-light text-muted'
            }`}>
              {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="bg-white p-8 border border-border-light rounded-sm shadow-sm space-y-6">
                <label className="flex items-center gap-4 cursor-pointer group border-b border-border-light pb-6">
                  <input type="checkbox" checked={agreements.all} onChange={() => handleAgreementChange('all')} className="w-5 h-5 accent-deep-sage" />
                  <span className="font-serif text-xl text-charcoal">전체 약관에 동의합니다</span>
                </label>
                <div className="space-y-4 pt-2">
                  {[
                    { key: 'terms', label: '이용약관 동의 (필수)', required: true },
                    { key: 'privacy', label: '개인정보 수집 및 이용 동의 (필수)', required: true },
                    { key: 'marketing', label: '이벤트 및 혜택 알림 수신 (선택)', required: false },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={(agreements as any)[item.key]} onChange={() => handleAgreementChange(item.key as any)} className="w-4 h-4 accent-deep-sage" />
                        <span className="text-sm text-muted group-hover:text-charcoal transition-colors">{item.label}</span>
                      </div>
                      <button type="button" className="text-[10px] text-muted underline underline-offset-2">내용보기</button>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleNextStep} className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all font-serif text-lg flex items-center justify-center gap-2 group">
                다음 단계로 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-white p-8 border border-border-light rounded-sm shadow-sm space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Full Name</label>
                  <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  <input name="name" value={formData.name} onChange={handleChange} placeholder="성함을 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage text-sm" /></div>
                  {errors.name && <p className="text-[10px] text-terracotta mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Email Address</label>
                  <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@nature.com" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage text-sm" /></div>
                  {errors.email && <p className="text-[10px] text-terracotta mt-1">{errors.email}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Password</label>
                    <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="6자 이상" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage text-sm" /></div>
                    {errors.password && <p className="text-[10px] text-terracotta mt-1">{errors.password}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted ml-1">Confirm Password</label>
                    <div className="relative"><CheckCircle2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'text-deep-sage' : 'text-muted/40'}`} />
                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="한번 더 입력" className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage text-sm" /></div>
                    {errors.confirmPassword && <p className="text-[10px] text-terracotta mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-white border border-border-light py-5 rounded-sm hover:bg-hanji-white transition-all font-serif text-lg">이전</button>
                <button onClick={handleNextStep} className="flex-[2] bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all font-serif text-lg flex items-center justify-center gap-2">다음 단계로 <ArrowRight className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-white p-8 border border-border-light rounded-sm shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2 text-deep-sage"><MapPin className="w-5 h-5" /><h3 className="font-serif text-xl text-charcoal">기본 배송지 설정</h3></div>
                <p className="text-xs text-muted leading-relaxed">주문 시 매번 주소를 입력할 필요 없이,<br/>자연의 결 산물들을 더 편하게 받아보실 수 있습니다.</p>
                <div className="space-y-3 pt-4">
                  <div className="flex gap-2">
                    <input readOnly value={formData.postcode} placeholder="우편번호" className="w-32 bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                    <button onClick={handleAddressSearch} className="px-6 py-2 bg-charcoal text-white text-xs rounded-sm hover:bg-deep-sage transition-all flex items-center gap-2 font-medium">주소 검색</button>
                  </div>
                  <input readOnly value={formData.address} placeholder="기본 주소" className="w-full bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                  <input name="detailAddress" value={formData.detailAddress} onChange={handleChange} placeholder="상세 주소를 입력해주세요" className="w-full bg-white border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-white border border-border-light py-5 rounded-sm hover:bg-hanji-white transition-all font-serif text-lg">이전</button>
                <button onClick={handleSignUp} disabled={loading} className="flex-[2] bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all font-serif text-lg flex items-center justify-center gap-2">
                  {loading ? '연 맺는 중...' : '가입 완료하기'} <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <Link href="/login" className="text-xs text-muted hover:text-charcoal transition-colors flex items-center justify-center gap-2"><ArrowLeft className="w-3 h-3" /> 이미 계정이 있으신가요? 로그인하기</Link>
        </div>
      </div>
    </div>
  );
}
