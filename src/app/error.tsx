'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8 p-8 bg-white border border-border-light rounded-sm shadow-sm">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-terracotta" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="font-serif text-2xl text-charcoal">앗! 일시적인 오류가 발생했습니다.</h2>
          <p className="text-sm text-muted leading-relaxed">
            요청하신 페이지를 처리하는 중 문제가 발생했습니다.<br />
            잠시 후 다시 시도해 주세요.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-hanji-white text-[10px] text-left font-mono overflow-auto max-h-32 border border-border-light rounded text-terracotta">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 bg-charcoal text-white py-3 px-6 rounded-sm hover:bg-deep-sage transition-all text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시도
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 border border-border-light text-charcoal py-3 px-6 rounded-sm hover:bg-hanji-white transition-all text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
