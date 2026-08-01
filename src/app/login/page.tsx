'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, Lock, Loader2, Chrome, AlertCircle, User, Phone, Check, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isFindId, setIsFindId] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [foundEmailMasked, setFoundEmailMasked] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');
  const authError = searchParams.get('error');

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.refresh();
        router.push(redirectedFrom || '/');
      }
    };
    checkUser();
  }, [router, redirectedFrom]);

  useEffect(() => {
    if (authError === 'oauth_denied') {
      setErrorMsg('간편 로그인이 취소되었거나 거부되었습니다. 다시 시도해 주세요.');
    } else if (authError === 'auth_failed') {
      setErrorMsg('로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.');
    }
  }, [authError]);

  /**
   * Supabase Auth 에러 메시지를 한국어로 번역합니다.
   */
  const getErrorMessage = (message: string) => {
    if (message.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 일치하지 않습니다.';
    }
    if (message.includes('Email not confirmed')) {
      return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.';
    }
    if (message.includes('User not found')) {
      return '등록되지 않은 계정입니다.';
    }
    if (message.includes('Rate limit exceeded')) {
      return '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해 주세요.';
    }
    return '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(getErrorMessage(error.message));
        return;
      }
      
      if (data.session?.user) {
        await syncGuestData(data.session.user.id);
      }

      router.refresh();
      router.push(redirectedFrom || '/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(getErrorMessage(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const syncGuestData = async (userId: string) => {
    try {
      // 1. Cart Sync
      // 주의: cart_items 테이블은 option_name/option_price가 아니라 product_options.id를
      // 참조하는 option_id 컬럼을 쓰고, (user_id, product_id, option_id)에 대한 unique
      // 제약조건도 없습니다. 그래서 각 아이템마다 실제 option_id를 조회하고,
      // upsert 대신 있으면 수량을 더하고 없으면 새로 넣는 방식으로 처리합니다.
      const cartStore = useCartStore.getState();
      for (const item of cartStore.items) {
        let optionId: string | null = null;
        if (item.optionName) {
          const { data: optionRow } = await supabase
            .from('product_options')
            .select('id')
            .eq('product_id', item.id)
            .eq('option_name', item.optionName)
            .maybeSingle();
          optionId = optionRow?.id ?? null;
        }

        let existingQuery = supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', userId)
          .eq('product_id', item.id);
        existingQuery = optionId
          ? existingQuery.eq('option_id', optionId)
          : existingQuery.is('option_id', null);
        const { data: existing } = await existingQuery.maybeSingle();

        if (existing) {
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + item.quantity })
            .eq('id', existing.id);
        } else {
          await supabase.from('cart_items').insert({
            user_id: userId,
            product_id: item.id,
            option_id: optionId,
            quantity: item.quantity,
          });
        }
      }

      // 2. Wishlist Sync
      const wishlistStore = useWishlistStore.getState();
      if (wishlistStore.items.length > 0) {
        const wishlistToInsert = wishlistStore.items.map(p => ({
          user_id: userId,
          product_id: p.id
        }));

        await supabase.from('wishlists').upsert(wishlistToInsert, {
          onConflict: 'user_id, product_id'
        });
      }

      // 3. Clear Local and Alert
      if (cartStore.items.length > 0 || wishlistStore.items.length > 0) {
        cartStore.clearCart();
        // Wishlist is synced automatically on setUserId in most cases, but we explicitly moved it here
        // so we ensure local state reflects DB.
        alert('장바구니와 관심상품이 계정으로 안전하게 옮겨졌습니다.');
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        setErrorMsg(getErrorMessage(error.message));
        return;
      }

      setResetSent(true);
      alert('비밀번호 재설정 링크가 이메일로 발송되었습니다. (스팸함을 확인해주세요.)');
    } catch (err: any) {
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;
    setIsLoading(true);
    setErrorMsg('');
    setFoundEmailMasked(null);

    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone: phone.replace(/[^0-9]/g, '') }),
      });

      const result = await res.json();
      if (res.ok) {
        // 실제 API는 마스킹된 것만 주지만, 고도화를 위해 unmaskedEmail을 받는다고 가정하거나 
        // 또는 보안상 마스킹된 것만 보여주고 '이메일로 받기'는 서버에서 처리
        setFoundEmailMasked(result.email);
      } else {
        setErrorMsg(result.error || '일치하는 회원 정보가 없습니다.');
      }
    } catch (err) {
      setErrorMsg('아이디 찾기 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFullIdEmail = async () => {
    if (emailSent) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-id-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone: phone.replace(/[^0-9]/g, '') }),
      });
      if (res.ok) {
        setEmailSent(true);
        alert('가입하신 이메일로 전체 아이디가 발송되었습니다.');
      } else {
        const result = await res.json();
        alert(result.error || '발송 실패');
      }
    } catch (err) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSocialLogin = async (e: React.MouseEvent, provider: 'google') => {
    e.preventDefault();
    if (socialLoading) return;

    setSocialLoading(provider);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom || '/')}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error(`[OAuth Error] ${provider}:`, error.message);
        alert(`로그인 실패 (${provider}): ${getErrorMessage(error.message)}`);
        setSocialLoading(null);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[OAuth Exception] ${provider}:`, msg);
      alert(`시스템 오류가 발생했습니다: ${msg}`);
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
          <h1 className="font-serif text-2xl text-charcoal mb-2">
            {isForgotPassword ? '비밀번호를 잊으셨나요?' : isFindId ? '아이디가 생각나지 않으세요?' : '다시 만나서 반가워요'}
          </h1>
          <p className="text-sm text-muted">
            {isForgotPassword ? '가입하신 이메일로 재설정 링크를 보내드립니다.' : isFindId ? '가입 시 입력한 이름과 연락처로 찾을 수 있습니다.' : '당신의 일상에 자연의 결을 더해보세요.'}
          </p>
        </div>

        <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
          {!isForgotPassword && !isFindId ? (
            <>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Email Address</label>
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
                  <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Password</label>
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
                  <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1.5 px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => { setIsFindId(true); setErrorMsg(''); }}
                      className="text-[13px] whitespace-nowrap text-muted hover:text-charcoal hover:underline"
                    >
                      아이디 찾기
                    </button>
                    <span className="text-[13px] text-border-light">|</span>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setErrorMsg(''); }}
                      className="text-[13px] whitespace-nowrap text-muted hover:text-charcoal hover:underline"
                    >
                      비밀번호 찾기
                    </button>
                    <span className="text-[13px] text-border-light">|</span>
                    <Link
                      href="/guest-order"
                      className="text-[13px] whitespace-nowrap text-deep-sage font-bold hover:underline"
                    >
                      비회원 주문조회
                    </Link>
                  </div>
                </div>

                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="flex items-center gap-3 p-4 rounded-sm bg-terracotta/5 border border-terracotta/10"
                  >
                    <AlertCircle className="w-4 h-4 text-terracotta flex-shrink-0" />
                    <p className="text-sm text-terracotta font-medium leading-relaxed">
                      {errorMsg}
                    </p>
                  </motion.div>
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
                <span className="relative bg-white px-4 text-[13px] text-muted uppercase tracking-widest">Or Continue With</span>
              </div>

              <button
                type="button"
                disabled={isAnyLoading}
                onClick={(e) => handleSocialLogin(e, 'google')}
                className="w-full flex items-center justify-center gap-3 py-3.5 border border-border-light rounded-sm hover:bg-hanji-white transition-colors text-sm font-bold uppercase tracking-widest disabled:opacity-50"
              >
                {socialLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin text-[#4285F4]" /> : <Chrome className="w-5 h-5 text-[#4285F4]" />}
                Google로 계속하기
              </button>
            </>
          ) : isFindId ? (
            <div className="space-y-6">
              {foundEmailMasked ? (
                <div className="text-center py-8 space-y-8">
                  <div className="w-16 h-16 bg-deep-sage/10 rounded-full flex items-center justify-center mx-auto">
                    <User className="w-8 h-8 text-deep-sage" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl text-charcoal font-bold">아이디를 찾았습니다</h3>
                    <p className="text-sm text-muted leading-relaxed">
                      회원님의 아이디(이메일)는<br/>
                      <strong className="text-deep-sage text-lg">{foundEmailMasked}</strong> 입니다.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => { setIsFindId(false); setFoundEmailMasked(null); }}
                      className="w-full bg-charcoal text-white py-4 rounded-xl font-bold hover:bg-deep-sage transition-all shadow-lg text-sm"
                    >
                      로그인하러 가기
                    </button>
                    <button 
                      disabled={emailSent || isLoading}
                      onClick={handleSendFullIdEmail}
                      className="w-full flex items-center justify-center gap-2 text-sm text-muted font-bold py-2 hover:text-charcoal transition-colors disabled:opacity-50"
                    >
                      {emailSent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {emailSent ? '발송 완료' : '전체 아이디 이메일로 받기'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFindId} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                        <input 
                          required
                          type="text" 
                          disabled={isLoading}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="성함"
                          className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                        <input 
                          required
                          type="tel" 
                          disabled={isLoading}
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="010-0000-0000"
                          maxLength={13}
                          className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      className="flex items-center gap-3 p-4 rounded-sm bg-terracotta/5 border border-terracotta/10"
                    >
                      <AlertCircle className="w-4 h-4 text-terracotta flex-shrink-0" />
                      <p className="text-sm text-terracotta font-medium leading-relaxed">
                        {errorMsg}
                      </p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <button 
                      type="submit" 
                      disabled={isLoading || !fullName || phone.length < 12}
                      className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>아이디 찾기 <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsFindId(false)}
                      className="w-full text-sm text-muted hover:text-charcoal transition-colors uppercase tracking-widest font-bold"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {resetSent ? (
                <div className="text-center py-8 space-y-6">
                  <div className="w-16 h-16 bg-deep-sage/10 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-deep-sage" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl text-charcoal font-bold">이메일을 확인해주세요</h3>
                    <p className="text-sm text-muted leading-relaxed">
                      비밀번호 재설정 링크를 <strong>{email}</strong> 주소로 보냈습니다.<br/>
                      메일이 오지 않았다면 스팸함을 확인해 보세요.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                    className="text-sm text-deep-sage font-bold border-b border-deep-sage pb-0.5 hover:text-charcoal hover:border-charcoal transition-colors"
                  >
                    로그인 화면으로 돌아가기
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                      <input 
                        required
                        type="email" 
                        disabled={isLoading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm disabled:opacity-50"
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
                      <p className="text-sm text-terracotta font-medium leading-relaxed">
                        {errorMsg}
                      </p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <button 
                      type="submit" 
                      disabled={isLoading || !email}
                      className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all duration-300 font-medium flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>재설정 링크 보내기 <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="w-full text-sm text-muted hover:text-charcoal transition-colors uppercase tracking-widest font-bold"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-hanji-white py-20 min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-deep-sage" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
