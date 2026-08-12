'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Truck, CreditCard, ShoppingBag, Clock, 
  User, MapPin, Hash, Loader2, Save, CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { adminFetch } from '@/lib/adminFetch';

interface OrderItem {
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

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdate: (updatedOrder: Order) => void;
}

const STATUS_OPTIONS = [
  '결제완료',
  '상품준비중',
  '배송중',
  '배송완료',
  '취소됨'
];

// 결제 웹훅이 시스템적으로만 설정하는 상태들. 관리자가 실수로 "정상 결제완료"로
// 착각하고 다음 단계로 넘기지 않도록 별도로 경고 표시합니다.
const NEEDS_REVIEW_STATUSES = ['입금대기', '결제실패', '금액불일치_확인필요'];

// admin_update_order_status RPC(supabase/migrations/20260801_..._rpc.sql)가 서버에서
// 이 그룹 밖으로의 전이를 차단하는 상태들과 동일한 목록. 서버가 어차피 막으므로,
// 관리자가 드롭다운에서 다른 상태를 골랐다가 저장 시점에야 거부 메시지를 보는 대신
// 애초에 변경 불가능하다는 걸 드롭다운 자체에서 알 수 있도록 비활성화합니다.
const CANCELLED_GROUP_STATUSES = ['주문취소', '취소됨', '환불완료', '재고부족취소'];

export default function OrderDetailModal({ order, onClose, onUpdate }: OrderDetailModalProps) {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [isLoading, setIsLoading] = useState(false);
  // STATUS_OPTIONS에 없는 상태(예: 금액불일치_확인필요)로 들어온 주문은, <select value>가
  // 어떤 <option>과도 안 맞아서 화면엔 첫 번째 옵션("결제완료")이 정상 상태인 것처럼
  // 보이던 버그가 있었습니다. 실제 현재 상태를 옵션 목록에 포함시켜 항상 정확히 보이게 합니다.
  const selectOptions = STATUS_OPTIONS.includes(order.status)
    ? STATUS_OPTIONS
    : [order.status, ...STATUS_OPTIONS];
  const isCancelledGroup = CANCELLED_GROUP_STATUSES.includes(order.status);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await adminFetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          tracking_number: trackingNumber,
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Update failed');

      onUpdate({ ...order, status, tracking_number: trackingNumber });
      alert('주문 정보가 업데이트되었습니다.');
      onClose();
    } catch (err: any) {
      alert(`수정 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
        className="relative bg-hanji-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 bg-white border-b border-border-light flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl text-charcoal">주문 상세 관리</h2>
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest bg-hanji-white px-2 py-1 rounded-sm border border-border-light">
                ID: {order.id.split('-')[0].toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted flex items-center gap-2">
              <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-hanji-white rounded-full transition-colors text-muted hover:text-charcoal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Col: Order Info */}
            <div className="space-y-10">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                  <User className="w-3 h-3" /> 고객 정보
                </h3>
                <div className="bg-white p-6 rounded-sm border border-border-light space-y-3">
                  <p className="text-sm font-serif text-charcoal flex justify-between">
                    <span className="text-muted font-sans text-[11px] uppercase tracking-wider">Name</span>
                    {order.customer_name}
                  </p>
                  <p className="text-sm text-charcoal flex justify-between">
                    <span className="text-muted font-sans text-[11px] uppercase tracking-wider">Contact</span>
                    {order.customer_phone}
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> 배송지 정보
                </h3>
                <div className="bg-white p-6 rounded-sm border border-border-light space-y-4">
                  <p className="text-sm text-charcoal leading-relaxed">
                    {order.address}
                  </p>
                  {order.memo && (
                    <div className="pt-4 border-t border-border-light">
                      <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Memo</p>
                      <p className="text-xs text-charcoal italic italic-hanji">{order.memo}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> 결제 정보
                </h3>
                <div className="bg-white p-6 rounded-sm border border-border-light space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted text-[11px] uppercase tracking-wider">Method</span>
                    <span className="text-sm font-medium">{order.payment_method === 'card' ? '신용카드' : '무통장 입금'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border-light">
                    <span className="text-charcoal font-bold text-[11px] uppercase tracking-wider">Total Amount</span>
                    <span className="text-xl font-serif text-terracotta font-bold">₩{order.total_price.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Col: Items & Status Control */}
            <div className="space-y-10">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                  <ShoppingBag className="w-3 h-3" /> 주문 상품 ({order.order_items.length})
                </h3>
                <div className="bg-white border border-border-light rounded-sm divide-y divide-border-light">
                  {order.order_items.map((item, idx) => (
                    <div key={idx} className="p-4 flex gap-4 items-center">
                      <div className="relative w-12 h-14 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0">
                        {item.products?.imageUrl && (
                          <Image src={item.products.imageUrl} alt={item.products.name} fill className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-serif text-charcoal line-clamp-1">{item.product_name || item.products?.name || '삭제된 상품'}</p>
                        <p className="text-[10px] text-muted">{item.quantity}개 / ₩{((item.product_price || item.price) * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6 pt-6 border-t border-border-light">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-deep-sage">주문 상태 변경</label>
                  {NEEDS_REVIEW_STATUSES.includes(order.status) && (
                    <p className="text-[13px] text-terracotta font-bold bg-terracotta/5 border border-terracotta/20 rounded-sm px-3 py-2">
                      ⚠ 현재 상태가 &quot;{order.status}&quot;입니다 — 결제가 정상 확인되지 않은 주문일 수 있으니, 실제 입금/결제 여부를 먼저 확인한 뒤 상태를 변경해 주세요.
                    </p>
                  )}
                  {isCancelledGroup && (
                    <p className="text-[13px] text-muted font-bold bg-hanji-white border border-border-light rounded-sm px-3 py-2">
                      이미 &quot;{order.status}&quot; 처리된 주문은 다른 상태로 되돌릴 수 없습니다. 필요하면 고객에게 재주문을 안내해 주세요.
                    </p>
                  )}
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isCancelledGroup}
                    className="w-full bg-white border border-border-light p-4 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-hanji-white"
                  >
                    {selectOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* 배송중 또는 배송완료 상태에서만 송장 입력창 노출 */}
                {(status === '배송중' || status === '배송완료') && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-deep-sage flex items-center gap-2">
                      <Hash className="w-3 h-3" /> 운송장 번호 입력
                    </label>
                    <input 
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="운송장 번호를 입력하세요"
                      className="w-full bg-white border border-border-light p-4 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all"
                    />
                  </motion.div>
                )}
              </section>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-hanji-white/50 border-t border-border-light flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-sm font-bold text-muted bg-white border border-border-light rounded-sm hover:bg-hanji-white transition-all uppercase tracking-widest"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isCancelledGroup}
            className="flex-1 py-4 text-sm font-bold text-white bg-charcoal rounded-sm hover:bg-deep-sage transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            변경사항 저장하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
