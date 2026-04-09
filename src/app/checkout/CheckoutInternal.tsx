'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useHasMounted } from '@/hooks/useHasMounted';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, ShoppingBag, CreditCard, Wallet, Truck, 
  MapPin, User, Phone, CheckCircle, Loader2, ShieldCheck,
  Tag, Ticket, Percent, ChevronDown, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';

export default function CheckoutInternal() {
  const router = useRouter();
  const { t } = useLanguageStore();
  const { items, getTotalPrice, getShippingFee, clearCart } = useCartStore();
  const hasMounted = useHasMounted();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    postcode: '',
    address: '',
    detailAddress: '',
    memo: ''
  });

  // 쿠폰 관련 상태
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setProfileData(prev => ({
            ...prev,
            name: profile.full_name || '',
            email: session.user.email || '',
            phone: profile.phone || ''
          }));
        }
      }
    };
    loadProfile();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    
    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: couponCode, 
          amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        })
      });
      
      const result = await res.json();
      if (res.ok) {
        setDiscountAmount(result.discount_amount);
        setIsCouponApplied(true);
        alert(`쿠폰이 적용되었습니다: -${result.discount_amount.toLocaleString()}원`);
      } else {
        setCouponError(result.error);
      }
    } catch (err) {
      setCouponError('쿠폰 검증 중 오류가 발생했습니다.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.phone) {
      alert('배송 정보를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = getShippingFee();
      const finalAmount = Math.max(0, subtotal + shipping - discountAmount);

      // 1. Create Order in DB (Status: '결제대기')
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          address: `(${formData.postcode}) ${formData.address} ${formData.detailAddress}`,
          total_price: finalAmount,
          status: '결제대기',
          payment_method: paymentMethod,
          memo: formData.memo
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // 3. Trigger PortOne V2
      if (paymentMethod === 'card') {
        const PortOne = (window as any).PortOne;
        if (!PortOne) throw new Error('PortOne SDK not loaded');

        const payment = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
          paymentId: order.id,
          orderName: items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name,
          totalAmount: finalAmount,
          currency: "CURRENCY_KRW",
          payMethod: "CARD",
          customer: {
            fullName: formData.name,
            phoneNumber: formData.phone,
            email: formData.email,
          },
          redirectUrl: `${window.location.origin}/order-success?orderId=${order.id}`
        });

        // V2는 redirectUrl 방식을 선호하지만, 팝업 방식일 경우 응답 처리
        if (payment.code != null) {
          alert('결제 실패: ' + payment.message);
          return;
        }
      } else {
        // 무통장 입금 등 다른 수단 처리
        router.push(`/order-success?orderId=${order.id}`);
      }

    } catch (err: any) {
      console.error('Payment Error:', err);
      alert('결제 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasMounted) return null;
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-hanji-white flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-border-light"><ShoppingBag className="w-10 h-10 text-muted" /></div>
          <h2 className="font-serif text-2xl">장바구니가 비어 있습니다.</h2>
          <Link href="/shop" className="inline-block bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all font-bold uppercase tracking-widest text-xs">상점으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = getShippingFee();
  const finalTotal = Math.max(0, subtotal + shipping - discountAmount);

  return (
    <div className="bg-hanji-white min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <Script src="https://cdn.portone.io/v2/browser-sdk.js" />
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-light pb-10">
          <div className="space-y-4">
            <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors text-[10px] uppercase tracking-widest font-bold">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
            </Link>
            <h1 className="font-serif text-5xl text-charcoal tracking-tight">주문 / 결제</h1>
          </div>
          <div className="flex items-center gap-2 text-deep-sage font-bold text-[10px] uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4" /> Secure Checkout
          </div>
        </header>

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Delivery Info */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-charcoal text-white rounded-full flex items-center justify-center text-xs font-serif italic">01</div>
                <h2 className="font-serif text-2xl text-charcoal">배송 정보</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-10 rounded-sm border border-border-light shadow-sm">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required value={formData.name} onChange={e => setProfileData({...formData, name: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" placeholder="받으시는 분 성함" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                    <input required value={formData.phone} onChange={e => setProfileData({...formData, phone: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light pl-11 pr-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" placeholder="010-0000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Email</label>
                  <div className="w-full bg-hanji-white/10 border border-border-light px-4 py-4 rounded-sm text-sm text-muted font-mono">{formData.email || 'guest@nature.com'}</div>
                </div>

                <div className="space-y-2 md:col-span-2 pt-4">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Address</label>
                  <div className="flex gap-2 mb-3">
                    <input required value={formData.postcode} readOnly className="w-32 bg-hanji-white/50 border border-border-light px-4 py-4 rounded-sm text-sm font-mono" placeholder="우편번호" />
                    <button type="button" onClick={() => {}} className="bg-charcoal text-white px-6 py-4 rounded-sm text-[10px] uppercase font-bold tracking-widest hover:bg-deep-sage transition-all">Search</button>
                  </div>
                  <input required value={formData.address} readOnly className="w-full bg-hanji-white/50 border border-border-light px-4 py-4 rounded-sm text-sm mb-3" placeholder="주소" />
                  <input required value={formData.detailAddress} onChange={e => setProfileData({...formData, detailAddress: e.target.value})} className="w-full border border-border-light px-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all" placeholder="상세 주소를 입력해 주세요" />
                </div>

                <div className="space-y-2 md:col-span-2 pt-4">
                  <label className="text-[10px] uppercase tracking-widest text-muted font-bold ml-1">Order Memo</label>
                  <textarea rows={3} value={formData.memo} onChange={e => setProfileData({...formData, memo: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-4 py-4 rounded-sm text-sm focus:border-deep-sage outline-none transition-all resize-none" placeholder="배송 시 요청사항이 있으시면 적어주세요." />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-charcoal text-white rounded-full flex items-center justify-center text-xs font-serif italic">02</div>
                <h2 className="font-serif text-2xl text-charcoal">결제 수단</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setPaymentMethod('card')} className={`p-8 border rounded-sm transition-all flex flex-col items-center gap-4 group ${paymentMethod === 'card' ? 'border-deep-sage bg-deep-sage/5' : 'border-border-light bg-white hover:border-muted'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'bg-deep-sage text-white' : 'bg-hanji-white text-muted group-hover:text-charcoal'}`}><CreditCard className="w-6 h-6" /></div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${paymentMethod === 'card' ? 'text-charcoal' : 'text-muted'}`}>Credit Card</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('transfer')} className={`p-8 border rounded-sm transition-all flex flex-col items-center gap-4 group ${paymentMethod === 'transfer' ? 'border-deep-sage bg-deep-sage/5' : 'border-border-light bg-white hover:border-muted'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'transfer' ? 'bg-deep-sage text-white' : 'bg-hanji-white text-muted group-hover:text-charcoal'}`}><Wallet className="w-6 h-6" /></div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${paymentMethod === 'transfer' ? 'text-charcoal' : 'text-muted'}`}>Bank Transfer</span>
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <section className="sticky top-24 bg-charcoal text-white p-10 rounded-sm shadow-2xl space-y-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle className="w-40 h-40" /></div>
              
              <h2 className="font-serif text-3xl relative z-10">Order Summary</h2>
              
              <div className="space-y-6 relative z-10 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-6 items-center group">
                    <div className="relative w-16 h-20 rounded-sm overflow-hidden flex-shrink-0 border border-white/10"><Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" /></div>
                    <div className="flex-1 space-y-1">
                      <p className="font-serif text-sm line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{item.quantity} units / ₩{item.price.toLocaleString()}</p>
                    </div>
                    <p className="font-serif text-sm">₩{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="pt-10 border-t border-white/10 space-y-4 relative z-10">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2"><Tag className="w-3 h-3" /> Discount Coupon</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      disabled={isCouponApplied}
                      placeholder="ENTER CODE" 
                      className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-3 rounded-sm text-xs focus:border-white/30 outline-none transition-all placeholder:text-white/20 uppercase font-mono" 
                    />
                  </div>
                  <button 
                    type="button"
                    disabled={isCouponApplied || couponLoading || !couponCode}
                    onClick={handleApplyCoupon}
                    className="bg-white text-charcoal px-6 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-deep-sage hover:text-white transition-all disabled:opacity-20 flex items-center gap-2"
                  >
                    {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isCouponApplied ? <Check className="w-3.5 h-3.5" /> : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-[10px] text-terracotta italic">{couponError}</p>}
                {isCouponApplied && <p className="text-[10px] text-deep-sage flex items-center gap-1 font-bold"><CheckCircle className="w-3 h-3" /> WELCOME3000 쿠폰이 적용되었습니다.</p>}
              </div>

              <div className="pt-10 border-t border-white/10 space-y-4 relative z-10">
                <div className="flex justify-between text-xs text-white/60 font-light italic"><span>Subtotal</span><span>₩{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-white/60 font-light italic"><span>Shipping Fee</span><span>{shipping === 0 ? 'Free' : `₩${shipping.toLocaleString()}`}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-terracotta font-bold italic">
                    <span>Discount</span>
                    <span>- ₩{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-6">
                  <span className="font-serif text-lg">Total Amount</span>
                  <span className="font-serif text-4xl text-white">₩{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-white text-charcoal py-6 rounded-sm hover:bg-deep-sage hover:text-white transition-all duration-500 font-serif text-2xl flex items-center justify-center gap-4 shadow-2xl relative z-10 group disabled:opacity-50">
                {isLoading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm uppercase tracking-widest font-sans font-bold">Processing...</span>
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
