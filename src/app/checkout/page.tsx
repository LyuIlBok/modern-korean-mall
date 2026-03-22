'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Truck, User, Phone, MapPin, CheckCircle2, Search, ChevronRight, Wallet, X, ShieldCheck, Loader2, AlertTriangle, Sparkles, Heart, PackageCheck, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Script from 'next/script';

declare global {
  interface Window {
    daum: any;
    IMP: any;
  }
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const { t, language } = useLanguageStore();
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    postcode: '',
    address: '',
    detailAddress: '',
    paymentMethod: 'card',
  });

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal >= 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  useEffect(() => {
    const initIMP = () => {
      if (window.IMP) {
        window.IMP.init('imp33000546');
      }
    };
    
    if (window.IMP) {
      initIMP();
    } else {
      const timer = setInterval(() => {
        if (window.IMP) {
          initIMP();
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, []);

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setFormData({ ...formData, postcode: data.zonecode, address: data.address });
      }
    }).open();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      const formatted = value.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3').replace(/^(\d{3})(\d{3,4})$/, '$1-$2');
      setFormData({ ...formData, phone: formatted });
    }
  };

  const requestActualPayment = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert(language === 'ko' ? '배송 정보를 정확히 입력해주세요.' : 'Please fill in delivery info.');
      return;
    }

    setStockError(null);
    setIsLoading(true);
    
    try {
      for (const item of items) {
        const { data } = await supabase.from('products').select('name, stock').eq('id', item.id).single();
        if (data && data.stock < item.quantity) {
          setStockError(language === 'ko' ? `[${data.name}] 상품의 재고가 그 사이 소진되었습니다.` : `[${data.name}] is out of stock.`);
          setIsLoading(false);
          return;
        }
      }

      const { IMP } = window;
      const merchant_uid = `ORD-${new Date().getTime()}`;

      IMP.request_pay({
        pg: 'html5_inicis',
        pay_method: formData.paymentMethod,
        merchant_uid: merchant_uid,
        name: items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name,
        amount: total,
        buyer_email: formData.email,
        buyer_name: formData.name,
        buyer_tel: formData.phone,
        buyer_addr: `${formData.address} ${formData.detailAddress}`,
        buyer_postcode: formData.postcode,
        m_redirect_url: `${window.location.origin}/mypage`,
      }, async (rsp: any) => {
        if (rsp.success) {
          await handlePaymentSuccess(rsp);
        } else {
          alert(language === 'ko' ? `결제가 취소되었습니다: ${rsp.error_msg}` : `Payment failed: ${rsp.error_msg}`);
          setIsLoading(false);
        }
      });
    } catch (err) {
      alert('결제 준비 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
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

      await supabase.from('order_items').insert(orderItems);

      for (const item of items) {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock, is_sold_out: newStock <= 0 }).eq('id', item.id);
        }
      }

      setIsCompleted(true);
      clearCart();
    } catch (error: any) {
      alert('결제는 완료되었으나 주문 정보 기록 중 오류가 발생했습니다. 고객센터로 연락주세요.');
      setIsLoading(false);
    }
  };

  if (items.length === 0 && !isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white h-screen">
        <h1 className="font-serif text-2xl mb-6 text-charcoal">{t?.cart?.empty || 'Empty Cart'}</h1>
        <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-sm hover:bg-deep-sage transition-all text-sm tracking-widest">{t?.common?.shop || 'Shop'}</Link>
      </div>
    );
  }

  // --- 보상형 결제 완료 페이지 디자인 ---
  if (isCompleted) {
    return (
      <div className="flex-1 bg-hanji-white relative overflow-hidden min-h-screen flex items-center justify-center p-4">
        {/* Decorative elements */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          {[...Array(12)].map((_, i) => (
            <motion.div 
              key={i}
              initial={{ y: -20, x: Math.random() * 100 + '%' }}
              animate={{ y: '110vh', rotate: 360 }}
              transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, ease: "linear" }}
              className="absolute text-deep-sage"
            >
              <Leaf className="w-6 h-6 fill-current" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full bg-white border border-border-light shadow-2xl rounded-sm p-12 text-center relative z-10"
        >
          <div className="flex justify-center mb-10">
            <div className="relative">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 bg-deep-sage/10 rounded-full flex items-center justify-center text-deep-sage"
              >
                <PackageCheck className="w-12 h-12" />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-terracotta text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-4 h-4 fill-current" />
              </motion.div>
            </div>
          </div>

          <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-6 leading-tight">
            {language === 'ko' ? '단아한 산물의 여정이 시작되었습니다' : 'A Journey of Pure Gifts Begins'}
          </h1>
          
          <p className="text-muted text-lg mb-12 leading-relaxed font-light">
            {language === 'ko' 
              ? '자연의 결을 선택해주신 당신의 고귀한 안목에 감사를 표합니다.\n정직한 농부의 땀방울이 담긴 산물을 정성을 다해 준비하겠습니다.'
              : 'We thank you for your noble choice of Nature Texture.\nWe will carefully prepare the gifts filled with the farmers sincerity.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 border-y border-border-light/50 py-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border border-border-light rounded-full flex items-center justify-center text-muted italic text-xs">01</div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-deep-sage">Harvest & Selection</p>
              <p className="text-xs text-muted">최상의 상태 선별</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border border-border-light rounded-full flex items-center justify-center text-muted italic text-xs">02</div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-deep-sage">Nature-Safe Packing</p>
              <p className="text-xs text-muted">환경을 생각한 포장</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border border-border-light rounded-full flex items-center justify-center text-muted italic text-xs">03</div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-deep-sage">Direct Delivery</p>
              <p className="text-xs text-muted">산지 직송 출발</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link 
              href="/mypage" 
              className="w-full md:w-auto bg-charcoal text-white px-12 py-4 rounded-sm hover:bg-deep-sage transition-all duration-500 tracking-[0.2em] text-sm uppercase font-medium shadow-xl flex items-center justify-center gap-3 group"
            >
              Order Details <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => router.push('/shop')}
              className="w-full md:w-auto px-12 py-4 border border-border-light text-muted hover:text-charcoal hover:border-charcoal transition-all text-sm uppercase tracking-widest"
            >
              Continue Exploring
            </button>
          </div>

          <div className="mt-16 flex justify-center opacity-30 grayscale hover:opacity-100 transition-all duration-1000">
            <div className="relative w-20 h-20">
              <Image src="/seal.png" alt="복이네농장 인감" fill className="object-contain" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="https://cdn.iamport.kr/v1/iamport.js" strategy="afterInteractive" />
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl mb-12 text-charcoal">{t?.checkout?.title || 'Checkout'}</h1>

        {stockError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-terracotta/10 border border-terracotta/20 p-4 rounded-sm flex items-center gap-3 text-terracotta text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{stockError}</p>
          </motion.div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); requestActualPayment(); }} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <section className="bg-white p-8 border border-border-light rounded-sm shadow-sm">
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4"><Truck className="w-5 h-5 text-deep-sage" /><h2 className="font-serif text-2xl">{t?.checkout?.shippingInfo || 'Shipping'}</h2></div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Name</label>
                    <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Phone</label>
                    <input required value={formData.phone} onChange={handlePhoneChange} type="tel" placeholder="010-0000-0000" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Address</label>
                  <div className="flex gap-2">
                    <input readOnly required value={formData.postcode} placeholder="Postcode" className="w-32 bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                    <button type="button" onClick={handleAddressSearch} className="px-4 py-2 bg-charcoal text-white text-xs rounded-sm hover:bg-deep-sage transition-colors font-medium">Search</button>
                  </div>
                  <input readOnly required value={formData.address} className="w-full bg-hanji-white/50 border border-border-light px-4 py-3 rounded-sm text-sm" />
                  <input required value={formData.detailAddress} onChange={(e) => setFormData({...formData, detailAddress: e.target.value})} placeholder="Detail Address" className="w-full bg-white border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                </div>
              </div>
            </section>

            <section className="bg-white p-8 border border-border-light rounded-sm shadow-sm">
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4"><Wallet className="w-5 h-5 text-deep-sage" /><h2 className="font-serif text-2xl">{t?.checkout?.paymentMethod || 'Payment'}</h2></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'card', name: 'Credit Card' },
                  { id: 'trans', name: 'Bank Transfer' },
                  { id: 'vbank', name: 'Virtual Account' },
                  { id: 'kakaopay', name: 'Kakaopay' },
                ].map((method) => (
                  <label key={method.id} className="relative cursor-pointer">
                    <input type="radio" name="payment" checked={formData.paymentMethod === method.id} onChange={() => setFormData({...formData, paymentMethod: method.id})} className="peer sr-only" />
                    <div className={`p-4 border border-border-light rounded-sm text-center text-sm transition-all peer-checked:border-deep-sage peer-checked:bg-deep-sage/5 hover:border-deep-sage/30`}>
                      {method.name}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-8 rounded-sm shadow-md">
              <h2 className="font-serif text-2xl mb-8 border-b border-border-light pb-4 text-charcoal">{t?.cart?.summary || 'Summary'}</h2>
              <div className="space-y-4 text-sm mb-8 pt-6">
                <div className="flex justify-between text-muted"><span>{t?.cart?.subtotal || 'Subtotal'}</span><span>₩{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted"><span>{t?.cart?.shipping || 'Shipping'}</span><span>{shipping === 0 ? 'FREE' : `₩${shipping.toLocaleString()}`}</span></div>
                <div className="pt-4 border-t border-border-light flex justify-between text-xl font-serif text-charcoal">
                  <span>{t?.cart?.total || 'Total'}</span><span className="text-deep-sage font-bold">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-hanji-white border border-border-light rounded-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input required type="checkbox" className="mt-1 w-4 h-4 accent-deep-sage" />
                  <span className="text-[11px] text-muted leading-relaxed">
                    {t?.checkout?.agreement || 'I agree to the terms.'}
                    <Link href="/support/refund" target="_blank" className="text-charcoal font-medium underline underline-offset-2 mx-1">{t?.common?.refundPolicy || 'Refund Policy'}</Link> 
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all duration-500 font-serif text-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{total.toLocaleString()}{t?.checkout?.payBtn || ' Pay'}</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
