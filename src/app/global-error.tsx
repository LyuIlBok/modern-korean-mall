'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans text-charcoal bg-hanji-white">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-8 p-8 bg-white border border-border-light rounded-sm shadow-sm">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-terracotta" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="font-serif text-2xl text-charcoal">시스템 전체 오류가 발생했습니다.</h2>
              <p className="text-sm text-muted leading-relaxed">
                현재 일시적으로 서비스를 이용하실 수 없습니다.<br />
                빠르게 복구하기 위해 노력 중입니다.
              </p>
            </div>

            <button
              onClick={() => reset()}
              className="w-full flex items-center justify-center gap-2 bg-charcoal text-white py-4 px-6 rounded-sm hover:bg-deep-sage transition-all text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              애플리케이션 재시작
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
