'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Truck, User, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. 주문 메인 정보 저장 (orders)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: (e.target as any)[0].value,
          customer_phone: (e.target as any)[1].value,
          address: (e.target as any)[2].value,
          total_price: total,
          status: '결제완료'
        }])
        .select();

      if (orderError) throw orderError;

      // 2. 주문 상세 상품 저장 (order_items)
      const orderId = orderData[0].id;
      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setIsCompleted(true);
      setTimeout(() => {
        clearCart();
        router.push('/mypage');
      }, 3000);
    } catch (error: any) {
      console.error('주문 저장 오류:', error.message);
      alert('주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(false);

  if (items.length === 0 && !isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white">
        <h1 className="font-serif text-2xl mb-6">주문하실 상품이 없습니다.</h1>
        <Link href="/shop" className="text-deep-sage border-b border-deep-sage pb-1">만물상으로 돌아가기</Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 text-deep-sage"
        >
          <CheckCircle2 className="w-20 h-20 mx-auto" />
        </motion.div>
        <h1 className="font-serif text-4xl mb-4 text-charcoal">주문이 완료되었습니다</h1>
        <p className="text-muted mb-10">정성을 다해 준비하여 보내드리겠습니다.<br/>잠시 후 메인 화면으로 이동합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-charcoal mb-8 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> 장바구니로 돌아가기
        </Link>
        
        <h1 className="font-serif text-4xl mb-12">주문서 작성</h1>

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 입력 폼 섹션 */}
          <div className="space-y-12">
            {/* 배송 정보 */}
            <section>
              <div className="flex items-center gap-2 mb-6 text-charcoal">
                <Truck className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-2xl">배송 정보</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">수령인</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                      <input type="text" required placeholder="성함을 입력해주세요" className="w-full bg-white border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">연락처</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                      <input type="tel" required placeholder="010-0000-0000" className="w-full bg-white border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted ml-1 uppercase tracking-tighter">배송 주소</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted/40" />
                    <textarea required rows={3} placeholder="주소를 입력해주세요 (우편번호 포함)" className="w-full bg-white border border-border-light pl-11 pr-4 py-3.5 rounded-sm focus:outline-none focus:border-deep-sage transition-colors text-sm resize-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* 결제 수단 */}
            <section>
              <div className="flex items-center gap-2 mb-6 text-charcoal">
                <CreditCard className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-2xl">결제 수단</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['신용카드', '카카오페이', '무통장 입금', '네이버페이'].map((method) => (
                  <label key={method} className="relative group cursor-pointer">
                    <input type="radio" name="payment" className="peer sr-only" defaultChecked={method === '신용카드'} />
                    <div className="p-4 border border-border-light rounded-sm text-center text-sm peer-checked:border-deep-sage peer-checked:bg-deep-sage/5 hover:border-deep-sage/50 transition-all">
                      {method}
                    </div>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-muted leading-relaxed">
                * 무통장 입금 시: 농협 301-XXXX-XXXX-XX (농업회사법인복이네농장주식회사)
              </p>
            </section>
          </div>

          {/* 주문 요약 섹션 */}
          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-8 rounded-sm shadow-sm">
              <h2 className="font-serif text-2xl mb-8">주문 상품 확인</h2>
              
              <div className="max-h-60 overflow-y-auto mb-8 pr-2 space-y-4 scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="text-sm font-medium line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-muted mt-1">{item.quantity}개 / ₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm mb-8 pt-6 border-t border-border-light">
                <div className="flex justify-between text-muted">
                  <span>상품 합계</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>배송비</span>
                  <span>{shipping === 0 ? '무료' : `₩${shipping.toLocaleString()}`}</span>
                </div>
                <div className="pt-4 border-t border-border-light flex justify-between text-xl font-serif text-charcoal">
                  <span>최종 결제 금액</span>
                  <span className="text-deep-sage font-bold">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" required className="w-4 h-4 rounded-sm accent-deep-sage" />
                  <span className="text-[11px] text-muted group-hover:text-charcoal transition-colors underline underline-offset-2">개인정보 수집 및 이용 동의 (필수)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" required className="w-4 h-4 rounded-sm accent-deep-sage" />
                  <span className="text-[11px] text-muted group-hover:text-charcoal transition-colors underline underline-offset-2">결제 대행 서비스 이용 동의 (필수)</span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-deep-sage text-white py-5 rounded-sm hover:bg-charcoal transition-all duration-500 font-serif text-xl shadow-lg active:scale-[0.98]"
              >
                결제 완료하기
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
