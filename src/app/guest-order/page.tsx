'use client';

import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Package, Mail, Hash, Loader2, AlertCircle, 
  ArrowLeft, Truck, CheckCircle, CreditCard, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguageStore } from '@/store/useLanguageStore';
import { Order, OrderItem } from '@/types';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';

function GuestOrderContent() {
  const { t } = useLanguageStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !email) return;

    setIsLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch('/api/orders/guest-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const json = await res.json();

      if (!res.ok || !json.data) {
        setError(json.error || '일치하는 주문 정보가 없습니다. 주문번호와 이메일을 확인해주세요.');
      } else {
        setOrder(json.data);
      }
    } catch (err) {
      setError('조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '결제완료': return 'text-green-600 bg-green-50';
      case '배송중': return 'text-deep-sage bg-deep-sage/5';
      case '배송완료': return 'text-charcoal bg-hanji-white';
      default: return 'text-muted bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-hanji-white py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/login" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-12 text-sm uppercase tracking-widest font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <header className="mb-16 space-y-4">
          <h1 className="font-serif text-5xl text-charcoal tracking-tight">비회원 주문조회</h1>
          <p className="text-muted font-normal">주문 시 발송된 이메일의 주문번호와 이메일 주소를 입력해 주세요.</p>
        </header>

        {!order ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-sm border border-border-light shadow-sm"
          >
            <form onSubmit={handleSearch} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Order Number</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30" />
                    <input 
                      required
                      type="text" 
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="주문번호 (예: uuid)"
                      className="w-full bg-hanji-white/30 border border-border-light pl-12 pr-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] uppercase tracking-widest text-muted ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30" />
                    <input 
                      required
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="주문 시 입력한 이메일"
                      className="w-full bg-hanji-white/30 border border-border-light pl-12 pr-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-terracotta/5 border border-terracotta/10 rounded-sm">
                  <AlertCircle className="w-5 h-5 text-terracotta" />
                  <p className="text-sm text-terracotta font-medium">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                isLoading={isLoading}
                size="xl"
                className="w-full"
                leftIcon={<Search className="w-5 h-5" />}
              >
                주문 조회하기
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Order Header Card */}
            <div className="bg-white p-10 rounded-sm border border-border-light shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <p className="text-[13px] uppercase tracking-widest text-muted font-bold">Order ID</p>
                <h2 className="font-mono text-xl text-charcoal">{order.id}</h2>
                <p className="text-sm text-muted">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <div className={`px-6 py-3 rounded-full font-bold text-sm ${getStatusColor(order.status)}`}>
                {order.status}
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-white rounded-sm border border-border-light shadow-sm overflow-hidden">
              <div className="p-8 border-b border-border-light bg-hanji-white/50">
                <h3 className="font-serif text-2xl text-charcoal flex items-center gap-3">
                  <Package className="w-6 h-6 text-deep-sage" /> 주문 상품 ({order.order_items?.length || 0})
                </h3>
              </div>
              <div className="divide-y divide-border-light">
                {(order.order_items || []).map((item: OrderItem) => (
                  <div key={item.id} className="p-8 flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="font-serif text-lg text-charcoal group-hover:text-deep-sage transition-colors">{item.product_name}</p>
                      {item.option_name && <p className="text-sm text-muted">Option: {item.option_name}</p>}
                      <p className="text-sm text-muted font-medium">{item.quantity}개 | {formatPrice(item.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-xl font-bold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8 bg-hanji-white/30 flex justify-between items-center">
                <span className="text-sm font-bold text-muted uppercase tracking-widest">Total Amount</span>
                <span className="font-serif text-3xl font-black text-charcoal">{formatPrice(order.total_price)}</span>
              </div>
            </div>

            {/* Shipping & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
                <h3 className="font-serif text-xl text-charcoal flex items-center gap-3 border-b border-border-light pb-4">
                  <Truck className="w-5 h-5 text-deep-sage" /> 배송 정보
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">수령인</span>
                    <span className="col-span-2 text-charcoal">{order.customer_name}</span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">연락처</span>
                    <span className="col-span-2 text-charcoal font-mono">{order.customer_phone}</span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">배송지</span>
                    <span className="col-span-2 text-charcoal leading-relaxed">{order.address}</span>
                  </div>
                  {order.memo && (
                    <div className="grid grid-cols-3 text-sm">
                      <span className="text-muted font-bold">요청사항</span>
                      <span className="col-span-2 text-charcoal italic">&quot;{order.memo}&quot;</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-sm border border-border-light shadow-sm space-y-6">
                <h3 className="font-serif text-xl text-charcoal flex items-center gap-3 border-b border-border-light pb-4">
                  <CreditCard className="w-5 h-5 text-deep-sage" /> 결제 정보
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">결제수단</span>
                    <span className="col-span-2 text-charcoal uppercase">{order.payment_method === 'card' ? '신용카드' : '무통장입금'}</span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">결제금액</span>
                    <span className="col-span-2 text-charcoal font-bold">{formatPrice(order.total_price)}</span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted font-bold">결제상태</span>
                    <span className="col-span-2 font-bold text-deep-sage">{order.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setOrder(null)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              다른 주문 조회하기
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-hanji-white"><Loader2 className="w-10 h-10 animate-spin text-deep-sage" /></div>}>
      <GuestOrderContent />
    </Suspense>
  );
}
