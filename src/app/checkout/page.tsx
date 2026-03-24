'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Hydration 문제를 완벽히 해결하기 위해 SSR을 비활성화하고 클라이언트에서만 렌더링
const CheckoutClient = dynamic(() => import('./CheckoutClient'), {
  ssr: false,
  loading: () => (
    <div className="bg-hanji-white min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
    </div>
  )
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
