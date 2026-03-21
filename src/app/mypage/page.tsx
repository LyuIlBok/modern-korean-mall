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
import ProductCard from '@/components/ProductCard';

const ADMIN_EMAILS = ['grow930706@gmail.com'];
type OrderStatus = '전체' | '결제완료' | '배송중' | '배송완료';
type ActiveTab = 'orders' | 'wishlist';

function MyPageContent() {
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
      setIsAdmin(ADMIN_EMAILS.includes(currentUser.email || ''));

      try {
        // 주문 내역 가져오기
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (*)
            )
          `)
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
        
        // 관심 상품 동기화
        await syncWithSupabase();
      } catch (err) {
        console.error('데이터 로드 오류:', err);
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

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white h-screen text-xs uppercase tracking-widest text-deep-sage">Loading your space...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-border-light pb-12">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">나의 서랍</h1>
            <div className="flex items-center gap-3">
              <p className="text-muted text-sm">
                <span className="font-medium text-deep-sage">{user.email}</span> 님, 반갑습니다.
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
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-12 border-b border-border-light mb-12">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${activeTab === 'orders' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <Package className={`w-4 h-4 ${activeTab === 'orders' ? 'text-deep-sage' : 'text-muted'}`} />
            주문 내역 ({orders.length})
            {activeTab === 'orders' && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
          </button>
          <button 
            onClick={() => setActiveTab('wishlist')}
            className={`pb-4 px-2 font-serif text-xl flex items-center gap-2 transition-all relative ${activeTab === 'wishlist' ? 'text-charcoal' : 'text-muted hover:text-charcoal'}`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'wishlist' ? 'text-terracotta' : 'text-muted'}`} />
            관심 상품 ({wishItems.length})
            {activeTab === 'wishlist' && <motion.div layoutId="myTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal" />}
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
            {/* Status Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              {[
                { label: '결제완료', status: '결제완료', count: orders.filter(o => o.status === '결제완료').length, icon: <Package className="w-5 h-5" /> },
                { label: '배송중', status: '배송중', count: orders.filter(o => o.status === '배송중').length, icon: <Truck className="w-5 h-5" /> },
                { label: '배송완료', status: '배송완료', count: orders.filter(o => o.status === '배송완료').length, icon: <CheckCircle className="w-5 h-5" /> },
              ].map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveFilter(item.status as OrderStatus)}
                  className={`p-8 border rounded-sm text-center transition-all shadow-sm ${
                    activeFilter === item.status ? 'bg-white border-deep-sage ring-1 ring-deep-sage' : 'bg-white border-border-light hover:border-deep-sage/50'
                  }`}
                >
                  <div className={`flex justify-center mb-4 transition-colors ${activeFilter === item.status ? 'text-deep-sage' : 'text-deep-sage opacity-40'}`}>{item.icon}</div>
                  <p className="text-[10px] text-muted uppercase tracking-[0.2em] mb-2">{item.label}</p>
                  <p className="text-3xl font-serif text-charcoal">{item.count}</p>
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-6">
                <h2 className="font-serif text-2xl text-charcoal">상세 내역</h2>
                <div className="h-4 w-[1px] bg-border-light" />
                <div className="flex gap-4">
                  {['전체', '결제완료', '배송중', '배송완료'].map((f) => (
                    <button 
                      key={f} 
                      onClick={() => setActiveFilter(f as OrderStatus)}
                      className={`text-[11px] uppercase tracking-widest transition-colors ${
                        activeFilter === f ? 'text-deep-sage font-bold underline underline-offset-4' : 'text-muted hover:text-charcoal'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Order History */}
            <section className="space-y-8">
              {filteredOrders.length === 0 ? (
                <div className="py-32 text-center text-muted italic bg-white border border-border-light rounded-sm">
                  해당하는 주문 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout">
                    {filteredOrders.map((order) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        key={order.id} 
                        className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="bg-hanji-white/50 px-6 py-4 border-b border-border-light flex flex-wrap justify-between items-center gap-4">
                          <div className="flex gap-6 text-[10px] text-muted uppercase tracking-wider">
                            <p><span className="mr-2 opacity-60">Date</span> {new Date(order.created_at).toLocaleDateString()}</p>
                            <p><span className="mr-2 opacity-60">ID</span> {order.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <div className={`px-3 py-1 text-[9px] font-bold rounded-full uppercase tracking-widest ${
                            order.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' :
                            order.status === '결제완료' ? 'bg-deep-sage/5 text-deep-sage/60' :
                            order.status === '배송완료' ? 'bg-green-50 text-green-600' : 'bg-charcoal/10 text-charcoal/60'
                          }`}>
                            {order.status}
                          </div>
                        </div>
                        
                        <div className="p-6">
                          <div className="space-y-6">
                            {order.order_items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex gap-4">
                                <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0 border border-border-light">
                                  <Image src={item.products?.imageUrl || 'https://via.placeholder.com/200'} alt={item.products?.name || '상품'} fill className="object-cover" />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                  <h4 className="text-sm font-medium text-charcoal line-clamp-1">{item.products?.name || '삭제된 상품'}</h4>
                                  <p className="text-xs text-muted mt-1">{item.quantity}개 / ₩{item.price.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-8 pt-6 border-t border-border-light flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <p className="text-[10px] text-muted uppercase tracking-widest font-medium mb-1">Total Amount</p>
                              <p className="text-xl font-serif font-bold text-charcoal tracking-tight">₩{order.total_price.toLocaleString()}</p>
                            </div>
                            
                            {order.tracking_number && (
                              <div className="w-full sm:w-auto bg-hanji-white px-4 py-3 rounded-sm border border-border-light flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div>
                                  <p className="text-[9px] text-muted uppercase tracking-tighter">Tracking Number</p>
                                  <p className="text-xs font-mono font-medium text-charcoal">{order.tracking_number}</p>
                                </div>
                                <button 
                                  onClick={() => window.open(`https://search.naver.com/search.naver?query=${order.tracking_number}`, '_blank')}
                                  className="text-[10px] bg-charcoal text-white px-3 py-1.5 rounded-sm flex items-center gap-1.5 hover:bg-deep-sage transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" /> 배송 조회
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </>
        ) : (
          /* Wishlist Section */
          <div className="animate-in fade-in duration-500">
            {wishItems.length === 0 ? (
              <div className="py-32 text-center bg-white border border-border-light rounded-sm">
                <Heart className="w-12 h-12 text-muted/20 mx-auto mb-6" />
                <p className="text-muted italic mb-8">서랍이 비어있습니다. 마음에 드는 산물을 담아보세요.</p>
                <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-sm font-medium">만물상 탐색하기</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                {wishItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-hanji-white h-screen">잠시만 기다려주세요...</div>}>
      <MyPageContent />
    </Suspense>
  );
}
