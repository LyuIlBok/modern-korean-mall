'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Truck, User, Phone, MapPin, CheckCircle2, Search, ChevronRight, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

declare global {
  interface Window {
    daum: any;
  }
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    postcode: '',
    address: '',
    detailAddress: '',
    paymentMethod: 'credit_card'
  });

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  // 다음 주소 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setFormData({
          ...formData,
          postcode: data.zonecode,
          address: data.address
        });
      }
    }).open();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      const formatted = value
        .replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
        .replace(/^(\d{3})(\d{3,4})$/, '$1-$2');
      setFormData({ ...formData, phone: formatted });
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          address: `(${formData.postcode}) ${formData.address} ${formData.detailAddress}`,
          total_price: total,
          status: '결제완료'
        }])
        .select();

      if (orderError) throw orderError;

      const orderId = orderData[0].id;
      const orderItems = items.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      setIsCompleted(true);
      setTimeout(() => {
        clearCart();
        router.push('/mypage');
      }, 3000);
    } catch (error: any) {
      alert('주문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0 && !isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white h-screen">
        <h1 className="font-serif text-2xl mb-6">주문하실 상품이 없습니다.</h1>
        <Link href="/shop" className="text-deep-sage border-b border-deep-sage pb-1">만물상으로 돌아가기</Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white text-center h-screen">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8 text-deep-sage">
          <CheckCircle2 className="w-20 h-20 mx-auto" />
        </motion.div>
        <h1 className="font-serif text-4xl mb-4">주문이 완료되었습니다</h1>
        <p className="text-muted mb-10 leading-relaxed">정성을 다해 준비하여 보내드리겠습니다.<br/>잠시 후 나의 서랍으로 이동합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-charcoal mb-8 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> 장바구니로 돌아가기
        </Link>
        
        <h1 className="font-serif text-4xl mb-12 text-charcoal">주문서 작성</h1>

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            {/* 배송 정보 섹션 */}
            <section className="bg-white p-8 border border-border-light rounded-sm shadow-sm">
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4">
                <Truck className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-2xl">배송 정보</h2>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">주문자 성함</label>
                    <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} type="text" placeholder="성함을 입력해주세요" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">연락처</label>
                    <input required value={formData.phone} onChange={handlePhoneChange} type="tel" placeholder="010-0000-0000" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-muted uppercase tracking-widest ml-1">배송 주소</label>
                  <div className="flex gap-2">
                    <input readOnly required value={formData.postcode} placeholder="우편번호" className="w-32 bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm focus:outline-none" />
                    <button type="button" onClick={handleAddressSearch} className="px-4 py-2 bg-charcoal text-white text-xs rounded-sm hover:bg-deep-sage transition-colors flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" /> 주소 검색
                    </button>
                  </div>
                  <input readOnly required value={formData.address} placeholder="기본 주소" className="w-full bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm focus:outline-none" />
                  <input required value={formData.detailAddress} onChange={(e) => setFormData({...formData, detailAddress: e.target.value})} placeholder="상세 주소를 입력해주세요" className="w-full bg-white border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                </div>
              </div>
            </section>

            {/* 결제 수단 섹션 */}
            <section className="bg-white p-8 border border-border-light rounded-sm shadow-sm">
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4">
                <Wallet className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-2xl">결제 수단</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'credit_card', name: '신용/체크카드', icon: <CreditCard className="w-4 h-4" /> },
                  { id: 'kakaopay', name: '카카오페이', color: 'bg-[#FEE500]' },
                  { id: 'naverpay', name: '네이버페이', color: 'bg-[#03C75A] text-white' },
                  { id: 'bank', name: '무통장 입금' },
                ].map((method) => (
                  <label key={method.id} className="relative cursor-pointer group">
                    <input type="radio" name="payment" checked={formData.paymentMethod === method.id} onChange={() => setFormData({...formData, paymentMethod: method.id})} className="peer sr-only" />
                    <div className={`p-4 border border-border-light rounded-sm text-center text-sm transition-all flex items-center justify-center gap-2 peer-checked:border-deep-sage peer-checked:bg-deep-sage/5 ${method.color || 'bg-white'}`}>
                      {method.name}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* 주문 요약 (우측 고정) */}
          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-8 rounded-sm shadow-md">
              <h2 className="font-serif text-2xl mb-8 border-b border-border-light pb-4">주문 내역</h2>
              <div className="max-h-60 overflow-y-auto mb-8 pr-2 space-y-4 scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0 border border-border-light">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="text-sm font-medium text-charcoal">{item.name}</h4>
                      <p className="text-xs text-muted mt-1">{item.quantity}개 / ₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 text-sm mb-8 pt-6 border-t border-border-light">
                <div className="flex justify-between text-muted"><span>상품 합계</span><span>₩{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted"><span>배송비</span><span>{shipping === 0 ? '무료' : `₩${shipping.toLocaleString()}`}</span></div>
                <div className="pt-4 border-t border-border-light flex justify-between text-xl font-serif text-charcoal">
                  <span>총 결제 금액</span>
                  <span className="text-deep-sage font-bold">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-deep-sage text-white py-5 rounded-sm hover:bg-charcoal transition-all duration-500 font-serif text-xl shadow-lg flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>결제하기 <ChevronRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
