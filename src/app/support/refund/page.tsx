'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCcw, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

export default function RefundPolicyPage() {
  return (
    <div className="flex-1 bg-hanji-white py-20 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-charcoal mb-12 transition-colors text-sm uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-12 border border-border-light rounded-sm shadow-sm">
          <h1 className="font-serif text-4xl mb-12 text-charcoal border-b border-border-light pb-8">교환 및 반품 안내</h1>

          <div className="space-y-12 text-sm text-charcoal/80 leading-relaxed">
            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <RefreshCcw className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">취소 및 반품 규정</h2>
              </div>
              <ul className="list-disc pl-5 space-y-3 font-normal">
                <li>상품의 결함이나 오배송의 경우, 상품 수령 후 2일 이내에 고객센터로 연락 주시면 100% 교환 및 환불이 가능합니다.</li>
                <li>농산물(신선식품)의 특성상 단순 변심에 의한 반품이나 교환은 불가하오니 신중한 구매 부탁드립니다.</li>
                <li>상품이 배송 중 파손된 경우, 택배 박스와 상품의 사진을 찍어 고객센터로 보내주시면 빠른 처리가 가능합니다.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-deep-sage">
                <AlertCircle className="w-5 h-5" />
                <h2 className="font-serif text-xl font-bold">반품/교환이 제한되는 경우</h2>
              </div>
              <ul className="list-disc pl-5 space-y-3 font-normal">
                <li>고객님의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우</li>
                <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우 (신선식품 등)</li>
                <li>고객님의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="bg-hanji-white p-6 border border-border-light rounded-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-deep-sage" />
                <h2 className="font-serif text-lg font-bold">환불 프로세스</h2>
              </div>
              <p className="font-normal">
                반품 승인 후 영업일 기준 3~5일 이내에 결제하신 수단으로 환불 처리됩니다. <br/>
                신용카드의 경우 카드사에 따라 결제 취소 반영 기간이 상이할 수 있습니다.
              </p>
            </section>

            <div className="pt-8 border-t border-border-light text-center">
              <p className="text-muted text-sm mb-4">도움이 필요하신가요?</p>
              <p className="font-serif text-lg">
                고객센터: {CONFIG.CONTACT_PHONE !== '010-0000-0000' ? CONFIG.CONTACT_PHONE : CONFIG.CONTACT_EMAIL}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
