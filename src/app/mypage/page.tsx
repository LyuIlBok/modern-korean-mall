'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, LogOut } from 'lucide-react';

export default function MyPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 실제 주문 데이터 가져오기 (상품 정보 포함)
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
          .eq('user_id', session.user.id)
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white h-screen">불러오는 중...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-border-light pb-12">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">나의 서랍</h1>
            <p className="text-muted flex items-center gap-2">
              <span className="font-medium text-deep-sage">{user.email}</span> 님, 반갑습니다.
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-6 py-2.5 border border-border-light text-xs uppercase tracking-widest hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { label: '결제완료', count: orders.filter(o => o.status === '결제완료').length, icon: <Package className="w-5 h-5" /> },
            { label: '배송중', count: orders.filter(o => o.status === '배송중').length, icon: <Truck className="w-5 h-5" /> },
            { label: '배송완료', count: orders.filter(o => o.status === '배송완료').length, icon: <CheckCircle className="w-5 h-5" /> },
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-border-light p-8 rounded-sm text-center shadow-sm">
              <div className="flex justify-center mb-4 text-deep-sage opacity-40">{item.icon}</div>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">{item.label}</p>
              <p className="text-3xl font-serif text-charcoal">{item.count}</p>
            </div>
          ))}
        </div>

        {/* Order History */}
        <section className="space-y-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl">최근 주문 내역</h2>
          </div>

          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="py-20 text-center text-muted italic bg-white border border-border-light rounded-sm">
                아직 주문 내역이 없습니다.
              </div>
            ) : (
              orders.map((order) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={order.id} 
                  className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm"
                >
                  <div className="bg-hanji-white/50 px-6 py-4 border-b border-border-light flex flex-wrap justify-between items-center gap-4">
                    <div className="flex gap-6 text-xs text-muted">
                      <p><span className="mr-2 opacity-60">주문일</span> {new Date(order.created_at).toLocaleDateString()}</p>
                      <p><span className="mr-2 opacity-60">주문번호</span> {order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className={`px-3 py-1 text-[10px] font-medium rounded-full ${
                      order.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' :
                      order.status === '결제완료' ? 'bg-deep-sage/5 text-deep-sage/60' :
                      'bg-charcoal/10 text-charcoal/60'
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
                      <p className="text-xs text-muted">총 결제 금액</p>
                      <p className="text-lg font-serif font-bold text-charcoal">₩{order.total_price.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
