'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'boki_pwa_install_dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // 브라우저의 기본 설치 미니 배너 대신, 브랜드 톤에 맞춘 커스텀 배너를 직접 띄운다.
      e.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // 완전히 다시 안 뜨게 막기보다, 이번 방문에서만 닫고 다음에 다시 제안한다.
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[80] bg-white border border-border-light rounded-sm shadow-2xl p-5 flex items-start gap-4"
        >
          <div className="relative w-11 h-11 flex-shrink-0 rounded-full overflow-hidden border border-border-light">
            <Image src="/icons/icon-192.png" alt="자연의 결" fill className="object-cover" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-serif text-charcoal">홈 화면에 자연의 결 추가</p>
              <p className="text-[12px] text-muted mt-1 leading-relaxed">
                앱처럼 바로 열어보세요. 설치 후에도 별도 용량 부담이 거의 없습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 bg-charcoal text-white text-[12px] font-bold px-4 py-2 rounded-sm hover:bg-deep-sage transition-all"
              >
                <Download className="w-3.5 h-3.5" /> 추가하기
              </button>
              <button
                onClick={handleDismiss}
                className="text-[12px] font-bold text-muted px-3 py-2 hover:text-charcoal transition-all"
              >
                나중에
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted hover:text-charcoal transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
