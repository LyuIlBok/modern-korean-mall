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
  MapPin, User, Phone, Mail, CheckCircle, Loader2, ShieldCheck,
  Tag, Ticket, Percent, ChevronDown, Check, X
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';
import CheckoutItem from '@/components/CheckoutItem';
import DaumPostcode from 'react-daum-postcode';
import { motion, AnimatePresence } from 'framer-motion';

interface Address {
  id: string;
  address_name: string;
  receiver_name: string;
  receiver_phone: string;
  postcode: string;
  address: string;
  detail_address: string;
  is_default: boolean;
}

export default function CheckoutInternal() {
  const router = useRouter();
  const { t, language } = useLanguageStore();
  const { items, getTotalPrice, getShippingFee, clearCart } = useCartStore();
  const hasMounted = useHasMounted();

  const [isLoading, setIsLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [formData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    postcode: '',
    address: '',
    detailAddress: '',
    memo: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const validateName = (name: string) => {
    if (!name.trim()) return '성함을 입력해 주세요.';
    if (name.trim().length < 2) return '성함을 2자 이상 입력해 주세요.';
    return '';
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return '이메일을 입력해 주세요.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '올바른 이메일 형식을 입력해 주세요.';
    return '';
  };

  const validatePhone = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) return '연락처를 입력해 주세요.';
    if (cleanPhone.length < 10 || cleanPhone.length > 11) return '올바른 연락처 형식을 입력해 주세요 (10~11자).';
    return '';
  };

  const handleBlur = (field: 'name' | 'email' | 'phone') => {
    let error = '';
    if (field === 'name') error = validateName(formData.name);
    if (field === 'email') error = validateEmail(formData.email);
    if (field === 'phone') error = validatePhone(formData.phone);
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

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

        // Fetch saved addresses
        setAddressLoading(true);
        const { data: addresses } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false });
        
        if (addresses) setSavedAddresses(addresses);
        setAddressLoading(false);
      }
    };
    loadProfile();
  }, []);

  const selectAddress = (addr: Address) => {
    setProfileData(prev => ({
      ...prev,
      name: addr.receiver_name,
      phone: addr.receiver_phone,
      postcode: addr.postcode,
      address: addr.address,
      detailAddress: addr.detail_address || ''
    }));
  };

  const handleAddressComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setProfileData(prev => ({
      ...prev,
      postcode: data.zonecode,
      address: fullAddress
    }));
    setIsAddressModalOpen(false);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    
    const currentSubtotal = items.reduce((sum, item) => sum + (item.price + (item.optionPrice || 0)) * item.quantity, 0);

    try {
      const res = await fetch('/api/coupons/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: couponCode, 
          amount: currentSubtotal
        })
      });
      
      const result = await res.json();
      if (res.ok) {
        setDiscountAmount(result.discount_amount);
        setIsCouponApplied(true);
        alert(`${t.checkout.coupon} ${t.checkout.apply}되었습니다: -${result.discount_amount.toLocaleString()}원`);
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
    
    // Final validation before payment
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const phoneErr = validatePhone(formData.phone);
    
    if (nameErr || emailErr || phoneErr || !formData.address) {
      setErrors({
        name: nameErr,
        email: emailErr,
        phone: phoneErr
      });
      alert('입력 정보를 다시 확인해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const subtotal = items.reduce((sum, item) => sum + (item.price + (item.optionPrice || 0)) * item.quantity, 0);
      const shipping = getShippingFee();
      const finalAmount = Math.max(0, subtotal + shipping - discountAmount);

      // 1. Create Order in DB (Status: '결제대기')
      const isGuest = !session?.user?.id;
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session?.user?.id || null,
          customer_name: formData.name,
          customer_phone: formData.phone,
          guest_email: isGuest ? formData.email : null,
          guest_phone: isGuest ? formData.phone : null,
          address: `(${formData.postcode}) ${formData.address} ${formData.detailAddress}`,
          total_price: finalAmount,
          status: '결제대기',
          payment_method: paymentMethod,
          memo: formData.memo
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items (Snapshot product name and price)
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price + (item.optionPrice || 0), // Live calculation for current order
        product_name: item.name, // Snapshot
        product_price: item.price + (item.optionPrice || 0), // Snapshot price
        option_name: item.optionName || null
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // 2.5. Record Purchase Reward Points (1% of finalAmount)
      if (session?.user?.id) {
        const rewardPoints = Math.floor(finalAmount * 0.01);
        if (rewardPoints > 0) {
          await supabase.from('point_logs').insert([{
            user_id: session.user.id,
            amount: rewardPoints,
            reason: 'PURCHASE_REWARD'
          }]);
        }
      }

      // 3. Trigger PortOne V2
      if (paymentMethod === 'card') {
        const PortOne = (window as any).PortOne;
        if (!PortOne) throw new Error('PortOne SDK not loaded');

        const payment = await PortOne.requestPayment({
          storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID || 'store-cfimyvvecsoqeicsjezo',
          channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || 'channel-key-test',
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
          // Payment failed
          console.error('Payment failure:', payment.message);
          alert('결제 실패: ' + payment.message);
          return;
        }

        // Success (for popup mode)
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: '결제완료', 
            pg_tid: payment.paymentId 
          })
          .eq('id', order.id);

        if (updateError) console.error('Order status sync error:', updateError);
        
        // 4. Send Order Confirmation Email (Async, fail silently)
        fetch('/api/email/order-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            email: formData.email,
            buyerName: formData.name,
            totalAmount: finalAmount,
            items: items.map(i => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price + (i.optionPrice || 0),
              optionName: i.optionName
            }))
          })
        }).catch(err => console.error('Email trigger error:', err));

        clearCart();
        router.push(`/order-success?orderId=${order.id}`);
      } else {
        // 무통장 입금 등 다른 수단 처리
        // For transfer, we also send confirmation email
        fetch('/api/email/order-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            email: formData.email,
            buyerName: formData.name,
            totalAmount: finalAmount,
            items: items.map(i => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price + (i.optionPrice || 0),
              optionName: i.optionName
            }))
          })
        }).catch(err => console.error('Email trigger error:', err));

        clearCart();
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
          <h2 className="font-serif text-2xl">{t.cart.empty}</h2>
          <Link href="/shop" className="inline-block bg-charcoal text-white px-10 py-4 rounded-sm hover:bg-deep-sage transition-all font-bold uppercase tracking-widest text-xs">{t.mypage.goToShop}</Link>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price + (item.optionPrice || 0)) * item.quantity, 0);
  const shipping = getShippingFee();
  const finalTotal = Math.max(0, subtotal + shipping - discountAmount);

  return (
    <div className="bg-hanji-white min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <Script src="https://cdn.portone.io/v2/browser-sdk.js" />
      
      {/* Daum Postcode Modal */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="bg-hanji-white p-6 border-b border-border-light flex justify-between items-center">
                <h3 className="font-serif text-xl text-charcoal">{t.checkout.searchAddress}</h3>
                <button type="button" onClick={() => setIsAddressModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X className="w-6 h-6 text-muted" />
                </button>
              </div>
              <div className="p-2">
                <DaumPostcode onComplete={handleAddressComplete} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border-light pb-10">
          <div className="space-y-4">
            <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors text-sm uppercase tracking-widest font-bold">
              <ArrowLeft className="w-4 h-4" /> Back to Cart
            </Link>
            <h1 className="font-serif text-5xl text-charcoal tracking-tight">{t.checkout.title || '주문서 작성'}</h1>
          </div>
          <div className="flex items-center gap-2 text-deep-sage font-bold text-xs uppercase tracking-[0.3em]">
            <ShieldCheck className="w-5 h-5" /> Secure Checkout
          </div>
        </header>

        <form onSubmit={handlePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Delivery Info */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-charcoal text-white rounded-full flex items-center justify-center text-sm font-serif italic border-2 border-border-light">01</div>
                <h2 className="font-serif text-3xl text-charcoal">{t.checkout.shippingInfo}</h2>
              </div>

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-widest text-muted font-bold ml-1">{t.checkout.savedAddress}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => selectAddress(addr)}
                        className="text-left p-6 bg-white border border-border-light rounded-sm hover:border-deep-sage transition-all group relative overflow-hidden shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-charcoal">{addr.address_name}</span>
                          {addr.is_default && <span className="text-[10px] bg-deep-sage text-white px-2 py-0.5 rounded-full uppercase font-extrabold">{t.mypage.defaultAddress}</span>}
                        </div>
                        <p className="text-sm text-muted mb-1">{addr.receiver_name} | {addr.receiver_phone}</p>
                        <p className="text-xs text-muted leading-relaxed line-clamp-1">({addr.postcode}) {addr.address} {addr.detail_address}</p>
                        <div className="absolute bottom-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle className="w-5 h-5 text-deep-sage" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-10 rounded-sm border border-border-light shadow-sm">
                <div className="space-y-3 md:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-muted font-bold ml-1">{t.checkout.name}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30" />
                    <input 
                      required 
                      value={formData.name} 
                      onChange={e => setProfileData({...formData, name: e.target.value})} 
                      onBlur={() => handleBlur('name')}
                      className={`w-full bg-hanji-white/30 border ${errors.name ? 'border-terracotta' : 'border-border-light'} pl-12 pr-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all`} 
                      placeholder={t.checkout.name} 
                    />
                  </div>
                  {errors.name && <p className="text-xs text-terracotta font-medium ml-1">{errors.name}</p>}
                  {!errors.name && <p className="text-xs text-muted/60 ml-1 italic">{t.checkout.nameHelp}</p>}
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-muted font-bold ml-1">{t.checkout.phone}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30" />
                    <input 
                      required 
                      value={formData.phone} 
                      onChange={e => setProfileData({...formData, phone: e.target.value})} 
                      onBlur={() => handleBlur('phone')}
                      className={`w-full bg-hanji-white/30 border ${errors.phone ? 'border-terracotta' : 'border-border-light'} pl-12 pr-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all`} 
                      placeholder="010-0000-0000" 
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-terracotta font-medium ml-1">{errors.phone}</p>}
                  {!errors.phone && <p className="text-xs text-muted/60 ml-1 italic">{t.checkout.phoneHelp}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-muted font-bold ml-1">Email</label>
                  {savedAddresses.length > 0 && formData.email ? (
                    <div className="w-full bg-hanji-white/10 border border-border-light px-4 py-5 rounded-sm text-base text-muted font-mono">{formData.email}</div>
                  ) : (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30" />
                      <input 
                        required 
                        type="email"
                        value={formData.email} 
                        onChange={e => setProfileData({...formData, email: e.target.value})} 
                        onBlur={() => handleBlur('email')}
                        className={`w-full bg-hanji-white/30 border ${errors.email ? 'border-terracotta' : 'border-border-light'} pl-12 pr-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all`} 
                        placeholder="example@email.com" 
                      />
                    </div>
                  )}
                  {errors.email && <p className="text-xs text-terracotta font-medium ml-1">{errors.email}</p>}
                </div>

                <div className="space-y-3 md:col-span-2 pt-4">
                  <label className="text-xs uppercase tracking-widest text-muted font-bold ml-1">{t.checkout.address}</label>
                  <div className="flex gap-2 mb-3">
                    <input required value={formData.postcode} readOnly className="w-40 bg-hanji-white/50 border border-border-light px-4 py-5 rounded-sm text-base font-mono" placeholder={t.checkout.postcode} />
                    <button type="button" onClick={() => setIsAddressModalOpen(true)} className="bg-charcoal text-white px-8 py-5 rounded-sm text-xs uppercase font-bold tracking-widest hover:bg-deep-sage transition-all">{t.checkout.searchAddress}</button>
                  </div>
                  <input required value={formData.address} readOnly className="w-full bg-hanji-white/50 border border-border-light px-4 py-5 rounded-sm text-base mb-3 shadow-inner" placeholder={t.checkout.address} />
                  <input required value={formData.detailAddress} onChange={e => setProfileData({...formData, detailAddress: e.target.value})} className="w-full border border-border-light px-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all shadow-sm" placeholder={t.checkout.detailAddress} />
                  <p className="text-xs text-muted/60 ml-1 italic">{t.checkout.addressHelp}</p>
                </div>

                <div className="space-y-3 md:col-span-2 pt-4">
                  <label className="text-xs uppercase tracking-widest text-muted font-bold ml-1">{t.checkout.memo || '배송 요청사항'}</label>
                  <textarea rows={3} value={formData.memo} onChange={e => setProfileData({...formData, memo: e.target.value})} className="w-full bg-hanji-white/30 border border-border-light px-4 py-5 rounded-sm text-base focus:border-deep-sage outline-none transition-all resize-none" placeholder={t.checkout.memoPlaceholder || '배송 시 요청사항이 있으시면 적어주세요.'} />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-charcoal text-white rounded-full flex items-center justify-center text-sm font-serif italic border-2 border-border-light">02</div>
                <h2 className="font-serif text-3xl text-charcoal">{t.checkout.paymentMethod || '결제 수단'}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <button type="button" onClick={() => setPaymentMethod('card')} className={`p-10 border-2 rounded-sm transition-all flex flex-col items-center gap-6 group shadow-sm ${paymentMethod === 'card' ? 'border-deep-sage bg-deep-sage/5' : 'border-border-light bg-white hover:border-muted'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'bg-deep-sage text-white' : 'bg-hanji-white text-muted group-hover:text-charcoal'}`}><CreditCard className="w-8 h-8" /></div>
                  <span className={`text-xs uppercase font-extrabold tracking-[0.2em] ${paymentMethod === 'card' ? 'text-charcoal' : 'text-muted'}`}>{t.checkout.creditCard || '신용카드'}</span>
                </button>
                <button type="button" onClick={() => setPaymentMethod('transfer')} className={`p-10 border-2 rounded-sm transition-all flex flex-col items-center gap-6 group shadow-sm ${paymentMethod === 'transfer' ? 'border-deep-sage bg-deep-sage/5' : 'border-border-light bg-white hover:border-muted'}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'transfer' ? 'bg-deep-sage text-white' : 'bg-hanji-white text-muted group-hover:text-charcoal'}`}><Wallet className="w-8 h-8" /></div>
                  <span className={`text-xs uppercase font-extrabold tracking-[0.2em] ${paymentMethod === 'transfer' ? 'text-charcoal' : 'text-muted'}`}>{t.checkout.bankTransfer || '무통장 입금'}</span>
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <section className="sticky top-24 bg-charcoal text-white p-12 rounded-sm shadow-2xl space-y-12 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5"><CheckCircle className="w-48 h-48" /></div>
              
              <h2 className="font-serif text-4xl relative z-10">{t.checkout.summary || '주문 요약'}</h2>
              
              <div className="space-y-8 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                {items.map((item) => (
                  <CheckoutItem key={`${item.id}-${item.optionName || 'base'}`} item={item} />
                ))}
              </div>

              {/* Coupon Section */}
              <div className="pt-12 border-t border-white/10 space-y-6 relative z-10">
                <p className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2"><Tag className="w-4 h-4" /> {t.checkout.coupon || '쿠폰 할인'}</p>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input 
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      disabled={isCouponApplied}
                      placeholder={t.checkout.couponPlaceholder || '쿠폰 코드 입력'} 
                      className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-sm text-sm focus:border-white/30 outline-none transition-all placeholder:text-white/20 uppercase font-mono shadow-inner" 
                    />
                  </div>
                  <button 
                    type="button"
                    disabled={isCouponApplied || couponLoading || !couponCode}
                    onClick={handleApplyCoupon}
                    className="bg-white text-charcoal px-8 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-deep-sage hover:text-white transition-all disabled:opacity-20 flex items-center gap-2 shadow-lg"
                  >
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isCouponApplied ? <Check className="w-4 h-4" /> : (t.checkout.apply || '적용')}
                  </button>
                </div>
                {couponError && <p className="text-xs text-terracotta italic font-medium">{couponError}</p>}
                {isCouponApplied && <p className="text-sm text-deep-sage flex items-center gap-2 font-bold bg-white/5 p-3 rounded-sm border border-deep-sage/20"><CheckCircle className="w-4 h-4" /> {t.checkout.coupon} {t.checkout.apply}되었습니다.</p>}
              </div>

              <div className="pt-12 border-t border-white/10 space-y-6 relative z-10 font-medium">
                <div className="flex justify-between text-sm text-white/60 font-light italic"><span>{t.checkout.subtotal || '상품 금액'}</span><span>₩{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-white/60 font-light italic"><span>{t.checkout.shipping || '배송비'}</span><span>{shipping === 0 ? (t.checkout.free || '무료') : `₩${shipping.toLocaleString()}`}</span></div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-terracotta font-bold italic">
                    <span>{t.checkout.discount || '할인 금액'}</span>
                    <span>- ₩{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-8">
                  <span className="font-serif text-xl">{t.checkout.total || '총 결제 금액'}</span>
                  <span className="font-serif text-5xl text-white">₩{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-white text-charcoal py-8 rounded-sm hover:bg-deep-sage hover:text-white transition-all duration-500 font-serif text-3xl flex items-center justify-center gap-6 shadow-2xl relative z-10 group disabled:opacity-50">
                {isLoading ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <span className="text-base uppercase tracking-widest font-sans font-bold">Processing...</span>
                  </>
                ) : (
                  <>₩{finalTotal.toLocaleString()} {t.checkout.payBtn}</>
                )}
              </button>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}
