'use client';

import dynamic from 'next/dynamic';

/**
 * [Checkout Page Entry]
 */
const CheckoutInternal = dynamic(() => import('./CheckoutInternal'), {
  ssr: false,
  loading: () => (
    <div className="bg-hanji-white min-h-screen flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-deep-sage border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[13px] uppercase tracking-[0.3em] font-bold text-muted animate-pulse">
        Initializing Checkout...
      </p>
    </div>
  )
});

export default function CheckoutPage() {
  return <CheckoutInternal />;
}
