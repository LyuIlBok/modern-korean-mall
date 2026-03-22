'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle, LogOut, ShieldCheck, Heart, ShoppingBag, ExternalLink, MapPin, User, Save, Plus, Trash2, Star, Search, Loader2, X, ShoppingCart, ChevronRight, ClipboardCheck, MessageSquare, Box, Camera, AlertCircle } from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CONFIG } from '@/lib/config';
import ProductCard from '@/components/ProductCard';
import Script from 'next/script';

type ActiveTab = 'orders' | 'wishlist' | 'addresses' | 'profile';

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
  const [profile, setProfile] = useState({ full_name: '', phone: '' });
  const [orderCounts, setOrderCounts] = useState({ pending: 0, shipping: 0, completed: 0 });

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedReviewProduct] = useState<any>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, content: '', images: [] as string[] });

  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [newAddr, setNewAddr] = useState({
    address_name: '', receiver_name: '', receiver_phone: '', postcode: '', address: '', detail_address: '', is_default: false
  });

  const { items: wishItems, syncWithSupabase } = useWishlistStore();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const currentUser = session.user;
      setUser(currentUser);
      setIsAdmin(CONFIG.ADMIN_EMAILS.includes(currentUser.email || ''));

      // 1. Orders
      const { data: orderData } = await supabase.from('orders').select(`*, order_items (*, products (*))`).eq('user_id', currentUser.id).order('created_at', { ascending: false });
      if (orderData) {
        setOrders(orderData);
        setOrderCounts({
          pending: orderData.filter(o => o.status === '결제완료').length,
          shipping: orderData.filter(o => o.status === '배송중').length,
          completed: orderData.filter(o => o.status === '배송완료').length
        });
      }

      // 2. Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      if (profileData) setProfile({ full_name: profileData.full_name || '', phone: profileData.phone || '' });

      // 3. Addresses
      const { data: addrData } = await supabase.from('addresses').select('*').eq('user_id', currentUser.id).order('is_default', { ascending: false }).order('created_at', { ascending: false });
      setAddresses(addrData || []);

      await syncWithSupabase();
    } catch (err) { console.error('Data load error:', err); } finally { setLoading(false); }
  }, [router, syncWithSupabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchData();
  };

  const handleOpenReview = (product: any) => {
    setSelectedReviewProduct(product);
    setReviewData({ rating: 5, content: '', images: [] });
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    setIsSaving(true);
    try {
      await supabase.from('reviews').insert({ product_id: selectedProduct.id, user_id: user.id, user_name: profile.full_name || user.email?.split('@')[0], rating: reviewData.rating, content: reviewData.content, is_verified: true });
      setIsReviewModalOpen(false);
      alert(language === 'ko' ? '리뷰가 등록되었습니다.' : 'Review submitted.');
    } catch (err) { alert('Error submitting review'); }
    finally { setIsSaving(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await supabase.from('profiles').upsert({ id: user?.id, full_name: profile.full_name, phone: profile.phone, updated_at: new Date().toISOString() });
      alert(language === 'ko' ? '정보가 저장되었습니다.' : 'Profile updated.');
    } catch (err) { alert('Error updating profile'); }
    finally { setIsSaving(false); }
  };

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => setNewAddr(prev => ({ ...prev, postcode: data.zonecode, address: data.address }))
      }).open();
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (newAddr.is_default) await supabase.from('addresses').update({ is_default: false }).eq('user_id', user?.id);
      await supabase.from('addresses').insert({ user_id: user?.id, ...newAddr });
      setIsAddrModalOpen(false);
      setNewAddr({ address_name: '', receiver_name: '', receiver_phone: '', postcode: '', address: '', detail_address: '', is_default: false });
      fetchData();
    } catch (err) { alert('Error saving address'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Delete this address?')) return;
    await supabase.from('addresses').delete().eq('id', id);
    fetchData();
  };

  const handleSetDefaultAddress = async (id: string) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user?.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    fetchData();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white h-screen text-xs uppercase tracking-widest text-deep-sage">{t.common.loading}</div>;
  if (!user) return null;

  const tabs = [
    { id: 'orders', label: t?.mypage?.orderHistory || (language === 'ko' ? '주문 내역' : 'Orders'), icon: Package },
    { id: 'wishlist', label: t?.mypage?.wishlist || (language === 'ko' ? '관심 상품' : 'Wishlist'), icon: Heart },
    { id: 'addresses', label: t?.mypage?.addresses || (language === 'ko' ? '배송지 관리' : 'Addresses'), icon: MapPin },
    { id: 'profile', label: t?.mypage?.profile || (language === 'ko' ? '내 정보 수정' : 'Profile'), icon: User },
  ];

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border-light pb-8">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">{t.mypage.title}</h1>
            <p className="text-muted text-sm font-light"><span className="font-medium text-deep-sage border-b border-deep-sage/30 pb-0.5">{profile.full_name || user.email}</span> {language === 'ko' ? ' 님, 반갑습니다.' : ' welcome back.'}</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && <Link href="/admin" className="px-4 py-2 bg-deep-sage/10 text-deep-sage rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-deep-sage hover:text-white transition-all border border-deep-sage/20">Admin Access</Link>}
            <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="px-6 py-2.5 border border-border-light text-[10px] uppercase tracking-[0.2em] hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2"><LogOut className="w-3 h-3" /> {t.common.logout}</button>
          </div>
        </div>

        {/* Dashboard */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-border-light rounded-sm p-8 mb-12 shadow-sm">
            <div className="grid grid-cols-3 divide-x divide-border-light">
              <div className="text-center space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">결제완료</p><p className="text-3xl font-serif font-bold text-charcoal">{orderCounts.pending}</p></div>
              <div className="text-center space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">배송중</p><p className="text-3xl font-serif font-bold text-deep-sage">{orderCounts.shipping}</p></div>
              <div className="text-center space-y-2"><p className="text-[10px] text-muted uppercase tracking-widest">배송완료</p><p className="text-3xl font-serif font-bold text-charcoal">{orderCounts.completed}</p></div>
            </div>
          </div>
        )}

        {/* Tabs */}
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
                  <p className="text-muted font-light italic">{t.mypage.noOrder}</p>
                  <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5" /> {t.mypage.goToShop} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                    <div className="bg-hanji-white/50 px-8 py-5 border-b border-border-light flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div className="flex items-center gap-6">
                        <div className="space-y-1"><p className="text-[9px] text-muted uppercase tracking-widest">주문일자</p><p className="text-sm font-medium">{new Date(order.created_at).toLocaleDateString()}</p></div>
                        <div className="space-y-1"><p className="text-[9px] text-muted uppercase tracking-widest">주문번호</p><p className="text-sm text-charcoal/60 font-mono">{order.id.slice(0, 8).toUpperCase()}</p></div>
                      </div>
                      <div className="flex items-center gap-2"><span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${order.status === '배송중' ? 'bg-deep-sage text-white' : order.status === '배송완료' ? 'bg-charcoal text-white' : 'bg-charcoal/5 text-charcoal/60'}`}>{order.status}</span></div>
                    </div>
                    <div className="p-8 space-y-8">
                      {order.order_items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                          <div className="flex gap-6">
                            <div className="relative w-20 h-24 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0"><Image src={item.products?.imageUrl || ''} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                            <div className="space-y-2"><h4 className="text-lg font-serif text-charcoal">{item.products?.name}</h4><p className="text-sm text-muted font-light">{item.quantity} 개 / ₩{item.price.toLocaleString()}</p><div className="pt-2 flex gap-2">{order.status === '배송완료' && (<button onClick={() => handleOpenReview(item.products)} className="text-[10px] border border-deep-sage text-deep-sage px-3 py-1.5 rounded-sm flex items-center gap-1.5 hover:bg-deep-sage hover:text-white transition-all font-medium"><MessageSquare className="w-3 h-3" /> 리뷰 쓰기</button>)}<button onClick={() => router.push(`/shop/${item.products?.id}`)} className="text-[10px] border border-border-light px-3 py-1.5 rounded-sm flex items-center gap-1.5 hover:bg-hanji-white transition-all text-charcoal/60"><Box className="w-3 h-3" /> 재구매</button></div></div>
                          </div>
                          <div className="flex md:flex-col gap-2">{order.status === '결제완료' && (<><button onClick={() => handleUpdateStatus(order.id, '배송완료')} className="text-[10px] bg-deep-sage/10 text-deep-sage px-5 py-2.5 rounded-sm flex items-center gap-2 hover:bg-deep-sage hover:text-white transition-all uppercase tracking-widest min-w-[120px] justify-center"><CheckCircle className="w-3 h-3" /> 배송완료 처리 (테스트)</button><button className="text-[10px] border border-border-light text-muted px-5 py-2.5 rounded-sm flex items-center gap-2 hover:bg-terracotta hover:text-white hover:border-terracotta transition-all uppercase tracking-widest min-w-[120px] justify-center"><X className="w-3 h-3" /> 주문 취소</button></>)}{order.status === '배송완료' && (<button className="text-[10px] border border-charcoal text-charcoal px-5 py-2.5 rounded-sm flex items-center gap-2 hover:bg-charcoal hover:text-white transition-all uppercase tracking-widest min-w-[120px] justify-center"><ClipboardCheck className="w-3 h-3" /> 구매 확정 완료</button>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-2xl text-charcoal">{t.mypage.addresses}</h3>
                <button onClick={() => setIsAddrModalOpen(true)} className="bg-charcoal text-white px-6 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" /> 새 배송지 추가</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((addr) => (
                  <div key={addr.id} className={`p-8 bg-white border rounded-sm relative group transition-all ${addr.is_default ? 'border-deep-sage ring-1 ring-deep-sage/20' : 'border-border-light hover:border-deep-sage/50'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${addr.is_default ? 'bg-deep-sage text-white' : 'bg-hanji-white text-muted'}`}><MapPin className="w-5 h-5" /></div><div><span className="font-serif text-xl text-charcoal">{addr.address_name}</span>{addr.is_default && <span className="ml-2 bg-deep-sage text-white text-[8px] px-2 py-0.5 rounded-full uppercase align-middle">{t.mypage.defaultAddress}</span>}</div></div>
                      <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-muted hover:text-terracotta transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-3 text-sm text-charcoal/80 font-light bg-hanji-white/30 p-4 rounded-sm">
                      <p className="font-medium flex items-center gap-2"><User className="w-3.5 h-3.5 opacity-50" /> {addr.receiver_name}</p>
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 opacity-50" /> {addr.receiver_phone}</p>
                      <p className="flex items-start gap-2 leading-relaxed"><MapPin className="w-3.5 h-3.5 opacity-50 mt-0.5" /> <span>({addr.postcode})<br/>{addr.address}<br/>{addr.detail_address}</span></p>
                    </div>
                    {!addr.is_default && (<button onClick={() => handleSetDefaultAddress(addr.id)} className="mt-6 w-full py-2 border border-border-light text-[10px] text-muted hover:border-deep-sage hover:text-deep-sage transition-all flex items-center justify-center gap-2 rounded-sm"><Star className="w-3 h-3" /> 기본 배송지로 설정</button>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {wishItems.length === 0 ? (
                <div className="py-32 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6"><div className="w-16 h-16 bg-hanji-white rounded-full flex items-center justify-center text-muted"><Heart className="w-8 h-8" /></div><p className="text-muted font-light italic">{t.mypage.noWish}</p><Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5" /> {t.mypage.goToShop} <ChevronRight className="w-3 h-3" /></Link></div>
              ) : (wishItems.map(p => <ProductCard key={p.id} product={p} />))}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h3 className="font-serif text-2xl text-charcoal mb-8">{t.mypage.profile}</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.name} <span className="text-[9px] lowercase opacity-60">(성함 또는 닉네임)</span></label><input required value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-5 py-3 rounded-sm text-sm focus:border-deep-sage outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.phone} <span className="text-[9px] lowercase opacity-60">(- 제외하고 입력)</span></label><input required value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-5 py-3 rounded-sm text-sm focus:border-deep-sage outline-none" /></div>
                  <div className="space-y-2 opacity-50"><label className="text-[10px] text-muted uppercase tracking-widest ml-1">Email <span className="text-[9px] lowercase opacity-60">(수정 불가)</span></label><input readOnly value={user.email} className="w-full bg-hanji-white/10 border border-border-light px-5 py-3 rounded-sm text-sm cursor-not-allowed" /></div>
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 font-serif text-lg shadow-lg disabled:opacity-50">{isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {t.mypage.saveBtn}</>}</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReviewModalOpen(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white rounded-sm shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light"><h3 className="font-serif text-3xl">리뷰 작성하기</h3><button onClick={() => setIsReviewModalOpen(false)} className="p-1 hover:rotate-90 transition-transform"><X className="w-7 h-7" /></button></div>
              <div className="flex gap-6 mb-10 items-center bg-hanji-white/30 p-4 rounded-sm border border-border-light"><div className="relative w-16 h-20 bg-white rounded-sm overflow-hidden border border-border-light"><Image src={selectedProduct.imageUrl || ''} alt="" fill className="object-cover" /></div><div><p className="text-[10px] text-muted uppercase tracking-widest mb-1">Product</p><h4 className="text-xl font-serif text-charcoal">{selectedProduct.name}</h4></div></div>
              <form onSubmit={handleSubmitReview} className="space-y-10">
                <div className="text-center space-y-4"><p className="text-xs text-muted uppercase tracking-[0.2em]">상품은 만족스러우셨나요?</p><div className="flex justify-center gap-3">{[1, 2, 3, 4, 5].map((star) => (<button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})} className={`transition-all ${reviewData.rating >= star ? 'text-deep-sage scale-110' : 'text-border-light hover:text-deep-sage/40'}`}><Star className={`w-10 h-10 ${reviewData.rating >= star ? 'fill-current' : ''}`} /></button>))}</div></div>
                <div className="space-y-2"><label className="text-[10px] text-muted uppercase tracking-[0.1em] ml-1">솔직한 구매 후기를 들려주세요</label><textarea required value={reviewData.content} onChange={(e) => setReviewData({...reviewData, content: e.target.value})} placeholder="다른 구매자들에게 도움이 되는 정보를 공유해 주세요 (최소 10자)" rows={6} className="w-full bg-hanji-white/30 border border-border-light px-5 py-4 rounded-sm text-sm focus:border-deep-sage outline-none resize-none" /></div>
                <div className="grid grid-cols-4 gap-4"><div className="aspect-square border-2 border-dashed border-border-light rounded-sm flex flex-col items-center justify-center text-muted hover:border-deep-sage transition-all cursor-pointer"><Camera className="w-6 h-6 mb-2" /><span className="text-[9px] uppercase font-bold">Photo</span></div></div>
                <button type="submit" disabled={isSaving || reviewData.content.length < 10} className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all font-serif text-xl flex items-center justify-center gap-3 shadow-xl disabled:opacity-30">리뷰 등록 완료하기</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Modal */}
      <AnimatePresence>
        {isAddrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddrModalOpen(false)} className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-sm shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-border-light"><h3 className="font-serif text-3xl">새 배송지 등록</h3><button onClick={() => setIsAddrModalOpen(false)} className="p-1 hover:text-terracotta transition-colors"><X className="w-7 h-7" /></button></div>
              <form onSubmit={handleSaveAddress} className="space-y-8">
                <div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">배송지 별칭 <span className="text-[9px] lowercase opacity-60">(예: 우리 집, 회사)</span></label><input required value={newAddr.address_name} onChange={(e) => setNewAddr({...newAddr, address_name: e.target.value})} placeholder="우리 집, 회사 등" className="w-full bg-hanji-white/30 border border-border-light px-5 py-3.5 rounded-sm text-sm focus:border-deep-sage outline-none" /></div>
                <div className="grid grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">받는 분 성함</label><input required value={newAddr.receiver_name} onChange={(e) => setNewAddr({...newAddr, receiver_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-5 py-3.5 rounded-sm text-sm focus:border-deep-sage outline-none" /></div><div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">연락처</label><input required value={newAddr.receiver_phone} onChange={(e) => setNewAddr({...newAddr, receiver_phone: e.target.value})} placeholder="010-0000-0000" className="w-full bg-hanji-white/30 border border-border-light px-5 py-3.5 rounded-sm text-sm focus:border-deep-sage outline-none" /></div></div>
                <div className="space-y-4">
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">우편번호</label><div className="flex gap-3"><input readOnly required value={newAddr.postcode} placeholder="00000" className="w-full bg-hanji-white/50 border border-border-light px-5 py-3.5 rounded-sm text-sm" /><button type="button" onClick={handleAddressSearch} className="px-6 py-2 bg-charcoal text-white text-[10px] rounded-sm flex items-center gap-2 flex-shrink-0 hover:bg-deep-sage transition-all uppercase">주소 찾기</button></div></div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">주소</label><input readOnly required value={newAddr.address} className="w-full bg-hanji-white/50 border border-border-light px-5 py-3.5 rounded-sm text-sm" /></div>
                  <div className="space-y-2"><label className="text-[10px] text-muted uppercase ml-1">상세 주소</label><input required value={newAddr.detail_address} onChange={(e) => setNewAddr({...newAddr, detail_address: e.target.value})} placeholder="상세 정보를 입력해 주세요" className="w-full border border-border-light px-5 py-3.5 rounded-sm text-sm focus:border-deep-sage outline-none" /></div>
                </div>
                <div className="pt-4"><label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={newAddr.is_default} onChange={(e) => setNewAddr({...newAddr, is_default: e.target.checked})} className="w-5 h-5 accent-deep-sage cursor-pointer" /><span className="text-xs text-muted group-hover:text-charcoal transition-colors">이 주소를 기본 배송지로 설정합니다.</span></label></div>
                <button type="submit" disabled={isSaving} className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all font-serif text-xl flex items-center justify-center gap-3 shadow-xl mt-4">{isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}주소 저장하기</button>
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
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-hanji-white h-screen text-xs uppercase tracking-widest text-deep-sage">Loading...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
