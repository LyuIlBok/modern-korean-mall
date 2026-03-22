'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle, LogOut, ShieldCheck, Filter, Heart, ShoppingBag, ExternalLink, MapPin, User, Settings, Save, Plus, Trash2, Home, Briefcase, Star, Search, Loader2, X, Map } from 'lucide-react';
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
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
  });

  // Modal State
  const [isAddrModalOpen, setIsAddrModalOpen] = useState(false);
  const [newAddr, setNewAddr] = useState({
    address_name: '',
    receiver_name: '',
    receiver_phone: '',
    postcode: '',
    address: '',
    detail_address: '',
    is_default: false
  });

  const { items: wishItems, syncWithSupabase } = useWishlistStore();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const currentUser = session.user;
    setUser(currentUser);
    setIsAdmin(CONFIG.ADMIN_EMAILS.includes(currentUser.email || ''));

    try {
      // 1. Orders
      const { data: orderData } = await supabase
        .from('orders')
        .select(`*, order_items (*, products (*))`)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      setOrders(orderData || []);

      // 2. Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
        });
      }

      // 3. Addresses
      const { data: addrData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('is_default', { ascending: false });
      setAddresses(addrData || []);

      await syncWithSupabase();
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [router, syncWithSupabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      alert(language === 'ko' ? '정보가 저장되었습니다.' : 'Profile updated.');
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setNewAddr(prev => ({ ...prev, postcode: data.zonecode, address: data.address }));
        }
      }).open();
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      if (newAddr.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      }
      
      const { error } = await supabase.from('addresses').insert({
        user_id: user.id,
        address_name: newAddr.address_name,
        receiver_name: newAddr.receiver_name,
        receiver_phone: newAddr.receiver_phone,
        postcode: newAddr.postcode,
        address: newAddr.address,
        detail_address: newAddr.detail_address,
        is_default: newAddr.is_default
      });
      
      if (error) throw error;
      
      setIsAddrModalOpen(false);
      setNewAddr({
        address_name: '',
        receiver_name: '',
        receiver_phone: '',
        postcode: '',
        address: '',
        detail_address: '',
        is_default: false
      });
      fetchData();
    } catch (err) {
      alert('Error saving address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(language === 'ko' ? '정말 삭제하시겠습니까?' : 'Delete this address?')) return;
    try {
      await supabase.from('addresses').delete().eq('id', id);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user?.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white h-screen text-xs uppercase tracking-widest text-deep-sage">{t.common.loading}</div>;
  if (!user) return null;

  const tabs = [
    { id: 'orders', label: t.mypage.orderHistory, icon: Package },
    { id: 'wishlist', label: t.mypage.wishlist, icon: Heart },
    { id: 'addresses', label: t.mypage.addresses, icon: MapPin },
    { id: 'profile', label: t.mypage.profile, icon: User },
  ];

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-border-light pb-12">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">{t.mypage.title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted text-sm font-light">
                <span className="font-medium text-deep-sage border-b border-deep-sage/30 pb-0.5">{user.email}</span> 
                {language === 'ko' ? ' 님, 반갑습니다.' : ' welcome back.'}
              </p>
              {isAdmin && (
                <Link href="/admin" className="px-3 py-1 bg-deep-sage/10 text-deep-sage rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-deep-sage hover:text-white transition-all">
                  Admin Access
                </Link>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="px-6 py-2.5 border border-border-light text-[10px] uppercase tracking-[0.2em] hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2">
            <LogOut className="w-3 h-3" /> {t.common.logout}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-4 md:gap-12 border-b border-border-light mb-12">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`pb-4 px-2 font-serif text-lg md:text-xl flex items-center gap-2 transition-all relative ${activeTab === tab.id ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? (tab.id === 'wishlist' ? 'text-terracotta' : 'text-deep-sage') : 'text-muted'}`} />
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'orders' && (
            <section className="space-y-8">
              {orders.length === 0 ? (
                <div className="py-32 text-center text-muted font-light italic bg-white border border-border-light rounded-sm">{t.mypage.noOrder}</div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-hanji-white/50 px-6 py-4 border-b border-border-light flex justify-between items-center text-[10px] text-muted uppercase tracking-widest">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className={`px-3 py-1 rounded-full font-bold ${order.status === '배송중' ? 'bg-deep-sage text-white' : 'bg-charcoal/5 text-charcoal/60'}`}>{order.status}</span>
                    </div>
                    <div className="p-8">
                      {order.order_items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-6 mb-6 last:mb-0">
                          <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0">
                            <Image src={item.products?.imageUrl || ''} alt="" fill className="object-cover" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-serif text-charcoal">{item.products?.name}</h4>
                            <p className="text-xs text-muted mt-1 font-light">{item.quantity} {language === 'ko' ? '개' : 'ea'} / ₩{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      <div className="mt-8 pt-8 border-t border-border-light flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-muted uppercase tracking-tighter mb-1">Total Payment</p>
                          <p className="text-2xl font-serif font-bold text-deep-sage">₩{order.total_price.toLocaleString()}</p>
                        </div>
                        {order.tracking_number && (
                          <button onClick={() => window.open(`https://search.naver.com/search.naver?query=${order.tracking_number}`)} className="text-[10px] bg-charcoal text-white px-5 py-2.5 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all uppercase tracking-widest">
                            <ExternalLink className="w-3 h-3" /> {t.mypage.tracking}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {activeTab === 'wishlist' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {wishItems.length === 0 ? (
                <div className="col-span-full py-32 text-center bg-white border border-border-light rounded-sm text-muted font-light italic">{t.mypage.noWish}</div>
              ) : (
                wishItems.map(p => <ProductCard key={p.id} product={p} />)
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-serif text-2xl text-charcoal">{t.mypage.addresses}</h3>
                <button 
                  onClick={() => setIsAddrModalOpen(true)}
                  className="text-[10px] bg-deep-sage text-white px-4 py-2 rounded-sm flex items-center gap-2 hover:bg-charcoal transition-all uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" /> {t.mypage.addAddress}
                </button>
              </div>
              {addresses.length === 0 ? (
                <div className="py-32 text-center text-muted font-light italic bg-white border border-border-light rounded-sm">{t.mypage.noAddress}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`p-8 bg-white border rounded-sm relative group transition-all ${addr.is_default ? 'border-deep-sage ring-1 ring-deep-sage/20' : 'border-border-light hover:border-deep-sage/50'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg text-charcoal">{addr.address_name}</span>
                          {addr.is_default && <span className="bg-deep-sage text-white text-[8px] px-2 py-0.5 rounded-full uppercase tracking-tighter">{t.mypage.defaultAddress}</span>}
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 text-muted hover:text-terracotta transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-2 text-[13px] text-charcoal/80 font-light leading-relaxed">
                        <p className="font-medium">{addr.receiver_name} / {addr.receiver_phone}</p>
                        <p>({addr.postcode}) {addr.address}</p>
                        <p>{addr.detail_address}</p>
                      </div>
                      {!addr.is_default && (
                        <button 
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="mt-6 text-[10px] text-deep-sage hover:underline flex items-center gap-1.5"
                        >
                          <Star className="w-3 h-3" /> {t.mypage.setDefault}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h3 className="font-serif text-2xl text-charcoal mb-8">{t.mypage.profile}</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.name}</label>
                    <input 
                      required 
                      value={profile.full_name} 
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
                      className="w-full bg-hanji-white/30 border border-border-light px-5 py-3 rounded-sm text-sm focus:border-deep-sage focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.phone}</label>
                    <input 
                      required 
                      value={profile.phone} 
                      onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                      className="w-full bg-hanji-white/30 border border-border-light px-5 py-3 rounded-sm text-sm focus:border-deep-sage focus:outline-none transition-colors" 
                    />
                  </div>
                  <div className="space-y-2 opacity-50">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Email (Read-only)</label>
                    <input readOnly value={user.email} className="w-full bg-hanji-white/10 border border-border-light px-5 py-3 rounded-sm text-sm cursor-not-allowed" />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 font-serif text-lg shadow-lg disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> {t.mypage.saveBtn}</>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      <AnimatePresence>
        {isAddrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddrModalOpen(false)} className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-sm shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-border-light">
                <h3 className="font-serif text-2xl">{t.mypage.addAddress}</h3>
                <button onClick={() => setIsAddrModalOpen(false)} className="p-1 hover:text-terracotta transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveAddress} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.mypage.addressName}</label>
                  <input required value={newAddr.address_name} onChange={(e) => setNewAddr({...newAddr, address_name: e.target.value})} placeholder="우리 집, 회사 등" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.name}</label>
                    <input required value={newAddr.receiver_name} onChange={(e) => setNewAddr({...newAddr, receiver_name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">{t.checkout.phone}</label>
                    <input required value={newAddr.receiver_phone} onChange={(e) => setNewAddr({...newAddr, receiver_phone: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm text-sm" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input readOnly required value={newAddr.postcode} placeholder={t.checkout.postcode} className="w-24 bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                    <button type="button" onClick={handleAddressSearch} className="px-4 py-2 bg-charcoal text-white text-[10px] rounded-sm flex items-center gap-2"><Search className="w-3 h-3" /> {t.checkout.searchAddress}</button>
                  </div>
                  <input readOnly required value={newAddr.address} placeholder={t.checkout.address} className="w-full bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                  <input required value={newAddr.detail_address} onChange={(e) => setNewAddr({...newAddr, detail_address: e.target.value})} placeholder={t.checkout.detailAddress} className="w-full border border-border-light px-4 py-3 rounded-sm text-sm" />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newAddr.is_default} onChange={(e) => setNewAddr({...newAddr, is_default: e.target.checked})} className="w-4 h-4 accent-deep-sage" />
                    <span className="text-[11px] text-muted">{t.mypage.setDefault}</span>
                  </label>
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-charcoal text-white py-4 rounded-sm hover:bg-deep-sage transition-all font-serif text-lg flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {t.mypage.saveBtn}
                </button>
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
