'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle, LogOut, ShieldCheck, Filter } from 'lucide-react';

const ADMIN_EMAILS = ['grow930706@gmail.com'];
type OrderStatus = '전체' | '결제완료' | '배송중' | '배송완료';

export default function MyPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('전체');
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
      } catch (err) {
        console.error('주문 데이터 로드 오류:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

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
      <div className="max-w-5xl mx-auto">
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

        {/* Status Dashboard & Filter */}
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
            <h2 className="font-serif text-2xl text-charcoal">최근 주문 내역</h2>
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
          {activeFilter !== '전체' && (
            <button onClick={() => setActiveFilter('전체')} className="text-[10px] text-terracotta flex items-center gap-1">
              <Filter className="w-3 h-3" /> 필터 해제
            </button>
          )}
        </div>

        {/* Order History */}
        <section className="space-y-8">
          <div className="space-y-6">
            {filteredOrders.length === 0 ? (
              <div className="py-32 text-center text-muted italic bg-white border border-border-light rounded-sm">
                해당하는 주문 내역이 없습니다.
              </div>
            ) : (
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
                      
                      <div className="mt-8 pt-6 border-t border-border-light flex justify-between items-center">
                        <p className="text-[10px] text-muted uppercase tracking-widest font-medium">Total Amount</p>
                        <p className="text-xl font-serif font-bold text-charcoal tracking-tight">₩{order.total_price.toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
