'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, Truck, CreditCard, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const { language } = useLanguageStore();
  const hasMounted = useHasMounted();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    memo: '',
    paymentMethod: 'card'
  });

  // Fetch user info for auto-fill
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        // 1. Fetch default address
        const { data: addrData } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();

        if (addrData) {
          setFormData(prev => ({
            ...prev,
            name: addrData.receiver_name || prev.name,
            phone: addrData.receiver_phone || prev.phone,
            address: `${addrData.address} ${addrData.detail_address}`.trim() || prev.address
          }));
        } else {
          // 2. Fallback to profile if no default address
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileData) {
            setFormData(prev => ({
              ...prev,
              name: profileData.full_name || prev.name,
              phone: profileData.phone || prev.phone
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching profile for auto-fill:', err);
      }
    };

    if (hasMounted) {
      fetchUserProfile();
    }
  }, [hasMounted]);

  useEffect(() => {
    if (hasMounted && items.length === 0) {
      alert(language === 'ko' ? '장바구니가 비어 있습니다.' : 'Your cart is empty.');
      router.push('/');
    }
  }, [hasMounted, items, router, language]);

  if (!hasMounted || items.length === 0) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 장바구니 최종 검증
    if (!items || items.length === 0) {
      alert(language === 'ko' ? '장바구니가 비어 있어 주문을 진행할 수 없습니다.' : 'Cart is empty. Cannot proceed.');
      router.push('/');
      return;
    }

    setIsLoading(true);

    try {
      // 세션 확인 (null 방어)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = sessionData?.session;
      
      // 1. orders 테이블에 주문 생성
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          address: formData.address,
          total_price: total,
          status: '결제완료'
        }])
        .select()
        .single();

      if (orderError) throw new Error(`주문 생성 실패: ${orderError.message}`);
      if (!order) throw new Error('주문 데이터가 생성되지 않았습니다.');

      // 2. order_items 테이블에 상세 내역 생성 (items null 방어)
      const orderItems = items.map(item => {
        if (!item || !item.id) throw new Error('잘못된 상품 정보가 포함되어 있습니다.');
        return {
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity || 1,
          price: item.price || 0
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw new Error(`주문 항목 저장 실패: ${itemsError.message}`);

      // 3. 장바구니 비우기 및 성공 페이지 이동
      clearCart();
      router.push('/order-success');
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(language === 'ko' 
        ? `결제 처리 중 문제가 발생했습니다: ${err.message || '알 수 없는 오류'}` 
        : `Error during checkout: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-hanji-white min-h-screen pt-24 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-6 text-xs uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" /> Continue Shopping
          </Link>
          <h1 className="font-serif text-4xl text-charcoal">주문/결제</h1>
        </header>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* Left: Shipping & Payment */}
          <div className="lg:col-span-7 space-y-12">
            <section className="bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h2 className="font-serif text-2xl mb-8 flex items-center gap-3">
                <Truck className="w-6 h-6 text-deep-sage" /> 배송지 정보
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">수령인</label>
                  <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="성함을 입력해 주세요" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">연락처</label>
                  <input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="010-0000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">배송 주소</label>
                  <input required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="도로명 주소를 입력해 주세요" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted">배송 메모 (선택)</label>
                  <input value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="요청 사항을 적어주세요" />
                </div>
              </div>
            </section>

            <section className="bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h2 className="font-serif text-2xl mb-8 flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-deep-sage" /> 결제 수단 선택
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'card', label: '신용카드' },
                  { id: 'transfer', label: '무통장 입금' },
                  { id: 'kakao', label: '카카오페이' },
                  { id: 'naver', label: '네이버페이' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData({...formData, paymentMethod: method.id})}
                    className={`py-4 rounded-sm border transition-all text-sm font-medium ${formData.paymentMethod === method.id ? 'border-charcoal bg-charcoal text-white' : 'border-border-light hover:border-charcoal'}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Order Summary (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8">
            <section className="bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h2 className="font-serif text-xl mb-8 border-b border-border-light pb-4">주문 내역</h2>
              <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar mb-8">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-hanji-white rounded-sm overflow-hidden flex-shrink-0">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="font-serif text-sm text-charcoal line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted mt-1">{item.quantity}개 / ₩{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-border-light">
                <div className="flex justify-between text-sm text-muted">
                  <span>총 상품 금액</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>배송비</span>
                  <span>{shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-xl font-serif text-charcoal pt-4 border-t border-border-light">
                  <span>최종 결제 금액</span>
                  <span className="text-2xl">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-charcoal text-white py-6 rounded-sm mt-10 hover:bg-deep-sage transition-all font-serif text-xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>₩{total.toLocaleString()} 결제하기</>}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
                <ShieldCheck className="w-3 h-3 text-deep-sage" /> Secure Checkout
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
