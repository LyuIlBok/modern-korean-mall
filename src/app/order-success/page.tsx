'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { CONFIG } from '@/lib/config';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const method = searchParams.get('method');
  const isTransfer = method === 'transfer';

  return (
    <div className="bg-hanji-white min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-border-light p-12 text-center shadow-xl rounded-sm"
      >
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-deep-sage/10 rounded-full">
            <CheckCircle className="w-16 h-16 text-deep-sage" />
          </div>
        </div>

        <h1 className="font-serif text-4xl text-charcoal mb-4">주문이 완료되었습니다</h1>
        <p className="text-muted font-light leading-relaxed mb-8">
          복이네농장의 정직한 산물을 선택해 주셔서 감사합니다.<br />
          정성껏 준비하여 신선하게 배송해 드리겠습니다.
        </p>

        {isTransfer && (
          <div className="mb-8 p-6 bg-deep-sage/5 border-2 border-deep-sage/30 rounded-sm text-left space-y-2">
            <p className="text-xs font-bold text-deep-sage uppercase tracking-widest mb-2">입금 계좌 안내</p>
            <p className="text-sm text-charcoal">
              <span className="font-bold">{CONFIG.BANK_ACCOUNT.bankName}</span>{' '}
              {CONFIG.BANK_ACCOUNT.accountNumber} ({CONFIG.BANK_ACCOUNT.accountHolder})
            </p>
            <p className="text-xs text-muted leading-relaxed">
              24시간 이내 미입금 시 주문이 자동 취소될 수 있습니다. 입금자명이 주문자명과 다르면 고객센터로 알려주세요.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <Link
            href="/mypage"
            className="w-full bg-charcoal text-white py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-deep-sage transition-all font-medium shadow-lg"
          >
            주문 내역 확인하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/shop"
            className="w-full bg-white border border-border-light text-charcoal py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-hanji-white transition-all font-medium"
          >
            <ShoppingBag className="w-4 h-4" /> 계속 쇼핑하기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessContent />
    </Suspense>
  );
}
