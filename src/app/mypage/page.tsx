'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Settings, LogOut, ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react';

// 예시 주문 데이터
const mockOrders = [
  {
    id: 'ORD-2026-0301',
    date: '2026. 03. 12',
    status: '배송중',
    total: 77000,
    items: [
      { name: '유기농 철원 오대쌀 10kg', quantity: 1, price: 45000, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=200' },
      { name: '지리산 야생화 꿀', quantity: 1, price: 32000, image: 'https://images.unsplash.com/photo-1587049352847-8d4e8941b958?auto=format&fit=crop&q=80&w=200' }
    ]
  },
  {
    id: 'ORD-2026-0215',
    date: '2026. 02. 15',
    status: '배송완료',
    total: 28000,
    items: [
      { name: '천연 생분해 멀칭 필름 100m', quantity: 1, price: 28000, image: 'https://images.unsplash.com/photo-1592085198818-727878844883?auto=format&fit=crop&q=80&w=200' }
    ]
  }
];

export default function MyPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="flex-1 flex items-center justify-center bg-hanji-white">불러오는 중...</div>;
  if (!user) return null;

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-border-light pb-12">
          <div>
            <h1 className="font-serif text-4xl mb-4 text-charcoal">나의 서랍</h1>
            <p className="text-muted flex items-center gap-2">
              <span className="font-medium text-deep-sage">{user.email}</span> 님, 반갑습니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleLogout}
              className="px-6 py-2.5 border border-border-light text-xs uppercase tracking-widest hover:bg-terracotta hover:text-white hover:border-terracotta transition-all rounded-sm flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
            <button className="px-6 py-2.5 bg-charcoal text-white text-xs uppercase tracking-widest hover:bg-deep-sage transition-all rounded-sm flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        </div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {[
            { label: '결제/준비중', count: 0, icon: <Package className="w-5 h-5" /> },
            { label: '배송중', count: 1, icon: <Truck className="w-5 h-5" /> },
            { label: '배송완료', count: 1, icon: <CheckCircle className="w-5 h-5" /> },
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
            <Link href="/shop" className="text-xs text-muted hover:text-deep-sage transition-colors border-b border-transparent hover:border-deep-sage pb-1">
              전체 주문 보기
            </Link>
          </div>

          <div className="space-y-6">
            {mockOrders.map((order) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={order.id} 
                className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm"
              >
                <div className="bg-hanji-white/50 px-6 py-4 border-b border-border-light flex flex-wrap justify-between items-center gap-4">
                  <div className="flex gap-6 text-xs text-muted">
                    <p><span className="mr-2 opacity-60">주문일</span> {order.date}</p>
                    <p><span className="mr-2 opacity-60">주문번호</span> {order.id}</p>
                  </div>
                  <div className={`px-3 py-1 text-[10px] font-medium rounded-full ${
                    order.status === '배송중' ? 'bg-deep-sage/10 text-deep-sage' : 'bg-charcoal/10 text-charcoal/60'
                  }`}>
                    {order.status}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0 border border-border-light">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <h4 className="text-sm font-medium text-charcoal line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-muted mt-1">{item.quantity}개 / ₩{item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center">
                          <button className="text-[10px] text-muted hover:text-charcoal border border-border-light px-3 py-1.5 transition-colors">
                            재구매
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-border-light flex justify-between items-center">
                    <p className="text-xs text-muted">총 결제 금액</p>
                    <p className="text-lg font-serif font-bold text-charcoal">₩{order.total.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Empty State Teaser */}
        <div className="mt-20 p-12 bg-deep-sage text-hanji-white text-center rounded-sm">
          <ShoppingBag className="w-10 h-10 mx-auto mb-6 opacity-40" />
          <h3 className="font-serif text-2xl mb-4">단아한 일상을 채워보세요</h3>
          <p className="text-sm opacity-80 mb-8 max-w-sm mx-auto">
            자연이 빚은 본연의 가치, 자연의 결이 선별한 다양한 상품들이 기다리고 있습니다.
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 bg-hanji-white text-deep-sage px-8 py-3 rounded-sm hover:bg-white transition-all font-medium text-sm"
          >
            만물상 바로가기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
