'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle, LogOut, ShieldCheck, Filter, Heart, ShoppingBag, ExternalLink } from 'lucide-react';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { CONFIG } from '@/lib/config';
import ProductCard from '@/components/ProductCard';

type OrderStatus = '전체' | '결제완료' | '배송중' | '배송완료';
type ActiveTab = 'orders' | 'wishlist';

function MyPageContent() {
  const { t, language } = useLanguageStore();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('전체');
  
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'orders';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  
  const { items: wishItems, syncWithSupabase } = useWishlistStore();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const currentUser = session.user;
      setUser(currentUser);
      setIsAdmin(CONFIG.ADMIN_EMAILS.includes(currentUser.email || ''));

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`*, order_items (*, products (*))`)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
        await syncWithSupabase();
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, syncWithSupabase]);

  const filteredOrders = activeFilter === '전체' 
    ? orders 
    : orders.filter(o => o.status === activeFilter);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white h-screen text-xs uppercase tracking-widest text-deep-sage">{t.common.loading}</div>;
  if (!user) return null;

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-border-light pb-12">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">{t.mypage.title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted text-sm">
                <span className="font-medium text-deep-sage">{user.email}</span> {language === 'ko' ? '님, 반갑습니다.' : 'Welcome back.'}
              </p>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="flex items-center gap-1.5 px-3 py-1 bg-deep-sage/10 text-deep-sage rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-deep-sage hover:text-white transition-all shadow-sm"
                >
                  <ShieldCheck className="w-3 h-3" /> Admin Access
                </Link>
              )}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="px-6 py-2.5 border border-border-light text-[10px] uppercase tracking-widest hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> {t.common.logout}
          </button>
        </div>

        <div className="flex gap-12 border-b border-border-light mb-12">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${activeTab === 'orders' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <Package className={`w-4 h-4 ${activeTab === 'orders' ? 'text-deep-sage' : 'text-muted'}`} />
            {t.mypage.orderHistory} ({orders.length})
            {activeTab === 'orders' && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
          </button>
          <button 
            onClick={() => setActiveTab('wishlist')}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${activeTab === 'wishlist' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'wishlist' ? 'text-terracotta' : 'text-muted'}`} />
            {t.mypage.wishlist} ({wishItems.length})
            {activeTab === 'wishlist' && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
          </button>
        </div>

        {activeTab === 'orders' ? (
          <section className="space-y-8">
            {filteredOrders.length === 0 ? (
              <div className="py-32 text-center text-muted italic bg-white border border-border-light rounded-sm">
                {t.mypage.noOrder}
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order) => (
                    <motion.div 
                      layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      key={order.id} className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm"
                    >
                      <div className="bg-hanji-white/50 px-6 py-4 border-b border-border-light flex justify-between items-center">
                        <span className="text-[10px] text-muted uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 text-[9px] font-bold rounded-full uppercase tracking-widest ${order.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' : 'bg-charcoal/5 text-charcoal/60'}`}>{order.status}</span>
                      </div>
                      <div className="p-6">
                        {order.order_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 mb-4">
                            <div className="relative w-12 h-16 bg-hanji-white rounded-sm overflow-hidden border border-border-light">
                              <Image src={item.products?.imageUrl || ''} alt="" fill className="object-cover" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{item.products?.name}</h4>
                              <p className="text-xs text-muted">{item.quantity}개 / ₩{item.price.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                        <div className="mt-6 pt-6 border-t border-border-light flex justify-between items-center">
                          <p className="text-xl font-serif font-bold">₩{order.total_price.toLocaleString()}</p>
                          {order.tracking_number && (
                            <button onClick={() => window.open(`https://search.naver.com/search.naver?query=${order.tracking_number}`)} className="text-[10px] bg-charcoal text-white px-3 py-1.5 rounded-sm flex items-center gap-1.5 hover:bg-deep-sage transition-colors">
                              <ExternalLink className="w-3 h-3" /> {t.mypage.tracking}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishItems.length === 0 ? (
              <div className="col-span-full py-32 text-center bg-white border border-border-light rounded-sm text-muted italic">{t.mypage.noWish}</div>
            ) : (
              wishItems.map(p => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-hanji-white h-screen">Loading...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
