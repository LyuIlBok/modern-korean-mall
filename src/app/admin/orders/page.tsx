'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CONFIG } from '@/lib/config';
import { 
  ShoppingCart, Search, ChevronDown, ChevronUp, Loader2, 
  ArrowLeft, Edit, Filter, Calendar, DollarSign, Package,
  CheckCircle2, Truck, AlertCircle, XCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrderDetailModal from '@/components/admin/OrderDetailModal';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    imageUrl: string;
  } | null;
}

interface Order {
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
  order_items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      // profiles.is_admin이 진짜 관리자 판정 기준입니다. CONFIG.ADMIN_EMAILS는
      // 최초 슈퍼관리자 이메일 하나만 담긴 폴백이라, 이것만 보면 나중에 추가한
      // 다른 관리자 계정이 이 화면에서 튕겨나가는 문제가 있었습니다.
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

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, imageUrl))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '전체' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '결제완료': return <CheckCircle2 className="w-3 h-3" />;
      case '배송중': return <Truck className="w-3 h-3" />;
      case '취소됨': return <XCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-hanji-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-sm shadow-sm border border-border-light">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-hanji-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-charcoal text-white rounded-sm flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-charcoal">주문 관리 시스템</h1>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Order Management System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                placeholder="주문자명 또는 주문번호 검색" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-hanji-white/50 border border-border-light pl-10 pr-4 py-2.5 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all"
              />
            </div>
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-border-light pl-10 pr-10 py-2.5 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all cursor-pointer min-w-[140px]"
              >
                <option value="전체">전체 상태</option>
                <option value="결제완료">결제완료</option>
                <option value="상품준비중">상품준비중</option>
                <option value="배송중">배송중</option>
                <option value="배송완료">배송완료</option>
                <option value="취소됨">취소됨</option>
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Today Orders', value: orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length, icon: Package, color: 'text-deep-sage' },
            { label: 'Pending Ship', value: orders.filter(o => o.status === '상품준비중').length, icon: Clock, color: 'text-amber-500' },
            { label: 'In Transit', value: orders.filter(o => o.status === '배송중').length, icon: Truck, color: 'text-blue-500' },
            { label: 'Total Revenue', value: `₩${orders.reduce((sum, o) => sum + o.total_price, 0).toLocaleString()}`, icon: DollarSign, color: 'text-charcoal' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-sm border border-border-light shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full bg-hanji-white flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{stat.label}</p>
                <p className="text-lg font-serif font-bold text-charcoal">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-sm shadow-sm border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-muted uppercase tracking-[0.2em] bg-hanji-white/50 border-b border-border-light">
                <tr>
                  <th className="px-8 py-5 font-bold">주문 일시 / ID</th>
                  <th className="px-8 py-5 font-bold">주문자 정보</th>
                  <th className="px-8 py-5 font-bold">상품 내역</th>
                  <th className="px-8 py-5 font-bold text-right">결제 금액</th>
                  <th className="px-8 py-5 font-bold text-center">상태</th>
                  <th className="px-8 py-5 font-bold text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
                        <p className="text-[10px] uppercase tracking-widest text-muted font-bold">주문 데이터를 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-muted italic font-light">
                      검색 조건에 맞는 주문 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-hanji-white/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-charcoal font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-muted font-mono mt-1 uppercase tracking-tighter">
                          #{order.id.split('-')[0]}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-serif text-charcoal">{order.customer_name}</div>
                        <div className="text-[11px] text-muted mt-0.5">{order.customer_phone}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs text-charcoal max-w-[200px] truncate">
                          {order.order_items[0]?.products?.name || '상품 정보 없음'}
                          {order.order_items.length > 1 && ` 외 ${order.order_items.length - 1}건`}
                        </div>
                        <div className="text-[10px] text-muted mt-1 uppercase tracking-widest">
                          {order.payment_method === 'card' ? 'CARD' : 'TRANSFER'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-serif font-bold text-charcoal">
                        ₩{order.total_price.toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 text-xs font-bold text-muted hover:text-deep-sage bg-hanji-white hover:bg-deep-sage/10 rounded-sm transition-all border border-border-light hover:border-deep-sage/20 flex items-center gap-2 mx-auto"
                        >
                          <Edit className="w-3.5 h-3.5" /> 상세 관리
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

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
