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
  ShieldCheck, Lock, Key, Eye, EyeOff
} from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CONFIG } from '@/lib/config';
import ProductCard from '@/components/ProductCard';
import Script from 'next/script';

type ActiveTab = 'orders' | 'wishlist' | 'addresses' | 'profile';

// 등급별 기준 금액
const TIER_THRESHOLDS = {
  VIP: 200000,
  VVIP: 500000
};

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
  const [profile, setProfile] = useState({ 
    full_name: '', 
    phone: '', 
    tier: 'FAMILY', 
    total_spent: 0, 
    points: 0 
  });

  // [추가] 재인증 관련 상태
  const [isVerified, setIsVerified] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedReviewProduct] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, content: '', images: [] as string[] });

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
      setIsAdmin(currentUser.email ? CONFIG.ADMIN_EMAILS.includes(currentUser.email) : false);

      // 1. Profile & CRM Data Load
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      // [개선] DB에 정보가 없거나 부족하면 소셜 메타데이터에서 자동 완성
      const metadata = currentUser.user_metadata;
      const socialName = metadata?.full_name || metadata?.name || '';
      
      setProfile({
        full_name: profileData?.full_name || socialName || '',
        phone: profileData?.phone || '',
        tier: profileData?.tier || 'FAMILY',
        total_spent: Number(profileData?.total_spent) || 0,
        points: Number(profileData?.points) || 0
      });

      // 만약 profiles 테이블에 데이터가 아예 없다면 초기화를 위해 upsert 유도 (선택 사항)
      if (!profileData) {
        console.log('Syncing social metadata to profiles table...');
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: socialName,
          avatar_url: metadata?.avatar_url || '',
          updated_at: new Date().toISOString()
        });
      }

      // 2. Orders Load
      const { data: orderData } = await supabase
        .from('orders')
        .select(`*, order_items (*, products (*))`)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);
      
      // 3. Addresses Load
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

      await syncWithSupabase();
    } catch (err: any) { 
      console.error('System Error:', err);
    } finally { 
      setLoading(false); 
    }
  }, [router, syncWithSupabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 등급 프로그레스 계산
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
    setReviewData({ rating: 5, content: '', images: [] });
    setIsReviewModalOpen(true);
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
      setIsVerified(false); // 수정 후 보안을 위해 재인증 상태 초기화
      setActiveTab('orders'); // 대시보드로 이동
    }
    setIsSaving(false);
  };

  // [추가] 비밀번호 재확인 로직
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !verifyPassword) return;
    
    setIsVerifying(true);
    try {
      // Supabase signInWithPassword를 활용하여 현재 유저의 비밀번호 검증
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

  // 탭 변경 시 리셋 및 자동 패스 로직
  useEffect(() => {
    if (activeTab === 'profile') {
      const provider = user?.app_metadata?.provider;
      // [개선] 소셜 로그인 유저는 즉시 프리패스
      if (provider && provider !== 'email') {
        setIsVerified(true);
      } else {
        // 이메일 유저는 명시적 검증 필요
        setIsVerified(false);
        setVerifyPassword('');
      }
    } else {
      // 다른 탭으로 이동 시 보안을 위해 상태 초기화
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

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-hanji-white h-screen space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-deep-sage" />
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Authenticating User...</p>
    </div>
  );
  
  if (!user) return null;

  const tabs = [
    { id: 'orders', label: '주문 내역', icon: Package },
    { id: 'wishlist', label: '관심 상품', icon: Heart },
    { id: 'addresses', label: '배송지 관리', icon: MapPin },
    { id: 'profile', label: '정보 수정', icon: User },
  ];

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-hanji-white shadow-xl overflow-hidden group">
              <User className="w-10 h-10 text-charcoal/20 group-hover:scale-110 transition-transform" />
              {profile.tier !== 'FAMILY' && <Crown className="absolute -top-1 -right-1 w-6 h-6 text-amber-500 fill-current drop-shadow-md" />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-serif text-3xl font-bold text-charcoal">{profile.full_name || user.email?.split('@')[0]}님</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest uppercase border ${profile.tier === 'VVIP' ? 'bg-purple-50 text-purple-600 border-purple-200' : profile.tier === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-charcoal/5 text-charcoal/40 border-charcoal/10'}`}>
                  {profile.tier}
                </span>
              </div>
              <p className="text-muted text-xs font-light">자연의 결을 아껴주시는 소중한 회원님입니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            {isAdmin && <Link href="/admin" className="px-5 py-2.5 bg-charcoal text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-deep-sage transition-all shadow-lg flex items-center gap-2">Admin Dashboard <ArrowUpRight className="w-3 h-3" /></Link>}
            <button onClick={handleLogout} className="px-6 py-2.5 border border-border-light text-[10px] uppercase tracking-[0.2em] hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2 font-bold"><LogOut className="w-3 h-3" /> Logout</button>
          </div>
        </div>

        {/* CRM Dashboard Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Tier Progress Widget */}
          <div className="lg:col-span-2 bg-white border border-border-light p-10 rounded-sm shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-32 h-32" /></div>
            <div className="relative z-10 space-y-8">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">Membership Tier Status</p>
                  <h3 className="font-serif text-2xl text-charcoal">현재 <span className="text-deep-sage font-bold underline underline-offset-8">{profile.tier}</span> 등급입니다</h3>
                </div>
                {tierProgress.nextTier !== 'MAX' && (
                  <p className="text-xs text-muted font-light"><span className="font-bold text-charcoal">₩{tierProgress.remain.toLocaleString()}</span> 추가 구매 시 <span className="text-amber-600 font-bold">{tierProgress.nextTier}</span> 승급</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="h-2 w-full bg-hanji-white rounded-full overflow-hidden border border-border-light/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgress.current}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${profile.tier === 'VVIP' ? 'bg-purple-500' : 'bg-deep-sage'}`}
                  />
                </div>
                <div className="flex justify-between text-[9px] uppercase tracking-tighter font-bold text-muted/60 px-1">
                  <span>Family</span>
                  <span className={profile.total_spent >= TIER_THRESHOLDS.VIP ? 'text-deep-sage' : ''}>VIP (20만원)</span>
                  <span className={profile.total_spent >= TIER_THRESHOLDS.VVIP ? 'text-purple-500' : ''}>VVIP (50만원)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Points Widget */}
          <div className="bg-charcoal p-10 rounded-sm shadow-xl flex flex-col justify-between group cursor-pointer hover:bg-deep-sage transition-all duration-500 relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform duration-700"><Database className="w-32 h-32 text-white" /></div>
            <div className="space-y-2 relative z-10">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Total Reward Points</p>
              <h3 className="font-serif text-5xl text-white">₩{profile.points.toLocaleString()}</h3>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-[9px] uppercase tracking-widest font-bold mt-8 group-hover:text-white transition-colors relative z-10">
              Go to Store <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 md:gap-12 border-b border-border-light mb-12">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} className={`pb-4 px-2 font-serif text-lg md:text-xl flex items-center gap-2.5 transition-all relative ${activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}>
              <tab.icon className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === tab.id ? (tab.id === 'wishlist' ? 'text-terracotta' : 'text-deep-sage') : 'text-muted'}`} /><span className="whitespace-nowrap">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'orders' && (
            <section className="space-y-10">
              {orders.length === 0 ? (
                <div className="py-32 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 bg-hanji-white rounded-full flex items-center justify-center text-muted"><Package className="w-8 h-8" /></div>
                  <p className="text-muted font-light italic">아직 주문 내역이 없습니다.</p>
                  <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-widest flex items-center gap-2 font-bold"><ShoppingCart className="w-3.5 h-3.5" /> 상점 구경하기 <ChevronRight className="w-3 h-3" /></Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-hanji-white/50 px-8 py-5 border-b border-border-light flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div className="flex items-center gap-8">
                        <div className="space-y-1"><p className="text-[9px] text-muted uppercase tracking-widest font-bold">Order Date</p><p className="text-sm font-medium">{new Date(order.created_at).toLocaleDateString()}</p></div>
                        <div className="space-y-1"><p className="text-[9px] text-muted uppercase tracking-widest font-bold">Order ID</p><p className="text-sm text-charcoal/60 font-mono tracking-tighter">{order.id.slice(0, 12).toUpperCase()}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                          order.status === '배송완료' ? 'bg-charcoal text-white border-charcoal' :
                          order.status === '배송중' ? 'bg-deep-sage text-white border-deep-sage' :
                          order.status === '배송준비중' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-hanji-white text-muted border-border-light'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-8 space-y-8">
                      {order.order_items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                          <div className="flex gap-8">
                            <div className="relative w-24 h-28 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0"><Image src={item.products?.imageUrl || ''} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" /></div>
                            <div className="space-y-2 py-1">
                              <h4 className="text-xl font-serif text-charcoal tracking-tight">{item.products?.name}</h4>
                              <p className="text-sm text-muted font-light">{item.quantity}개 / ₩{item.price.toLocaleString()}</p>
                              <div className="pt-4 flex gap-3">
                                {order.status === '배송완료' && (
                                  <button onClick={() => handleOpenReview(item.products)} className="text-[10px] bg-white border border-charcoal text-charcoal px-4 py-2 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all font-bold uppercase tracking-widest"><Camera className="w-3.5 h-3.5" /> Post Review</button>
                                )}
                                <button onClick={() => router.push(`/shop/${item.products?.id}`)} className="text-[10px] border border-border-light text-muted px-4 py-2 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all uppercase tracking-widest"><Box className="w-3.5 h-3.5" /> Reorder</button>
                              </div>
                            </div>
                          </div>
                          <div className="flex md:flex-col gap-3">
                            <Link href="/support" className="text-[10px] border border-border-light text-charcoal/60 px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all uppercase tracking-widest min-w-[140px] justify-center font-bold font-sans">
                              <MessageSquare className="w-3.5 h-3.5" /> 1:1 Inquiry
                            </Link>
                            {order.status === '배송중' && (
                              <button className="text-[10px] bg-deep-sage text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:opacity-90 transition-all uppercase tracking-widest min-w-[140px] justify-center font-bold font-sans shadow-lg">
                                <Truck className="w-3.5 h-3.5" /> Track Package
                              </button>
                            )}
                            {order.status === '결제완료' && (
                              <button onClick={() => handleCancelOrder(order.id)} disabled={cancellingId === order.id} className="text-[10px] text-terracotta/60 hover:text-terracotta transition-colors uppercase tracking-[0.2em] font-bold py-2 text-center disabled:opacity-30 underline underline-offset-4 decoration-terracotta/20">
                                {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                {(!isVerified && user?.app_metadata?.provider === 'email') ? (
                  /* 이메일 사용자 전용 비밀번호 재확인 뷰 */
                  <motion.div 
                    key="verify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-border-light p-12 rounded-sm shadow-sm text-center"
                  >
                    <div className="w-20 h-20 bg-hanji-white rounded-full flex items-center justify-center mx-auto mb-8">
                      <ShieldCheck className="w-10 h-10 text-deep-sage" />
                    </div>
                    <div className="mb-10 space-y-3">
                      <h3 className="font-serif text-3xl text-charcoal">비밀번호 재확인</h3>
                      <p className="text-sm text-muted font-light leading-relaxed">
                        개인정보를 안전하게 보호하기 위해<br />
                        현재 사용 중인 비밀번호를 다시 한번 입력해 주세요.
                      </p>
                    </div>
                    <form onSubmit={handleVerifyPassword} className="space-y-6 text-left">
                      <div className="space-y-3">
                        <label className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold ml-1">Current Password</label>
                        <input 
                          type="password"
                          required
                          autoFocus
                          value={verifyPassword}
                          onChange={(e) => setVerifyPassword(e.target.value)}
                          className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all"
                          placeholder="비밀번호를 입력하세요"
                        />
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="flex-1 py-4 border border-border-light text-sm font-bold text-muted hover:bg-hanji-white transition-all rounded-sm uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={isVerifying || !verifyPassword}
                          className="flex-1 bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 font-bold shadow-xl disabled:opacity-50 uppercase tracking-widest"
                        >
                          {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Identity'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  /* 소셜 로그인 사용자 또는 인증 완료된 이메일 사용자용 수정 폼 (즉시 렌더링) */
                  <motion.div 
                    key="edit"
                    initial={isVerified ? { opacity: 0, x: 20 } : { opacity: 1 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white border border-border-light p-12 rounded-sm shadow-sm"
                  >
                    <div className="mb-10 space-y-2">
                      <h3 className="font-serif text-3xl text-charcoal">정보 수정</h3>
                      <p className="text-xs text-muted font-light italic">회원님의 소중한 정보를 안전하게 관리합니다.</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-10">
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold ml-1">Full Name</label>
                          <input required value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" placeholder="성함을 입력해 주세요" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold ml-1">Phone Number</label>
                          <input required value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" placeholder="010-0000-0000" />
                        </div>
                        <div className="space-y-3 opacity-50">
                          <label className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold ml-1">Email Address</label>
                          <div className="w-full bg-hanji-white/10 border border-border-light px-6 py-4 rounded-sm text-sm font-mono">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setIsVerified(false)}
                          className="px-8 py-5 border border-border-light text-sm font-bold text-muted hover:bg-hanji-white transition-all rounded-sm"
                        >
                          Back
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 font-serif text-xl shadow-xl disabled:opacity-50">
                          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> Save Changes</>}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl text-charcoal">배송지 관리</h3>
                  <p className="text-xs text-muted font-light">주문 시 사용할 배송지 정보를 관리합니다.</p>
                </div>
                <button onClick={() => { setEditingAddrId(null); setNewAddr({ address_name: '', receiver_name: '', receiver_phone: '', postcode: '', address: '', detail_address: '', is_default: false }); setIsAddrModalOpen(true); }} className="bg-charcoal text-white px-8 py-3.5 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg font-bold">
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              </div>
              
              {addresses.length === 0 ? (
                <div className="py-32 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-4">
                  <p className="text-muted font-light italic">등록된 배송지가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`p-10 bg-white border rounded-sm relative group transition-all ${addr.is_default ? 'border-deep-sage shadow-md' : 'border-border-light hover:border-deep-sage/40'}`}>
                      <div className="flex justify-between items-start mb-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-serif text-2xl text-charcoal">{addr.address_name}</span>
                            {addr.is_default && <span className="bg-deep-sage text-white text-[8px] px-2.5 py-1 rounded-full uppercase font-extrabold tracking-widest">Default</span>}
                          </div>
                          <p className="text-xs text-muted font-light uppercase tracking-widest">{addr.receiver_name}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingAddrId(addr.id); setNewAddr(addr); setIsAddrModalOpen(true); }} className="p-2 text-muted hover:text-deep-sage transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={async () => { if(confirm('삭제하시겠습니까?')) { await supabase.from('addresses').delete().eq('id', addr.id); fetchData(); } }} className="p-2 text-muted hover:text-terracotta transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="text-sm text-charcoal/80 font-light leading-relaxed mb-8">
                        <p className="mb-1">{addr.receiver_phone}</p>
                        <p className="opacity-60">({addr.postcode}) {addr.address}</p>
                        <p>{addr.detail_address}</p>
                      </div>
                      {!addr.is_default && (<button onClick={async () => { await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id); await supabase.from('addresses').update({ is_default: true }).eq('id', addr.id); fetchData(); }} className="w-full py-3 border border-border-light text-[10px] text-muted hover:border-deep-sage hover:text-deep-sage transition-all flex items-center justify-center gap-2 rounded-sm uppercase tracking-widest font-bold font-sans">Set as Default</button>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {wishItems.length === 0 ? (
                <div className="py-32 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6 w-full col-span-full">
                  <div className="w-16 h-16 bg-hanji-white rounded-full flex items-center justify-center text-muted"><Heart className="w-8 h-8" /></div>
                  <p className="text-muted font-light italic">관심 상품이 비어 있습니다.</p>
                  <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-widest font-bold">Explore Collection</Link>
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
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white rounded-sm shadow-2xl p-12 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light"><h3 className="font-serif text-3xl">리뷰 작성</h3><button onClick={() => setIsReviewModalOpen(false)} className="p-1 hover:rotate-90 transition-transform"><X className="w-7 h-7" /></button></div>
              <div className="flex gap-6 mb-12 items-center bg-hanji-white/30 p-6 rounded-sm border border-border-light"><div className="relative w-16 h-20 bg-white rounded-sm overflow-hidden border border-border-light shadow-sm"><Image src={selectedProduct.imageUrl || ''} alt="" fill className="object-cover" /></div><div><p className="text-[10px] text-muted uppercase tracking-widest mb-1 font-bold">Review Target</p><h4 className="text-xl font-serif text-charcoal">{selectedProduct.name}</h4></div></div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                await supabase.from('reviews').insert({ product_id: selectedProduct.id, user_id: user.id, user_name: profile.full_name || '회원', rating: reviewData.rating, content: reviewData.content, is_verified: true });
                setIsReviewModalOpen(false); setIsSaving(false); alert('리뷰가 등록되었습니다.');
              }} className="space-y-12">
                <div className="text-center space-y-6"><p className="text-[10px] text-muted uppercase tracking-[0.3em] font-bold">Rate your experience</p><div className="flex justify-center gap-4">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})} className={`transition-all ${reviewData.rating >= star ? 'text-deep-sage scale-110' : 'text-border-light hover:text-deep-sage/40'}`}><Star className={`w-12 h-12 ${reviewData.rating >= star ? 'fill-current' : ''}`} /></button>))}</div></div>
                <div className="space-y-3"><label className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold ml-1">Write your review</label><textarea required value={reviewData.content} onChange={(e) => setReviewData({...reviewData, content: e.target.value})} placeholder="상품에 대한 진솔한 후기를 남겨주세요." rows={6} className="w-full bg-hanji-white/30 border border-border-light px-6 py-5 rounded-sm text-sm focus:border-deep-sage outline-none resize-none transition-all" /></div>
                <button type="submit" disabled={isSaving || reviewData.content.length < 5} className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all font-serif text-xl flex items-center justify-center gap-3 shadow-xl disabled:opacity-30 uppercase tracking-widest">Complete Review</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Modal */}
      <AnimatePresence>
        {isAddrModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddrModalOpen(false)} className="absolute inset-0 bg-charcoal/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-sm shadow-2xl p-12 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light"><h3 className="font-serif text-3xl">{editingAddrId ? 'Address Edit' : 'New Address'}</h3><button onClick={() => setIsAddrModalOpen(false)} className="p-1 hover:rotate-90 transition-transform"><X className="w-7 h-7" /></button></div>
              <form onSubmit={handleSaveAddress} className="space-y-8">
                <div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Label</label><input required value={newAddr.address_name} onChange={(e) => setNewAddr({...newAddr, address_name: e.target.value})} placeholder="e.g. Home, Office" className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" /></div>
                <div className="grid grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Receiver</label><input required value={newAddr.receiver_name} onChange={(e) => setNewAddr({...newAddr, receiver_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" /></div><div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Contact</label><input required value={newAddr.receiver_phone} onChange={(e) => setNewAddr({...newAddr, receiver_phone: e.target.value})} placeholder="010-0000-0000" className="w-full bg-hanji-white/30 border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" /></div></div>
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Zip Code</label><div className="flex gap-3"><input readOnly required value={newAddr.postcode} placeholder="00000" className="w-full bg-hanji-white/50 border border-border-light px-6 py-4 rounded-sm text-sm font-mono" /><button type="button" onClick={() => { if(typeof window !== 'undefined' && (window as any).daum) new (window as any).daum.Postcode({ oncomplete: (data:any) => setNewAddr(prev => ({ ...prev, postcode: data.zonecode, address: data.address })) }).open(); }} className="px-6 py-2 bg-charcoal text-white text-[10px] rounded-sm flex items-center gap-2 flex-shrink-0 hover:bg-deep-sage transition-all uppercase font-bold tracking-widest">Search</button></div></div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Address</label><input readOnly required value={newAddr.address} className="w-full bg-hanji-white/50 border border-border-light px-6 py-4 rounded-sm text-sm opacity-80" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase font-bold ml-1 tracking-widest">Detail</label><input required value={newAddr.detail_address} onChange={(e) => setNewAddr({...newAddr, detail_address: e.target.value})} placeholder="Detail address info" className="w-full border border-border-light px-6 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" /></div>
                </div>
                <div className="pt-4"><label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={newAddr.is_default} onChange={(e) => setNewAddr({...newAddr, is_default: e.target.checked})} className="w-5 h-5 accent-deep-sage cursor-pointer" /><span className="text-xs text-muted group-hover:text-charcoal transition-colors font-medium">Set as default shipping address.</span></label></div>
                <button type="submit" disabled={isSaving} className="w-full bg-charcoal text-white py-6 rounded-sm hover:bg-deep-sage transition-all font-serif text-xl flex items-center justify-center gap-3 shadow-xl mt-6 uppercase tracking-widest disabled:opacity-50">{isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} Save Address</button>
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
    <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center bg-hanji-white h-screen space-y-4 text-xs uppercase tracking-[0.3em] font-bold text-deep-sage">Loading MyPage...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
