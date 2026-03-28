'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import * as PortOne from '@portone/browser-sdk/v2';
import { ChevronLeft, Truck, CreditCard, ShieldCheck, Loader2, Search, MapPin, Plus } from 'lucide-react';

export default function CheckoutClient() {
  const { items, clearCart } = useCartStore();
  const { language } = useLanguageStore();
  const hasMounted = useHasMounted();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  // 1. 배송지 목록 및 선택 상태
  const [addressList, setAddressList] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');

  // 입력 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    postcode: '',
    address: '',
    detailAddress: '',
    memo: '',
    paymentMethod: 'card'
  });

  // 세션 확인 및 주소 목록 가져오기
  useEffect(() => {
    const checkSessionAndFetchAddresses = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession) {
          const { data: addrData } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .order('is_default', { ascending: false });

          if (addrData && addrData.length > 0) {
            setAddressList(addrData);
            const defaultAddr = addrData.find(a => a.is_default) || addrData[0];
            setSelectedAddressId(defaultAddr.id);
          } else {
            setSelectedAddressId('new');
          }
        } else {
          // 비회원은 무조건 'new' (직접 입력)
          setSelectedAddressId('new');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setSelectedAddressId('new');
      }
    };

    if (hasMounted) checkSessionAndFetchAddresses();
  }, [hasMounted]);

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setFormData(prev => ({
            ...prev,
            postcode: data.zonecode,
            address: data.address,
            detailAddress: ''
          }));
        }
      }).open();
    }
  };

  const [userPoints, setUserPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(0);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  useEffect(() => {
    const fetchDiscounts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // user_points 테이블 대신 profiles 테이블에서 직접 points를 가져옵니다.
        const [profileRes, couponsRes] = await Promise.all([
          supabase.from('profiles').select('points').eq('id', session.user.id).single(),
          supabase.from('user_coupons').select('*, coupons(*)').eq('user_id', session.user.id).eq('is_used', false)
        ]);
        
        const totalPoints = Number(profileRes.data?.points) || 0;
        setUserPoints(totalPoints);
        setCoupons(couponsRes.data || []);
      }
    };
    fetchDiscounts();
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = Math.max(...items.map(item => item.shipping_fee || 0));
  
  // 할인 계산
  let couponDiscount = 0;
  if (selectedCoupon) {
    const c = selectedCoupon.coupons;
    if (c.discount_type === 'amount') couponDiscount = c.discount_value;
    else if (c.discount_type === 'rate') couponDiscount = Math.floor(subtotal * (c.discount_value / 100));
  }
  
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      alert('유효하지 않은 프로모션 코드입니다.');
      return;
    }

    // 유효기간 체크
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      alert('만료된 쿠폰입니다.');
      return;
    }

    // 최소 주문 금액 체크
    if (subtotal < (coupon.min_order_amount || 0)) {
      alert(`최소 ${Number(coupon.min_order_amount).toLocaleString()}원 이상 주문 시 사용 가능합니다.`);
      return;
    }

    let discount = 0;
    if (coupon.discount_type === 'fixed') {
      discount = Number(coupon.discount_value);
    } else {
      discount = Math.floor(subtotal * (Number(coupon.discount_value) / 100));
    }

    setPromoDiscount(discount);
    setAppliedCoupon(coupon);
    alert(`${coupon.name} 쿠폰이 적용되었습니다.`);
  };

  const finalTotal = Math.max(0, subtotal + shippingFee - usePoints - couponDiscount - promoDiscount);

  // 강력한 결제 및 주문 제출 로직
  const handleSubmitOrder = useCallback(async (currentItems: any[]) => {
    setIsLoading(true);

    try {
      // 사용할 배송지 정보 확정
      let finalAddressData: any;
      if (selectedAddressId === 'new') {
        if (!formData.name || !formData.address) {
          alert('배송지 정보를 모두 입력해 주세요.');
          setIsLoading(false);
          return;
        }
        finalAddressData = {
          name: formData.name,
          phone: formData.phone,
          fullAddress: `(${formData.postcode}) ${formData.address} ${formData.detailAddress}`.trim(),
          postcode: formData.postcode,
          address1: formData.address,
          address2: formData.detailAddress
        };
      } else {
        const selected = addressList.find(a => a.id === selectedAddressId);
        finalAddressData = {
          name: selected.receiver_name,
          phone: selected.receiver_phone,
          fullAddress: `(${selected.postcode}) ${selected.address} ${selected.detail_address}`.trim(),
          postcode: selected.postcode,
          address1: selected.address,
          address2: selected.detail_address
        };
      }

      // 1. DB에 주문 데이터 생성 (차감된 최종 금액 반영)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: finalAddressData.name,
          customer_phone: finalAddressData.phone,
          address: finalAddressData.fullAddress,
          total_price: finalTotal, // 적립금/쿠폰이 적용된 최종 금액
          status: '결제대기',
          payment_method: formData.paymentMethod,
          memo: formData.memo
        }])
        .select()
        .single();

      if (orderError) throw new Error(`주문 생성 실패: ${orderError.message}`);

      // 주문 항목 저장
      const orderItems = currentItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      await supabase.from('order_items').insert(orderItems);

      // 2. 결제 수단별 처리
      if (formData.paymentMethod === 'card') {
        const orderName = currentItems.length > 1 
          ? `${currentItems[0].name} 외 ${currentItems.length - 1}건`
          : currentItems[0].name;

        // PortOne SDK 호출
        const paymentResponse = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '',
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '',
          paymentId: order.id,
          orderName: orderName,
          totalAmount: finalTotal, // 차감된 최종 금액으로 결제 요청
          currency: 'KRW',
          payMethod: 'CARD',
          customer: {
            fullName: finalAddressData.name,
            phoneNumber: finalAddressData.phone,
            address: {
              country: "KR",
              addressLine1: finalAddressData.address1,
              addressLine2: finalAddressData.address2,
            },
          },
        });

        if (!paymentResponse || paymentResponse.code != null) {
          const errorMessage = paymentResponse?.message || '결제창을 닫았거나 결제에 실패했습니다.';
          await supabase.from('orders').update({ status: '결제실패' }).eq('id', order.id);
          alert(`결제가 중단되었습니다: ${errorMessage}`);
          setIsLoading(false);
          return;
        }

        // 3. 결제 성공 후 후처리
        await supabase.from('orders').update({ status: '결제완료' }).eq('id', order.id);
        
        // [중요] 사용한 적립금 차감 (profiles 테이블)
        if (usePoints > 0 && session) {
          const { data: profile } = await supabase.from('profiles').select('points').eq('id', session.user.id).single();
          if (profile) {
            const remainingPoints = Math.max(0, (Number(profile.points) || 0) - usePoints);
            await supabase.from('profiles').update({ points: remainingPoints }).eq('id', session.user.id);
          }
        }

        // 쿠폰 사용 처리
        if (selectedCoupon) {
          await supabase.from('user_coupons').update({ 
            is_used: true, 
            used_at: new Date().toISOString() 
          }).eq('id', selectedCoupon.id);
        }

        alert('결제가 성공적으로 완료되었습니다!');
      } 
      else if (formData.paymentMethod === 'transfer') {
        await supabase.from('orders').update({ status: '입금대기' }).eq('id', order.id);
        alert('주문이 접수되었습니다. 입금 확인 후 배송이 시작됩니다.');
      }

      clearCart();
      router.push('/order-success');
    } catch (err: any) {
      console.error('Order Error:', err);
      alert(`주문 처리 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [formData, selectedAddressId, addressList, session, router, clearCart, finalTotal, usePoints, selectedCoupon]);

  return (
    <div className="bg-hanji-white min-h-screen pt-24 pb-32">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <Link href="/shop" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-6 text-xs uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4" /> Continue Shopping
          </Link>
          <h1 className="font-serif text-4xl text-charcoal">주문/결제</h1>
        </header>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmitOrder(items); }} className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-7 space-y-12">
            
            <section className="bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h2 className="font-serif text-2xl mb-8 flex items-center gap-3">
                <Truck className="w-6 h-6 text-deep-sage" /> 배송지 정보
              </h2>
              
              {/* 1. 회원용 UI: 카드 선택형 */}
              {session && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {addressList.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-6 rounded-sm border text-left transition-all relative group ${selectedAddressId === addr.id ? 'border-charcoal bg-hanji-white/40 ring-1 ring-charcoal' : 'border-border-light hover:border-muted'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 bg-deep-sage text-white rounded-full">
                          {addr.address_name || '기본'}
                        </span>
                        {selectedAddressId === addr.id && <ShieldCheck className="w-4 h-4 text-charcoal" />}
                      </div>
                      <p className="font-serif text-charcoal text-lg mb-1">{addr.receiver_name}</p>
                      <p className="text-xs text-muted mb-3">{addr.receiver_phone}</p>
                      <p className="text-xs text-charcoal leading-relaxed line-clamp-2">
                        ({addr.postcode}) {addr.address} {addr.detail_address}
                      </p>
                    </button>
                  ))}
                  
                  {/* 항상 마지막에 렌더링되는 [+ 새 배송지 입력] 카드 */}
                  <button
                    type="button"
                    onClick={() => setSelectedAddressId('new')}
                    className={`p-6 rounded-sm border border-dashed text-center transition-all flex flex-col items-center justify-center gap-3 group ${selectedAddressId === 'new' ? 'border-charcoal bg-hanji-white/40 ring-1 ring-charcoal' : 'border-border-light hover:border-muted'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-hanji-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5 text-muted" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted">+ 새 배송지 직접 입력</span>
                  </button>
                </div>
              )}

              {/* 2. 직접 입력 폼 (비회원 기본 / 회원 조건부) */}
              {(selectedAddressId === 'new' || !session) && (
                <div className={`space-y-6 ${session ? 'pt-8 border-t border-border-light animate-in fade-in slide-in-from-top-4 duration-500' : ''}`}>
                  {!session && <p className="text-[10px] uppercase tracking-widest font-bold text-deep-sage mb-4 italic">* 비회원 주문을 위해 배송 정보를 입력해 주세요.</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-muted">수령인</label>
                      <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="성함" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-muted">연락처</label>
                      <input required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="010-0000-0000" />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted">우편번호</label>
                        <input required readOnly value={formData.postcode} className="w-full border-b border-border-light py-2 focus:outline-none bg-hanji-white/30" placeholder="00000" />
                      </div>
                      <button type="button" onClick={handleAddressSearch} className="px-6 py-2.5 bg-charcoal text-white text-[10px] uppercase tracking-widest font-bold rounded-sm hover:bg-deep-sage transition-all">
                        주소 찾기
                      </button>
                    </div>
                    <input required readOnly value={formData.address} className="w-full border-b border-border-light py-2 focus:outline-none bg-hanji-white/30" placeholder="기본 주소" />
                    <input required value={formData.detailAddress} onChange={(e) => setFormData({...formData, detailAddress: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage" placeholder="상세 주소" />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-8 border-t border-border-light/50 mt-8">
                <label className="text-[10px] uppercase tracking-widest font-bold text-muted">배송 메모</label>
                <input value={formData.memo} onChange={(e) => setFormData({...formData, memo: e.target.value})} className="w-full border-b border-border-light py-2 focus:outline-none focus:border-deep-sage bg-transparent" placeholder="요청 사항을 입력해 주세요" />
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
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData({...formData, paymentMethod: method.id})}
                    className={`py-5 rounded-sm border transition-all text-sm font-medium ${formData.paymentMethod === method.id ? 'border-charcoal bg-charcoal text-white shadow-md' : 'border-border-light hover:border-charcoal'}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8">
            <section className="bg-white border border-border-light p-10 rounded-sm shadow-sm">
              <h2 className="font-serif text-xl mb-8 border-b border-border-light pb-4">주문 요약</h2>
              <div className="space-y-6 max-h-[40vh] overflow-y-auto pr-4 mb-8 custom-scrollbar">
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
                {/* 적립금 및 쿠폰 (회원 전용) */}
                {session && (
                  <div className="space-y-6 pb-6 border-b border-border-light/50">
                    {/* 쿠폰 선택 */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-muted">쿠폰 적용</label>
                      <select 
                        onChange={(e) => {
                          const coupon = coupons.find(c => c.id === e.target.value);
                          setSelectedCoupon(coupon || null);
                        }}
                        className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm text-sm focus:border-deep-sage outline-none"
                      >
                        <option value="">적용 가능한 쿠폰을 선택하세요</option>
                        {coupons.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.coupons.name} ({c.coupons.discount_type === 'rate' ? `${c.coupons.discount_value}%` : `${c.coupons.discount_value.toLocaleString()}원`} 할인)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 적립금 사용 */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted">적립금 사용</label>
                        <span className="text-[10px] text-deep-sage font-medium">보유: ₩{userPoints.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-3">
                        <input 
                          type="number"
                          value={usePoints}
                          onChange={(e) => {
                            const val = Math.min(userPoints, Number(e.target.value));
                            setUsePoints(val);
                          }}
                          className="flex-1 bg-hanji-white/30 border border-border-light px-4 py-2.5 rounded-sm text-sm focus:border-deep-sage outline-none"
                          placeholder="0"
                        />
                        <button 
                          type="button"
                          onClick={() => setUsePoints(userPoints)}
                          className="px-4 py-2 bg-charcoal text-white text-[10px] uppercase tracking-widest font-bold rounded-sm hover:bg-deep-sage transition-all"
                        >
                          전액 사용
                        </button>
                      </div>
                    </div>

                    {/* 프로모션 코드 (추가) */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-muted">프로모션 코드</label>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 bg-hanji-white/30 border border-border-light px-4 py-2.5 rounded-sm text-sm focus:border-deep-sage outline-none uppercase"
                          placeholder="코드 입력"
                        />
                        <button 
                          type="button"
                          onClick={handleApplyPromoCode}
                          className="px-4 py-2 bg-charcoal text-white text-[10px] uppercase tracking-widest font-bold rounded-sm hover:bg-deep-sage transition-all"
                        >
                          적용
                        </button>
                      </div>
                      {appliedCoupon && <p className="text-[10px] text-deep-sage font-bold">✓ {appliedCoupon.name} 적용됨</p>}
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm text-muted">
                  <span>총 상품 금액</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>배송비</span>
                  <span>{shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`}</span>
                </div>
                {usePoints > 0 && (
                  <div className="flex justify-between text-sm text-terracotta">
                    <span>적립금 할인</span>
                    <span>- ₩{usePoints.toLocaleString()}</span>
                  </div>
                )}
                {(couponDiscount > 0 || promoDiscount > 0) && (
                  <div className="flex justify-between text-sm text-terracotta">
                    <span>쿠폰/코드 할인</span>
                    <span>- ₩{(couponDiscount + promoDiscount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-serif text-charcoal pt-4 border-t border-border-light">
                  <span>최종 결제 금액</span>
                  <span className="text-2xl">₩{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-charcoal text-white py-6 rounded-sm mt-10 hover:bg-deep-sage transition-all font-serif text-xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm font-sans uppercase tracking-widest">Processing...</span>
                  </>
                ) : (
                  <>₩{finalTotal.toLocaleString()} 결제하기</>
                )}
              </button>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
