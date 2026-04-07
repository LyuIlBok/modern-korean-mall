'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

export const viewport = { width: 'device-width', initialScale: 1 };

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
