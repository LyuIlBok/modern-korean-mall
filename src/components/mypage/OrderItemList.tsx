'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Package, Truck, ShoppingBag, MessageSquare, 
  Box, Camera, Clock, ExternalLink, AlertCircle, Loader2
} from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  products: {
    id: string;
    name: string;
    imageUrl: string;
  } | null;
}

interface Order {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  tracking_number?: string;
  order_items: OrderItem[];
}

interface OrderItemListProps {
  orders: Order[];
  onOpenReview: (product: any) => void;
  onCancelOrder: (orderId: string) => void;
  cancellingId: string | null;
}

export default function OrderItemList({ orders, onOpenReview, onCancelOrder, cancellingId }: OrderItemListProps) {
  const router = useRouter();
  const { setInquiryProduct, toggleChat, triggerAutoSend } = useChatStore();

  if (orders.length === 0) {
    return (
      <div className="py-32 text-center bg-white border border-border-light rounded-sm flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-hanji-white rounded-full flex items-center justify-center text-muted">
          <Package className="w-8 h-8" />
        </div>
        <p className="text-muted font-light italic text-sm">아직 주문한 내역이 없습니다.</p>
        <Link 
          href="/shop" 
          className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-[10px] uppercase tracking-widest flex items-center gap-2 font-bold shadow-lg"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> 상점 구경하기
        </Link>
      </div>
    );
  }

  const handleInquiry = (product: any, orderId: string) => {
    if (!product) return;
    setInquiryProduct({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      orderId: orderId
    });
    triggerAutoSend(`[상품 문의: ${product.name} / 주문번호: ${orderId.slice(0,8).toUpperCase()}] 이 상품에 대해 상담하고 싶습니다.`);
    toggleChat(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case '배송완료': return 'bg-charcoal text-white border-charcoal';
      case '배송중': return 'bg-deep-sage text-white border-deep-sage';
      case '상품준비중': return 'bg-amber-50 text-amber-600 border-amber-200';
      case '결제완료': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '취소됨': return 'bg-terracotta/10 text-terracotta border-terracotta/20';
      default: return 'bg-hanji-white text-muted border-border-light';
    }
  };

  return (
    <div className="space-y-10">
      {orders.map((order) => (
        <motion.div 
          key={order.id} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Order Header */}
          <div className="bg-hanji-white/50 px-8 py-5 border-b border-border-light flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center gap-10">
              <div className="space-y-1">
                <p className="text-[9px] text-muted uppercase tracking-widest font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Order Date
                </p>
                <p className="text-sm font-medium text-charcoal">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted uppercase tracking-widest font-bold">Order ID</p>
                <p className="text-sm text-charcoal/60 font-mono tracking-tighter uppercase">{order.id.slice(0, 12)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-muted uppercase tracking-widest font-bold">Total Payment</p>
                <p className="text-sm font-bold text-charcoal">₩{order.total_price.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${getStatusStyle(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>

          {/* Tracking Section (If applicable) */}
          {(order.status === '배송중' || order.status === '배송완료') && order.tracking_number && (
            <div className="px-8 py-4 bg-deep-sage/5 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-deep-sage" />
                <span className="text-xs text-charcoal font-medium">운송장 번호: </span>
                <span className="text-xs font-mono font-bold text-deep-sage">{order.tracking_number}</span>
              </div>
              <a 
                href={`https://search.naver.com/search.naver?query=배송조회+${order.tracking_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-deep-sage hover:text-charcoal transition-colors flex items-center gap-1 uppercase tracking-widest bg-white px-3 py-1.5 rounded-sm border border-deep-sage/20 shadow-sm"
              >
                Track Package <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Order Items */}
          <div className="p-8 space-y-8">
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                <div className="flex gap-8">
                  <div className="relative w-24 h-28 bg-hanji-white rounded-sm overflow-hidden border border-border-light flex-shrink-0 shadow-sm">
                    {item.products?.imageUrl && (
                      <Image 
                        src={item.products.imageUrl} 
                        alt={item.products.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    )}
                  </div>
                  <div className="space-y-2 py-1 flex-1">
                    <h4 className="text-xl font-serif text-charcoal tracking-tight leading-tight">{item.products?.name}</h4>
                    <p className="text-sm text-muted font-light">{item.quantity}개 / ₩{item.price.toLocaleString()}</p>
                    <div className="pt-4 flex gap-3">
                      {order.status === '배송완료' && (
                        <button 
                          onClick={() => onOpenReview(item.products)} 
                          className="text-[10px] bg-white border border-charcoal text-charcoal px-4 py-2 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all font-bold uppercase tracking-widest shadow-sm"
                        >
                          <Camera className="w-3.5 h-3.5" /> Post Review
                        </button>
                      )}
                      <button 
                        onClick={() => router.push(`/shop/${item.products?.id}`)} 
                        className="text-[10px] border border-border-light text-muted px-4 py-2 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all uppercase tracking-widest"
                      >
                        <Box className="w-3.5 h-3.5" /> Reorder
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex md:flex-col gap-3 min-w-[160px]">
                  <button 
                    onClick={() => handleInquiry(item.products, order.id)}
                    className="text-[10px] border border-border-light text-charcoal/60 px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-hanji-white transition-all uppercase tracking-widest justify-center font-bold font-sans flex-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> 이 제품 상담하기
                  </button>
                  
                  {order.status === '결제완료' && (
                    <button 
                      onClick={() => onCancelOrder(order.id)} 
                      disabled={cancellingId === order.id} 
                      className="text-[10px] text-terracotta/60 hover:text-terracotta transition-colors uppercase tracking-[0.2em] font-bold py-2 text-center disabled:opacity-30 underline underline-offset-4 decoration-terracotta/20 flex items-center justify-center gap-2"
                    >
                      {cancellingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
