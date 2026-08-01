'use client';

import { useEffect, useState, useCallback, Suspense, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Truck, CheckCircle, LogOut, Heart, ShoppingBag, 
  MapPin, User, Save, Plus, Trash2, Star, Loader2, X, 
  ShoppingCart, ChevronRight, ClipboardCheck, MessageSquare, 
  Box, Camera, Edit2, Database, Crown, TrendingUp, ArrowUpRight,
  ShieldCheck, Lock, Key, Eye, EyeOff, Image as ImageIcon, Ticket
} from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CONFIG } from '@/lib/config';
import ProductCard from '@/components/ProductCard';
import OrderItemList from '@/components/mypage/OrderItemList';
import Script from 'next/script';

type ActiveTab = 'orders' | 'wishlist' | 'addresses' | 'profile' | 'coupons';

// 등급별 기준 금액
const TIER_THRESHOLDS = {
  VIP: 200000,
  VVIP: 500000
};

interface UserCoupon {
  id: string;
  is_used: boolean;
  used_at: string | null;
  coupons: {
    code: string;
    discount_type: 'fixed' | 'percent';
    discount_amount: number;
    min_order_amount: number;
    valid_until: string | null;
  } | null;
}

function MyPageContent() {
  const { t, language } = useLanguageStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'orders';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [profile, setProfile] = useState({ 
    full_name: '', 
    phone: '', 
    tier: 'FAMILY', 
    total_spent: 0, 
    points: 0 
  });

  const [isVerified, setIsVerified] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 리뷰 관련 상태
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedReviewProduct] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, content: '' });
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewPreview, setReviewPreview] = useState<string | null>(null);

  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState({
    address_name: '', receiver_name: '', receiver_phone: '', postcode: '', address: '', detail_address: '', is_default: false
  });

  const { items: wishItems, syncWithSupabase } = useWishlistStore();
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const currentUser = session.user;
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const isSuperAdmin = currentUser.email ? CONFIG.ADMIN_EMAILS.includes(currentUser.email) : false;
      setIsAdmin(Boolean(profileData?.is_admin) || isSuperAdmin);
      
      // Fetch total points from ledger view
      const { data: pointData } = await supabase
        .from('user_total_points')
        .select('total_points')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      const metadata = currentUser.user_metadata;
      const socialName = metadata?.full_name || metadata?.name || '';
      
      setProfile({
        full_name: profileData?.full_name || socialName || '',
        phone: profileData?.phone || '',
        tier: profileData?.tier || 'FAMILY',
        total_spent: Number(profileData?.total_spent) || 0,
        points: Number(pointData?.total_points) || Number(profileData?.points) || 0
      });

      if (!profileData) {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: socialName,
          avatar_url: metadata?.avatar_url || '',
          updated_at: new Date().toISOString()
        });
      }

      const { data: orderData } = await supabase
        .from('orders')
        .select(`*, order_items (*, products (*))`)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);
      
      const { data: addrData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', currentUser.id);
      
      if (addrData) {
        const sorted = [...addrData].sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        setAddresses(sorted);
      }

      const { data: couponData } = await supabase
        .from('user_coupons')
        .select('id, is_used, used_at, coupons(code, discount_type, discount_amount, min_order_amount, valid_until)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (couponData) setUserCoupons(couponData as unknown as UserCoupon[]);

      await syncWithSupabase();
    } catch (err: any) { 
      console.error('System Error:', err);
    } finally { 
      setLoading(false); 
    }
  }, [router, syncWithSupabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tierProgress = useMemo(() => {
    const spent = profile.total_spent;
    if (profile.tier === 'VVIP' || spent >= TIER_THRESHOLDS.VVIP) {
      return { current: 100, nextTier: 'MAX', remain: 0 };
    }
    if (spent >= TIER_THRESHOLDS.VIP) {
      const remain = TIER_THRESHOLDS.VVIP - spent;
      const percent = ((spent - TIER_THRESHOLDS.VIP) / (TIER_THRESHOLDS.VVIP - TIER_THRESHOLDS.VIP)) * 100;
      return { current: Math.max(10, percent), nextTier: 'VVIP', remain };
    }
    const remain = TIER_THRESHOLDS.VIP - spent;
    const percent = (spent / TIER_THRESHOLDS.VIP) * 100;
    return { current: Math.max(5, percent), nextTier: 'VIP', remain };
  }, [profile.total_spent, profile.tier]);

  const handleOpenReview = (product: any) => {
    setSelectedReviewProduct(product);
    setReviewData({ rating: 5, content: '' });
    setReviewImage(null);
    setReviewPreview(null);
    setIsReviewModalOpen(true);
  };

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReviewImage(file);
      setReviewPreview(URL.createObjectURL(file));
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      let imageUrl = null;

      if (reviewImage) {
        const fileExt = reviewImage.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `review-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(filePath, reviewImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('reviews').insert({
        product_id: selectedProduct.id,
        user_id: user.id,
        user_name: profile.full_name || '회원',
        rating: reviewData.rating,
        content: reviewData.content,
        photo_url: imageUrl,
        is_verified: true
      });

      if (error) throw error;

      alert('리뷰가 등록되었습니다. 소중한 의견 감사합니다!');
      setIsReviewModalOpen(false);
    } catch (err: any) {
      alert('리뷰 등록 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    setCancellingId(orderId);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (res.ok) { alert('주문이 취소되었습니다.'); fetchData(); }
    } catch (err) { alert('오류가 발생했습니다.'); }
    finally { setCancellingId(null); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({ 
      full_name: profile.full_name, 
      phone: profile.phone, 
      updated_at: new Date().toISOString() 
    }).eq('id', user?.id);
    
    if (error) alert('정보 수정 실패: ' + error.message);
    else {
      alert('회원 정보가 성공적으로 수정되었습니다.');
      setIsVerified(false);
      setActiveTab('orders');
    }
    setIsSaving(false);
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !verifyPassword) return;
    
    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: verifyPassword
      });

      if (error) {
        alert('비밀번호가 일치하지 않습니다. 다시 시도해주세요.');
        setVerifyPassword('');
      } else {
        setIsVerified(true);
      }
    } catch (err) {
      alert('인증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      const provider = user?.app_metadata?.provider;
      if (provider && provider !== 'email') {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        setVerifyPassword('');
      }
    } else {
      setIsVerified(false);
      setVerifyPassword('');
    }
  }, [activeTab, user]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      if (newAddr.is_default) await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      const payload = { ...newAddr, user_id: user.id };
      if (editingAddrId) await supabase.from('addresses').update(payload).eq('id', editingAddrId);
      else await supabase.from('addresses').insert(payload);
      fetchData(); setIsAddrModalOpen(false);
    } catch (err: any) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    localStorage.removeItem('boki_chat_session');
    router.push('/'); 
  };
  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-hanji-white h-screen space-y-6">
      <Loader2 className="w-12 h-12 animate-spin text-deep-sage" />
      <p className="text-sm uppercase tracking-[0.4em] font-black text-muted animate-pulse">Authenticating User...</p>
    </div>
  );
  
  if (!user) return null;

  const tabs = [
    { id: 'orders', label: t.mypage.orderHistory, icon: Package },
    { id: 'coupons', label: '쿠폰함', icon: Ticket },
    { id: 'wishlist', label: t.mypage.wishlist, icon: Heart },
    { id: 'addresses', label: t.mypage.addresses, icon: MapPin },
    { id: 'profile', label: t.mypage.profile, icon: User },
  ];

  return (
    <div className="flex-1 bg-hanji-white py-16 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-8">
            <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden group">
              <User className="w-12 h-12 text-charcoal/20 group-hover:scale-110 transition-transform" />
              {profile.tier !== 'FAMILY' && <Crown className="absolute -top-1 -right-1 w-8 h-8 text-amber-500 fill-current drop-shadow-lg" />}
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="font-serif text-4xl font-bold text-charcoal tracking-tight">{profile.full_name || user.email?.split('@')[0]}님</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border-2 ${profile.tier === 'VVIP' ? 'bg-purple-50 text-purple-600 border-purple-200' : profile.tier === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-charcoal/5 text-charcoal/40 border-charcoal/10'}`}>
                  {profile.tier}
                </span>
              </div>
              <p className="text-muted text-base font-medium opacity-80">자연의 결을 아껴주시는 소중한 회원님입니다.</p>
            </div>
          </div>
          <div className="flex gap-4">
            {isAdmin && <Link href="/admin" className="px-6 py-3 bg-charcoal text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-deep-sage transition-all shadow-xl flex items-center gap-3">Admin Dashboard <ArrowUpRight className="w-4 h-4" /></Link>}
            <button onClick={handleLogout} className="px-8 py-3 border-2 border-border-light text-xs uppercase tracking-[0.2em] hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-3 font-black"><LogOut className="w-4 h-4" /> Logout</button>
          </div>
        </div>

        {/* CRM Dashboard Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          <div className="lg:col-span-2 bg-white border border-border-light p-12 rounded-sm shadow-sm relative overflow-hidden group hover:border-deep-sage transition-colors duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="w-40 h-40" /></div>
            <div className="relative z-10 space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-3">
                  <p className="text-xs text-muted uppercase tracking-[0.2em] font-black">Membership Tier Status</p>
                  <h3 className="font-serif text-3xl text-charcoal">현재 <span className="text-deep-sage font-black underline underline-offset-8 decoration-deep-sage/30">{profile.tier}</span> 등급입니다</h3>
                </div>
                {tierProgress.nextTier !== 'MAX' && (
                  <p className="text-sm text-muted font-medium"><span className="font-black text-charcoal text-base">₩{tierProgress.remain.toLocaleString()}</span> 추가 구매 시 <span className="text-amber-600 font-black">{tierProgress.nextTier}</span> 승급</p>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="h-3 w-full bg-hanji-white rounded-full overflow-hidden border border-border-light shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress.current}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full shadow-lg ${profile.tier === 'VVIP' ? 'bg-purple-500' : 'bg-deep-sage'}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-tighter font-black text-muted/60 px-1">
                  <span className="opacity-100 text-charcoal/40">Family</span>
                  <span className={profile.total_spent >= TIER_THRESHOLDS.VIP ? 'text-deep-sage opacity-100' : ''}>VIP (20만원)</span>
                  <span className={profile.total_spent >= TIER_THRESHOLDS.VVIP ? 'text-purple-500 opacity-100' : ''}>VVIP (50만원)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-charcoal p-12 rounded-sm shadow-2xl flex flex-col justify-between group cursor-pointer hover:bg-deep-sage transition-all duration-700 relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 transition-transform duration-700"><Database className="w-40 h-40 text-white" /></div>
            <div className="space-y-3 relative z-10">
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] font-black">Total Reward Points</p>
              <h3 className="font-serif text-6xl text-white font-bold tracking-tight">₩{profile.points.toLocaleString()}</h3>
            </div>
            <div className="flex items-center gap-3 text-white/60 text-[10px] uppercase tracking-widest font-black mt-10 group-hover:text-white transition-colors relative z-10">
              {language === 'ko' ? '상점으로 가기' : 'Go to Store'} <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-6 md:gap-16 border-b border-border-light mb-16">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} className={`pb-6 px-2 font-serif text-xl md:text-2xl flex items-center gap-3.5 transition-all relative ${activeTab === tab.id ? 'text-charcoal font-bold' : 'text-muted hover:text-charcoal'}`}>
              <tab.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === tab.id ? (tab.id === 'wishlist' ? 'text-terracotta' : 'text-deep-sage') : 'text-muted'}`} /><span className="whitespace-nowrap">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-charcoal" />}
            </button>
          ))}
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'orders' && (
            <OrderItemList 
              orders={orders} 
              onOpenReview={handleOpenReview} 
              onCancelOrder={handleCancelOrder}
              cancellingId={cancellingId}
            />
          )}

          {activeTab === 'coupons' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              <div className="space-y-3">
                <h3 className="font-serif text-4xl text-charcoal tracking-tight">쿠폰함</h3>
                <p className="text-lg text-muted font-medium opacity-80">보유하신 쿠폰 {userCoupons.filter(c => !c.is_used).length}장</p>
              </div>

              {userCoupons.length === 0 ? (
                <div className="py-40 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6 shadow-sm">
                  <div className="w-20 h-20 bg-hanji-white rounded-full flex items-center justify-center text-muted/30 border border-border-light"><Ticket className="w-10 h-10" /></div>
                  <p className="text-muted font-black text-2xl italic">보유 중인 쿠폰이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {userCoupons.map((uc) => {
                    const expired = uc.coupons?.valid_until ? new Date(uc.coupons.valid_until) < new Date() : false;
                    const disabled = uc.is_used || expired;
                    return (
                      <div key={uc.id} className={`p-8 bg-white border-2 rounded-sm flex items-center justify-between gap-6 ${disabled ? 'border-border-light opacity-50' : 'border-deep-sage'}`}>
                        <div className="space-y-2">
                          <p className="font-mono text-xl font-bold text-charcoal">{uc.coupons?.code}</p>
                          <p className="text-sm text-muted">
                            {uc.coupons?.discount_type === 'percent' ? `${uc.coupons?.discount_amount}% 할인` : `${uc.coupons?.discount_amount?.toLocaleString()}원 할인`}
                            {!!uc.coupons?.min_order_amount && ` · ${uc.coupons.min_order_amount.toLocaleString()}원 이상 구매 시`}
                            {uc.coupons?.valid_until && ` · ~${new Date(uc.coupons.valid_until).toLocaleDateString()}까지`}
                          </p>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shrink-0 ${uc.is_used ? 'bg-charcoal/5 text-muted' : expired ? 'bg-terracotta/10 text-terracotta' : 'bg-deep-sage/10 text-deep-sage'}`}>
                          {uc.is_used ? '사용완료' : expired ? '기간만료' : '사용가능'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto">
              <AnimatePresence mode="wait">
                {(!isVerified && user?.app_metadata?.provider === 'email') ? (
                  <motion.div 
                    key="verify"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white border-2 border-border-light p-16 rounded-sm shadow-xl text-center"
                  >
                    <div className="w-24 h-24 bg-hanji-white rounded-full flex items-center justify-center mx-auto mb-10 border border-border-light shadow-inner">
                      <ShieldCheck className="w-12 h-12 text-deep-sage" />
                    </div>
                    <div className="mb-12 space-y-4">
                      <h3 className="font-serif text-4xl text-charcoal">비밀번호 재확인</h3>
                      <p className="text-base text-muted font-medium leading-relaxed opacity-80">
                        회원님의 소중한 정보를 안전하게 보호하기 위해<br />
                        현재 사용 중인 비밀번호를 다시 한번 입력해 주세요.
                      </p>
                    </div>
                    <form onSubmit={handleVerifyPassword} className="space-y-8 text-left max-w-md mx-auto">
                      <div className="space-y-4">
                        <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1">Current Password</label>
                        <input 
                          type="password"
                          required
                          autoFocus
                          value={verifyPassword}
                          onChange={(e) => setVerifyPassword(e.target.value)}
                          className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all shadow-sm"
                          placeholder="비밀번호를 입력하세요"
                        />
                      </div>
                      <div className="flex gap-6 pt-6">
                        <button 
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="flex-1 py-5 border-2 border-border-light text-sm font-black text-muted hover:bg-hanji-white transition-all rounded-sm uppercase tracking-widest shadow-sm"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={isVerifying || !verifyPassword}
                          className="flex-1 bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-4 font-black shadow-2xl disabled:opacity-50 uppercase tracking-widest"
                        >
                          {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Verify Identity'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="edit"
                    initial={isVerified ? { opacity: 0, x: 30 } : { opacity: 1 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white border border-border-light p-16 rounded-sm shadow-lg"
                  >
                    <div className="mb-12 space-y-3">
                      <h3 className="font-serif text-4xl text-charcoal">정보 수정</h3>
                      <p className="text-base text-muted font-medium italic opacity-70">회원님의 소중한 정보를 안전하게 관리합니다.</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-12">
                      <div className="space-y-10">
                        <div className="space-y-4">
                          <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1">{t.checkout.name}</label>
                          <input required value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" placeholder="성함을 입력해 주세요" />
                          <p className="text-xs text-muted/60 ml-1 italic">{t.checkout.nameHelp}</p>
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1">{t.checkout.phone}</label>
                          <input required value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" placeholder="01000000000" />
                          <p className="text-xs text-muted/60 ml-1 italic">{t.checkout.phoneHelp}</p>
                        </div>
                        <div className="space-y-4 opacity-60 bg-hanji-white/20 p-6 rounded-sm border border-border-light border-dashed">
                          <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1">Email Address</label>
                          <div className="w-full text-lg font-mono text-charcoal/60 mt-2">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-6 pt-4">
                        <button 
                          type="button"
                          onClick={() => setIsVerified(false)}
                          className="px-10 py-6 border-2 border-border-light text-sm font-black text-muted hover:bg-hanji-white transition-all rounded-sm shadow-sm"
                        >
                          Back
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-4 font-serif text-2xl shadow-2xl disabled:opacity-50 group">
                          {isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Save className="w-8 h-8 group-hover:scale-110 transition-transform" /> {t.mypage.saveBtn}</>}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                <div className="space-y-3">
                  <h3 className="font-serif text-4xl text-charcoal tracking-tight">배송지 관리</h3>
                  <p className="text-lg text-muted font-medium opacity-80">주문 시 사용할 배송지 정보를 관리합니다.</p>
                </div>
                <button onClick={() => { setEditingAddrId(null); setNewAddr({ address_name: '', receiver_name: '', receiver_phone: '', postcode: '', address: '', detail_address: '', is_default: false }); setIsAddrModalOpen(true); }} className="bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-xl font-black">
                  <Plus className="w-5 h-5" /> {t.mypage.addAddress}
                </button>
              </div>
              
              {addresses.length === 0 ? (
                <div className="py-40 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6 shadow-sm max-w-4xl mx-auto">
                  <div className="w-20 h-20 bg-hanji-white rounded-full flex items-center justify-center text-muted/30 border border-border-light"><MapPin className="w-10 h-10" /></div>
                  <p className="text-muted font-black text-2xl italic">{t.mypage.noAddress}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`p-12 bg-white border-2 rounded-sm relative group transition-all duration-500 shadow-sm ${addr.is_default ? 'border-deep-sage shadow-deep-sage/5' : 'border-border-light hover:border-deep-sage/40'}`}>
                      <div className="flex justify-between items-start mb-10">
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="font-serif text-3xl text-charcoal font-bold tracking-tight">{addr.address_name}</span>
                            {addr.is_default && <span className="bg-deep-sage text-white text-[10px] px-3 py-1 rounded-full uppercase font-black tracking-widest shadow-md">{t.mypage.defaultAddress}</span>}
                          </div>
                          <p className="text-sm text-muted font-bold uppercase tracking-widest opacity-60">{addr.receiver_name}</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => { setEditingAddrId(addr.id); setNewAddr(addr); setIsAddrModalOpen(true); }} className="p-3 text-muted hover:text-deep-sage hover:bg-hanji-white rounded-full transition-all"><Edit2 className="w-5 h-5" /></button>
                          <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('addresses').delete().eq('id', addr.id); fetchData(); } }} className="p-3 text-muted hover:text-terracotta hover:bg-hanji-white rounded-full transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </div>
                      <div className="text-base text-charcoal/80 font-medium leading-relaxed mb-10 space-y-2">
                        <p className="text-lg font-bold">{addr.receiver_phone}</p>
                        <p className="opacity-60">({addr.postcode}) {addr.address}</p>
                        <p className="text-xl font-serif text-charcoal">{addr.detail_address}</p>
                      </div>
                      {!addr.is_default && (<button onClick={async () => { await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id); await supabase.from('addresses').update({ is_default: true }).eq('id', addr.id); fetchData(); }} className="w-full py-4 border-2 border-border-light text-xs text-muted hover:border-deep-sage hover:text-deep-sage transition-all flex items-center justify-center gap-3 rounded-sm uppercase tracking-widest font-black font-sans hover:bg-deep-sage/5">{t.mypage.setDefault}</button>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              {wishItems.length === 0 ? (
                <div className="py-40 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-8 w-full col-span-full shadow-sm max-w-4xl mx-auto">
                  <div className="w-24 h-24 bg-hanji-white rounded-full flex items-center justify-center text-terracotta/20 border border-border-light shadow-inner"><Heart className="w-12 h-12" /></div>
                  <div className="space-y-3 px-6">
                    <p className="text-charcoal font-black text-3xl italic">{t.mypage.noWish}</p>
                    <p className="text-muted text-base font-medium opacity-60">마음에 드는 상품의 하트를 눌러보세요.</p>
                  </div>
                  <Link href="/shop" className="bg-charcoal text-white px-12 py-4 rounded-sm hover:bg-deep-sage transition-all text-sm uppercase tracking-widest font-black shadow-xl">{t.mypage.goToShop}</Link>
                </div>
              ) : (wishItems.map(p => <ProductCard key={p.id} product={p} />))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReviewModalOpen(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="relative w-full max-w-2xl bg-white rounded-sm shadow-2xl p-16 overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-12 pb-6 border-b-2 border-border-light">
                <h3 className="font-serif text-4xl font-bold tracking-tight">리뷰 작성</h3>
                <button onClick={() => setIsReviewModalOpen(false)} className="p-2 hover:rotate-90 transition-transform bg-hanji-white rounded-full shadow-sm"><X className="w-8 h-8 text-charcoal" /></button>
              </div>
              
              <div className="flex gap-8 mb-16 items-center bg-hanji-white/50 p-8 rounded-sm border border-border-light shadow-inner">
                <div className="relative w-20 h-24 bg-white rounded-sm overflow-hidden border border-border-light shadow-md">
                  <Image src={selectedProduct.imageUrl || ''} alt="" fill className="object-cover" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted uppercase tracking-[0.3em] font-black opacity-60">Review Target</p>
                  <h4 className="text-2xl font-serif text-charcoal font-bold leading-tight">{selectedProduct.name}</h4>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-16">
                <div className="text-center space-y-8">
                  <p className="text-xs text-muted uppercase tracking-[0.4em] font-black">Rate your experience</p>
                  <div className="flex justify-center gap-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})} className={`transition-all duration-300 ${reviewData.rating >= star ? 'text-amber-400 scale-125' : 'text-border-light hover:text-amber-200'}`}>
                        <Star className={`w-16 h-16 ${reviewData.rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1 flex items-center gap-3">
                    <ImageIcon className="w-4 h-4" /> Photo Review (Optional)
                  </label>
                  <div className="flex gap-6 items-end">
                    <div className="relative w-32 h-32 bg-hanji-white border-2 border-border-light rounded-sm flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-deep-sage transition-all overflow-hidden group shadow-sm">
                      {reviewPreview ? (
                        <Image src={reviewPreview} alt="Preview" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-muted/40 mb-2 group-hover:text-deep-sage transition-colors" />
                          <span className="text-[10px] font-black text-muted/60 uppercase group-hover:text-deep-sage transition-colors">Add Photo</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleReviewImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    {reviewPreview && (
                      <button type="button" onClick={() => { setReviewImage(null); setReviewPreview(null); }} className="text-xs text-terracotta font-black uppercase tracking-widest pb-2 hover:underline">Remove Image</button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs text-muted uppercase tracking-[0.2em] font-black ml-1">Write your review</label>
                  <textarea required value={reviewData.content} onChange={(e) => setReviewData({...reviewData, content: e.target.value})} placeholder="상품에 대한 진솔한 후기를 남겨주세요. 회원님의 소중한 의견은 큰 힘이 됩니다." rows={6} className="w-full bg-hanji-white/30 border border-border-light px-8 py-6 rounded-sm text-lg focus:border-deep-sage outline-none resize-none transition-all shadow-sm" />
                </div>

                <button type="submit" disabled={isSaving || reviewData.content.length < 5} className="w-full bg-charcoal text-white py-8 rounded-sm hover:bg-deep-sage transition-all font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl disabled:opacity-30 uppercase tracking-widest font-bold">
                  {isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : 'Submit Review'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Modal */}
      <AnimatePresence>
        {isAddrModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddrModalOpen(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-sm shadow-2xl p-16 overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center mb-12 pb-6 border-b-2 border-border-light"><h3 className="font-serif text-4xl font-bold tracking-tight">{editingAddrId ? t.mypage.editAddress : t.mypage.addAddress}</h3><button onClick={() => setIsAddrModalOpen(false)} className="p-2 hover:rotate-90 transition-transform bg-hanji-white rounded-full"><X className="w-8 h-8 text-charcoal" /></button></div>
              <form onSubmit={handleSaveAddress} className="space-y-10">
                <div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{language === 'ko' ? '배송지 별칭' : 'Address Label'}</label><input required value={newAddr.address_name} onChange={(e) => setNewAddr({...newAddr, address_name: e.target.value})} placeholder={t.mypage.addressName} className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8"><div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{t.checkout.name}</label><input required value={newAddr.receiver_name} onChange={(e) => setNewAddr({...newAddr, receiver_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" /></div><div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{t.checkout.phone}</label><input required value={newAddr.receiver_phone} onChange={(e) => setNewAddr({...newAddr, receiver_phone: e.target.value})} placeholder="01000000000" className="w-full bg-hanji-white/30 border border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" /></div></div>
                <div className="space-y-6">
                  <div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{t.checkout.postcode}</label><div className="flex gap-4"><input readOnly required value={newAddr.postcode} placeholder="00000" className="w-full bg-hanji-white/50 border border-border-light px-8 py-5 rounded-sm text-lg font-mono shadow-inner" /><button type="button" onClick={() => { if(typeof window !== 'undefined' && (window as any).daum) new (window as any).daum.Postcode({ oncomplete: (data:any) => setNewAddr(prev => ({ ...prev, postcode: data.zonecode, address: data.address })) }).open(); }} className="px-8 py-3 bg-charcoal text-white text-xs rounded-sm flex items-center gap-3 flex-shrink-0 hover:bg-deep-sage transition-all uppercase font-black tracking-widest shadow-xl">Search</button></div></div>
                  <div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{t.checkout.address}</label><input readOnly required value={newAddr.address} className="w-full bg-hanji-white/50 border border-border-light px-8 py-5 rounded-sm text-lg opacity-80 shadow-inner" /></div>
                  <div className="space-y-4"><label className="text-xs text-muted uppercase font-black ml-1 tracking-widest">{t.checkout.detailAddress}</label><input required value={newAddr.detail_address} onChange={(e) => setNewAddr({...newAddr, detail_address: e.target.value})} placeholder={t.checkout.detailAddress} className="w-full border-2 border-border-light px-8 py-5 rounded-sm text-lg focus:border-deep-sage outline-none transition-all shadow-sm" /></div>
                </div>
                <div className="pt-6"><label className="flex items-center gap-4 cursor-pointer group"><input type="checkbox" checked={newAddr.is_default} onChange={(e) => setNewAddr({...newAddr, is_default: e.target.checked})} className="w-6 h-6 accent-deep-sage cursor-pointer" /><span className="text-base text-muted group-hover:text-charcoal transition-colors font-bold">{t.mypage.setDefault}</span></label></div>
                <button type="submit" disabled={isSaving} className="w-full bg-charcoal text-white py-8 rounded-sm hover:bg-deep-sage transition-all font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl mt-10 uppercase tracking-widest font-bold disabled:opacity-50 group">{isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Save className="w-8 h-8 group-hover:scale-110 transition-transform" /> {t.mypage.saveBtn}</>}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center bg-hanji-white h-screen space-y-6 text-sm uppercase tracking-[0.4em] font-black text-deep-sage animate-pulse">Loading MyPage...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
