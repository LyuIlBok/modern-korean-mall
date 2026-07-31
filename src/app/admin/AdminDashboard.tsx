'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { 
  Package, Plus, LayoutDashboard, LogOut, Loader2, 
  ShoppingCart, Truck, CheckCircle,
  MessageSquare, Users, Trash2, Edit3, X, TrendingUp, Bell, Camera, Search, 
  DollarSign, Save, CreditCard, Wallet, Image as ImageIcon, Settings,
  CheckCircle2, AlertCircle, XCircle, Edit, RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { CONFIG } from '@/lib/config';
import { useLanguageStore } from '@/store/useLanguageStore';
import RichTextEditor from '@/components/admin/RichTextEditor';
import OrderDetailModal from '@/components/admin/OrderDetailModal';

// Recharts 관련 Prerendering 에러를 방지하기 위해 SalesChart를 클라이언트 사이드에서만 렌더링
const SalesChart = dynamic(() => import('./SalesChart'), { 
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-white border border-border-light rounded-sm">
      <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
    </div>
  )
});

export const viewport = { width: 'device-width', initialScale: 1 };

type ActiveTab = 'products' | 'orders' | 'qna' | 'dashboard' | 'restock';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  shipping_fee: number;
  category: string;
  description: string;
  imageUrl: string;
  images: string[];
  detail_content_images: string[];
  reward_points: number;
  discount_rate: number;
  is_sold_out: boolean;
  is_active?: boolean;
  created_at: string;
  specs?: {
    origin?: string;
    producer?: string;
  };
}

interface AdminOrderItem {
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string;
  product_price?: number;
  products: {
    name: string;
    imageUrl: string;
  } | null;
}

interface AdminOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  total_price: number;
  status: string;
  payment_method: string;
  memo?: string;
  tracking_number?: string;
  order_items: AdminOrderItem[];
}

interface AdminRestockAlert {
  id: string;
  created_at: string;
  product_id: string;
  user_id: string;
  products: {
    name: string;
    imageUrl: string;
    stock: number;
  } | null;
  profiles: {
    email: string;
    full_name: string;
  } | null;
}

interface SidebarItem {
  id: ActiveTab | 'chat' | 'members' | 'unified-members' | 'notices' | 'settings';
  label: string;
  icon: any;
  path?: string;
}

export default function AdminDashboard() {
  const { t, language } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<AdminRestockAlert[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');

  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      const isSuperAdmin = session.user.email === CONFIG.ADMIN_EMAILS[0];
      if (!profile?.is_admin && !isSuperAdmin) {
        router.replace('/');
        return;
      }

      setIsAdmin(true);
      
      const [productsRes, ordersRes, alertsRes, userCountRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, order_items(*, products(name, imageUrl))').order('created_at', { ascending: false }),
        supabase.from('restock_alerts').select('*, products(name, imageUrl, stock), profiles(email, full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);

      if (productsRes.data) setProducts(productsRes.data as AdminProduct[]);
      if (ordersRes.data) setOrders(ordersRes.data as AdminOrder[]);
      if (alertsRes.data) setRestockAlerts(alertsRes.data as AdminRestockAlert[]);
      if (userCountRes.count !== null) setUserCount(userCountRes.count);
      
    } catch (err) { 
      console.error('Admin data fetch failed:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 이번 주 시작 (일요일 기준)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todaySales = orders
      .filter(o => new Date(o.created_at) >= todayStart && o.status !== '취소됨')
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    const weekSales = orders
      .filter(o => new Date(o.created_at) >= weekStart && o.status !== '취소됨')
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

    // Bestsellers logic
    const salesMap = new Map<string, { name: string, quantity: number, imageUrl: string }>();
    orders.forEach(order => {
      if (order.status === '취소됨') return;
      order.order_items?.forEach(item => {
        const id = item.product_id;
        const current = salesMap.get(id) || { name: item.products?.name || 'Unknown', quantity: 0, imageUrl: item.products?.imageUrl || '' };
        salesMap.set(id, { ...current, quantity: current.quantity + item.quantity });
      });
    });

    const bestsellers = Array.from(salesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    return { todaySales, weekSales, bestsellers };
  }, [orders]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!isAdmin) return;

    const ordersChannel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          fetchData();
        } else if (payload.eventType === 'UPDATE') {
          const newOrder = payload.new as AdminOrder;
          setOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o));
        }
      })
      .subscribe();

    const productsChannel = supabase
      .channel('admin-products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const newProduct = payload.new as AdminProduct;
          setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [isAdmin, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '전체' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const handleDeleteProduct = async (product: AdminProduct) => {
    if (!confirm(`'${product.name}' 상품을 비활성화(숨김) 하시겠습니까? 주문 내역 유지를 위해 데이터는 삭제되지 않습니다.`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id);
        
      if (error) {
        console.error('Soft delete error details:', error);
        alert(`비활성화 실패: ${error.message} (${error.details || 'No additional details'})`);
        return;
      }
      
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: false } : p));
      alert('상품이 비활성화되었습니다.');
    } catch (err: any) {
      console.error('System error during soft delete:', err);
      alert(`시스템 오류: ${err.message || '알 수 없는 에러가 발생했습니다.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreProduct = async (product: AdminProduct) => {
    if (!confirm(`'${product.name}' 상품을 다시 활성화(노출) 하시겠습니까?`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', product.id);
        
      if (error) {
        console.error('Restore error details:', error);
        alert(`활성화 실패: ${error.message} (${error.details || 'No additional details'})`);
        return;
      }
      
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: true } : p));
      alert('상품이 다시 활성화되었습니다.');
    } catch (err: any) {
      alert(`시스템 오류: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '결제완료': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '상품준비중': return 'bg-amber-50 text-amber-600 border-amber-100';
      case '배송중': return 'bg-deep-sage/10 text-deep-sage border-deep-sage/20';
      case '배송완료': return 'bg-green-50 text-green-600 border-green-100';
      case '취소됨': return 'bg-terracotta/10 text-terracotta border-terracotta/20';
      default: return 'bg-hanji-white text-muted border-border-light';
    }
  };

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-hanji-white text-deep-sage uppercase text-xs">Loading Dashboard...</div>;
  if (!isAdmin) return null;

  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: t?.admin?.navDashboard || '운영 현황', icon: TrendingUp },
    { id: 'products', label: t?.admin?.navProducts || '상품 관리', icon: Package },
    { id: 'orders', label: t?.admin?.navOrders || '주문 관리', icon: ShoppingCart },
    { id: 'restock', label: t?.admin?.navRestock || '재입고 알림', icon: Bell },
    { id: 'chat', label: t?.admin?.navChat || '실시간 상담', icon: MessageSquare, path: '/admin/chat' },
    { id: 'members', label: t?.admin?.navMembers || '회원 관리', icon: Users, path: '/admin/members' },
    { id: 'unified-members', label: '통합 회원 관리', icon: Users, path: '/admin/unified-members' },
    { id: 'notices', label: '공지사항 관리', icon: Bell, path: '/admin/notices' },
    { id: 'settings', label: '사이트 설정', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="flex-1 flex min-h-screen bg-hanji-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-light bg-white flex flex-col p-8 sticky top-0 h-screen shadow-sm">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-deep-sage rounded-sm flex items-center justify-center text-white"><LayoutDashboard className="w-6 h-6" /></div>
          <h2 className="font-serif text-xl text-charcoal">{t?.admin?.title || '관리자 센터'}</h2>
        </div>
        <nav className="space-y-4 flex-1">
          {sidebarItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => item.path ? router.push(item.path) : setActiveTab(item.id as ActiveTab)} 
              className={`flex items-center gap-3 w-full p-3 rounded-sm transition-all text-sm ${activeTab === item.id ? 'bg-deep-sage text-white font-bold shadow-md' : 'text-muted hover:bg-hanji-white'}`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
        <button 
          onClick={async () => { 
            await supabase.auth.signOut(); 
            localStorage.removeItem('boki_chat_session');
            router.push('/'); 
          }} 
          className="flex items-center gap-3 text-muted hover:text-terracotta pt-6 font-medium text-sm border-t border-border-light"
        >
          <LogOut className="w-4 h-4" /> {t?.common?.logout || '로그아웃'}
        </button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-12">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h1 className="font-serif text-4xl text-charcoal">{t?.admin?.navDashboard || '운영 현황'}</h1>
                  <p className="text-muted text-sm font-light">{t?.admin?.analyticsDesc || '복이네농장의 실시간 비즈니스 성과를 분석합니다.'}</p>
                </div>
              </div>

              {/* 핵심 지표 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center group hover:border-deep-sage transition-all">
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{t?.admin?.todayRevenue || 'Today Revenue'}</p>
                    <h3 className="text-3xl font-serif text-charcoal">₩{stats.todaySales.toLocaleString()}</h3>
                  </div>
                  <div className="bg-deep-sage/5 p-4 rounded-full group-hover:bg-deep-sage group-hover:text-white transition-all"><DollarSign className="w-8 h-8 opacity-40 group-hover:opacity-100" /></div>
                </div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center group hover:border-deep-sage transition-all">
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{t?.admin?.weekRevenue || 'This Week'}</p>
                    <h3 className="text-3xl font-serif text-charcoal">₩{stats.weekSales.toLocaleString()}</h3>
                  </div>
                  <div className="bg-deep-sage/5 p-4 rounded-full group-hover:bg-deep-sage group-hover:text-white transition-all"><TrendingUp className="w-8 h-8 opacity-40 group-hover:opacity-100" /></div>
                </div>
                <div className="bg-white p-10 rounded-sm shadow-sm border border-border-light flex justify-between items-center group hover:border-deep-sage transition-all">
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{t?.admin?.totalMembers || 'Total Members'}</p>
                    <h3 className="text-3xl font-serif text-charcoal">{userCount.toLocaleString()}명</h3>
                  </div>
                  <div className="bg-deep-sage/5 p-4 rounded-full group-hover:bg-deep-sage group-hover:text-white transition-all"><Users className="w-8 h-8 opacity-40 group-hover:opacity-100" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Sales Chart */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-2xl">{t?.admin?.salesAnalytics || 'Sales Analytics'}</h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted font-bold">Last 7 Days</span>
                  </div>
                  <SalesChart />
                </div>

                {/* 베스트셀러 TOP 3 */}
                <div className="space-y-6">
                  <h2 className="font-serif text-2xl">{t?.admin?.bestsellers || 'Bestsellers TOP 3'}</h2>
                  <div className="bg-white border border-border-light rounded-sm shadow-sm overflow-hidden">
                    <div className="divide-y divide-border-light">
                      {stats.bestsellers.length > 0 ? stats.bestsellers.map((item, idx) => (
                        <div key={idx} className="p-6 flex items-center gap-6 group hover:bg-hanji-white transition-all">
                          <div className="relative w-14 h-14 rounded-sm overflow-hidden flex-shrink-0 border border-border-light bg-hanji-white">
                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-bold text-charcoal line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">{item.quantity} {t?.admin?.unitsSold || 'units sold'}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif italic border ${idx === 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-hanji-white text-muted border-border-light'}`}>{idx + 1}</div>
                        </div>
                      )) : (
                        <div className="p-12 text-center text-muted text-xs italic">데이터가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 최근 주문 내역 리스트 */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h2 className="font-serif text-2xl">{t?.admin?.recentOrders || 'Recent Orders'}</h2>
                  <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-deep-sage border-b border-current pb-1 uppercase tracking-widest hover:text-charcoal transition-all">{t?.admin?.viewAllOrders || 'View All Orders'}</button>
                </div>
                <div className="bg-white border border-border-light rounded-sm shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                      <tr>
                        <th className="px-8 py-4">Order ID</th>
                        <th className="px-8 py-4">Customer</th>
                        <th className="px-8 py-4">Total Price</th>
                        <th className="px-8 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="hover:bg-hanji-white transition-all cursor-pointer" onClick={() => setSelectedOrder(o)}>
                          <td className="px-8 py-5 font-mono text-[10px] text-muted">{o.id.slice(0,8).toUpperCase()}</td>
                          <td className="px-8 py-5 text-sm font-medium">{o.customer_name}</td>
                          <td className="px-8 py-5 text-sm font-bold text-charcoal">₩{Number(o.total_price).toLocaleString()}</td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${getStatusStyle(o.status)}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <h1 className="font-serif text-4xl">{t?.admin?.navProducts || '상품 관리'}</h1>
                  <p className="text-muted text-sm font-light">등록된 전체 상품 {products.length}개를 관리합니다.</p>
                </div>
                <button 
                  onClick={() => router.push('/admin/products/new')} 
                  className="bg-charcoal text-white px-8 py-3.5 rounded-sm flex items-center gap-2 hover:bg-deep-sage transition-all shadow-lg font-medium"
                >
                  <Plus className="w-4 h-4" /> {t?.admin?.newTitle || '새 상품 등록하기'}
                </button>
              </div>

              <div className="bg-white p-6 rounded-sm border border-border-light shadow-sm flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input type="text" placeholder="상품명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-hanji-white/50 border border-border-light pl-12 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-deep-sage" />
                </div>
                <div className="flex gap-4">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-hanji-white/50 border border-border-light px-6 py-3 rounded-sm text-sm focus:outline-none">
                    <option value="전체">전체 카테고리</option><option value="농산물">농산물</option><option value="농자재">농자재</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">카테고리</th><th className="px-8 py-6 text-right">판매가 / 배송비</th><th className="px-8 py-6 text-right">재고</th><th className="px-8 py-6 text-center">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-hanji-white/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-5">
                            <div className="relative w-14 h-16 rounded-sm overflow-hidden border border-border-light bg-hanji-white">
                              <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-serif text-lg text-charcoal">{p.name}</p>
                                {p.is_active === false && (
                                  <span className="px-2 py-0.5 bg-terracotta text-white text-[8px] font-black rounded-sm uppercase tracking-widest shadow-sm">비활성 (Hidden)</span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted font-mono">{p.id.slice(0,8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-deep-sage uppercase tracking-wider">{p.category}</td>
                        <td className="px-8 py-6 text-right">
                          <div className="space-y-1">
                            <p className="font-medium text-charcoal">{Number(p.price).toLocaleString()}원</p>
                            <p className="text-[10px] text-muted">배송비: {Number(p.shipping_fee).toLocaleString()}원</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.stock <= 0 ? 'bg-terracotta/10 text-terracotta' : p.stock <= 5 ? 'bg-orange-50 text-orange-600' : 'bg-charcoal/5 text-charcoal/60'}`}>{p.stock <= 0 ? '품절' : `${p.stock}개`}</span></td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => router.push(`/admin/products/${p.id}/edit`)} 
                              className="p-2 hover:bg-deep-sage/10 rounded-full transition-all text-muted hover:text-deep-sage"
                              title="상품 수정 및 옵션 관리"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {p.is_active === false ? (
                              <button 
                                onClick={() => handleRestoreProduct(p)} 
                                className="p-2 hover:bg-green-50 rounded-full transition-all text-muted hover:text-green-600"
                                title="상품 복구(노출)"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleDeleteProduct(p)} 
                                className="p-2 hover:bg-terracotta/10 rounded-full transition-all text-muted hover:text-terracotta"
                                title="상품 비활성화(숨김)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl">{t?.admin?.navOrders || '주문 관리'}</h1>
                <p className="text-muted text-sm font-light">전체 주문 {orders.length}건을 관리합니다.</p>
              </div>
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">주문 일시 / ID</th><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">결제 수단</th><th className="px-8 py-6 text-right">총 금액</th><th className="px-8 py-6 text-center">상태</th><th className="px-8 py-6 text-center">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-hanji-white/30 transition-colors">
                        <td className="px-8 py-6"><div className="space-y-1"><p className="text-sm text-charcoal">{new Date(o.created_at).toLocaleString()}</p><p className="text-[10px] text-muted font-mono">{o.id.slice(0,8).toUpperCase()}</p></div></td>
                        <td className="px-8 py-6"><div className="space-y-1">{o.order_items?.map((item, idx) => (<p key={idx} className="text-xs text-charcoal">· {item.products?.name} ({item.quantity}개)</p>))}</div></td>
                        <td className="px-8 py-6 text-xs text-muted">
                          <div className="flex items-center gap-2">
                            {o.payment_method === 'card' ? <><CreditCard className="w-3.5 h-3.5" /> 카드결제</> : <><Wallet className="w-3.5 h-3.5" /> 무통장</>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-medium">₩{Number(o.total_price).toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button 
                            onClick={() => setSelectedOrder(o)}
                            className="px-4 py-2 text-xs font-bold text-muted hover:text-deep-sage bg-hanji-white hover:bg-deep-sage/10 rounded-sm transition-all border border-border-light hover:border-deep-sage/20 flex items-center gap-2 mx-auto shadow-sm"
                          >
                            <Edit className="w-3.5 h-3.5" /> 상세 관리
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'restock' && (
            <motion.div key="restock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl">{t?.admin?.navRestock || '재입고 알림 신청'}</h1>
                <p className="text-muted text-sm font-light">품절 상품에 대한 {restockAlerts.length}건의 알림 요청이 있습니다.</p>
              </div>
              <div className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-hanji-white text-[10px] uppercase tracking-[0.2em] text-muted border-b border-border-light">
                    <tr><th className="px-8 py-6">신청 일시</th><th className="px-8 py-6">상품 정보</th><th className="px-8 py-6">신청자 정보</th><th className="px-8 py-6 text-center">현재 재고</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {restockAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-hanji-white/30 transition-colors">
                        <td className="px-8 py-6 text-xs text-muted">{new Date(a.created_at).toLocaleString()}</td>
                        <td className="px-8 py-6"><div className="flex items-center gap-4"><div className="relative w-10 h-12 rounded-sm overflow-hidden bg-hanji-white"><Image src={a.products?.imageUrl || ''} alt="" fill className="object-cover" /></div><p className="text-sm font-medium">{a.products?.name}</p></div></td>
                        <td className="px-8 py-6"><p className="text-sm text-charcoal">{a.profiles?.full_name}</p><p className="text-[10px] text-muted">{a.profiles?.email}</p></td>
                        <td className="px-8 py-6 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${a.products?.stock && a.products.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-terracotta/10 text-terracotta'}`}>{a.products?.stock || 0}개</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            onUpdate={(updated) => {
              setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
