'use client';

import { useToastStore, ToastType } from '@/store/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-deep-sage" />;
      case 'error': return <XCircle className="w-4 h-4 text-terracotta" />;
      case 'info': return <Info className="w-4 h-4 text-charcoal/60" />;
    }
  };

  return (
    <div className="fixed top-24 right-4 sm:right-8 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="pointer-events-auto bg-white border border-border-light shadow-lg rounded-sm px-5 py-4 flex items-center justify-between gap-4 backdrop-blur-md bg-white/95"
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <span className="text-sm font-medium text-charcoal">{toast.message}</span>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-charcoal transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
