'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import Image from 'next/image';

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 p-8 bg-white border border-border-light rounded-sm shadow-sm">
        <div className="flex justify-center">
          <div className="relative w-14 h-14">
            <Image src="/icons/icon-192.png" alt="자연의 결" fill className="object-contain rounded-full" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-hanji-white rounded-full flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted" />
            </div>
          </div>
          <h2 className="font-serif text-2xl text-charcoal">인터넷 연결이 필요합니다</h2>
          <p className="text-sm text-muted leading-relaxed">
            현재 오프라인 상태라 이 페이지를 불러올 수 없습니다.<br />
            연결이 복구되면 자동으로 다시 이용하실 수 있습니다.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 bg-charcoal text-white py-3 px-6 rounded-sm hover:bg-deep-sage transition-all text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    </div>
  );
}
