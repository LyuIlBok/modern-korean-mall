'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Truck, User, Phone, MapPin, CheckCircle2, Search, ChevronRight, Wallet, X, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
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
  const shipping = subtotal > 50000 || items.length === 0 ? 0 : 3000;
  const total = subtotal + shipping;

  // 실제 상점 식별코드 초기화
  useEffect(() => {
    const initIMP = () => {
      if (window.IMP) {
        window.IMP.init('imp33000546'); // 유일복님의 상점 식별코드 적용
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

  // 실제 결제 실행
  const handlePayment = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert(language === 'ko' ? '배송 정보를 모두 입력해주세요.' : 'Please fill in all shipping information.');
      return;
    }

    setStockError(null);
    setIsLoading(true);
    
    // 1. 재고 최종 확인
    try {
      for (const item of items) {
        const { data } = await supabase.from('products').select('name, stock').eq('id', item.id).single();
        if (data && data.stock < item.quantity) {
          setStockError(language === 'ko' ? `[${data.name}] 재고가 부족합니다.` : `[${data.name}] is out of stock.`);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      setIsLoading(false);
      return;
    }

    // 2. 결제창 요청
    const { IMP } = window;
    const merchant_uid = `ord_${new Date().getTime()}`;

    IMP.request_pay({
      pg: 'html5_inicis', // 기본 KG이니시스 (토스페이먼츠 등 연동된 PG에 따라 자동 전환 가능)
      pay_method: formData.paymentMethod,
      merchant_uid: merchant_uid,
      name: items.length > 1 ? `${items[0].name} 외 ${items.length - 1}건` : items[0].name,
      amount: total,
      buyer_email: formData.email,
      buyer_name: formData.name,
      buyer_tel: formData.phone,
      buyer_addr: `${formData.address} ${formData.detailAddress}`,
      buyer_postcode: formData.postcode,
      m_redirect_url: `${window.location.origin}/auth/callback`, // 모바일 결제 후 복귀 주소
    }, async (rsp: any) => {
      if (rsp.success) {
        // 결제 성공 시 DB 저장 및 재고 차감
        await saveOrderToDB(rsp);
      } else {
        alert(language === 'ko' ? `결제에 실패하였습니다: ${rsp.error_msg}` : `Payment failed: ${rsp.error_msg}`);
        setIsLoading(false);
      }
    });
  };

  const saveOrderToDB = async (paymentData: any) => {
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

      // 재고 차감 로직
      for (const item of items) {
        const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (currentProd) {
          const newStock = Math.max(0, currentProd.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock, is_sold_out: newStock <= 0 }).eq('id', item.id);
        }
      }

      setIsCompleted(true);
      clearCart();
    } catch (error: any) {
      alert('결제는 성공했으나 주문 정보 저장 중 오류가 발생했습니다. 고객센터로 연락주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0 && !isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white h-screen">
        <h1 className="font-serif text-2xl mb-6 text-charcoal">{t?.checkout?.title} - {t?.cart?.empty}</h1>
        <Link href="/shop" className="text-deep-sage border-b border-deep-sage pb-1 text-sm">{t?.common?.shop}</Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-hanji-white text-center h-screen">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8 text-deep-sage">
          <CheckCircle2 className="w-20 h-20 mx-auto" />
        </motion.div>
        <h1 className="font-serif text-4xl mb-4 text-charcoal">{t?.checkout?.successTitle}</h1>
        <p className="text-muted mb-10 leading-relaxed text-sm">{t?.checkout?.successDesc}</p>
        <Link href="/mypage" className="bg-charcoal text-white px-10 py-3 rounded-sm hover:bg-deep-sage transition-all text-sm tracking-widest">{t?.common?.mypage}</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-hanji-white py-12 px-4 sm:px-6 lg:px-8 min-h-screen font-sans">
      <Script src="https://cdn.iamport.kr/v1/iamport.js" strategy="afterInteractive" />
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl mb-12 text-charcoal">{t?.checkout?.title}</h1>

        {stockError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-terracotta/10 border border-terracotta/20 p-4 rounded-sm flex items-center gap-3 text-terracotta text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{stockError}</p>
          </motion.div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <section className="bg-white p-8 border border-border-light rounded-sm shadow-sm">
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4"><Truck className="w-5 h-5 text-deep-sage" /><h2 className="font-serif text-2xl">{t?.checkout?.shippingInfo}</h2></div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Name</label>
                    <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted uppercase tracking-widest ml-1">Phone</label>
                    <input required value={formData.phone} onChange={handlePhoneChange} type="tel" className="w-full bg-hanji-white/30 border border-border-light px-4 py-3 rounded-sm focus:outline-none focus:border-deep-sage text-sm" />
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
              <div className="flex items-center gap-2 mb-8 border-b border-border-light pb-4"><Wallet className="w-5 h-5 text-deep-sage" /><h2 className="font-serif text-2xl">{t?.checkout?.paymentMethod}</h2></div>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { id: 'card', name: 'Credit Card' },
                  { id: 'trans', name: 'Bank Transfer' },
                  { id: 'vbank', name: 'Virtual Account' },
                  { id: 'kakaopay', name: 'Kakaopay' },
                ].map((method) => (
                  <label key={method.id} className="relative cursor-pointer">
                    <input type="radio" name="payment" checked={formData.paymentMethod === method.id} onChange={() => setFormData({...formData, paymentMethod: method.id})} className="peer sr-only" />
                    <div className="p-4 border border-border-light rounded-sm text-center text-sm transition-all peer-checked:border-deep-sage peer-checked:bg-deep-sage/5">
                      {method.name}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white border border-border-light p-8 rounded-sm shadow-md">
              <h2 className="font-serif text-2xl mb-8 border-b border-border-light pb-4 text-charcoal">{t?.cart?.summary}</h2>
              <div className="space-y-4 text-sm mb-8 pt-6">
                <div className="flex justify-between text-muted"><span>{t?.cart?.subtotal}</span><span>₩{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-muted"><span>{t?.cart?.shipping}</span><span>{shipping === 0 ? 'FREE' : `₩${shipping.toLocaleString()}`}</span></div>
                <div className="pt-4 border-t border-border-light flex justify-between text-xl font-serif text-charcoal">
                  <span>{t?.cart?.total}</span><span className="text-deep-sage font-bold">₩{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-hanji-white border border-border-light rounded-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input required type="checkbox" className="mt-1 w-4 h-4 accent-deep-sage" />
                  <span className="text-[11px] text-muted leading-relaxed">
                    {t?.checkout?.agreement}
                    <Link href="/support/refund" target="_blank" className="text-charcoal font-medium underline underline-offset-2 mx-1">{t?.common?.refundPolicy}</Link> 
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-charcoal text-white py-5 rounded-sm hover:bg-deep-sage transition-all duration-500 font-serif text-xl shadow-lg flex items-center justify-center gap-3"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{total.toLocaleString()}{t?.checkout?.payBtn}</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
