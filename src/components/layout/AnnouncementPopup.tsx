'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import Link from 'next/link';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function AnnouncementPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const checkPopup = async () => {
      // 1. 오늘 하루 보지 않기 체크
      const hiddenUntil = localStorage.getItem('boki_popup_hidden_until');
      if (hiddenUntil && new Date().getTime() < Number(hiddenUntil)) {
        return;
      }

      // 2. 최신 팝업 공지 가져오기
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_popup', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNotice(data);
        setIsVisible(true);
      }
    };

    checkPopup();
  }, []);

  const handleCloseToday = () => {
    // 24시간 동안 숨기기
    const expiry = new Date().getTime() + 24 * 60 * 60 * 1000;
    localStorage.setItem('boki_popup_hidden_until', expiry.toString());
    setIsVisible(false);
  };

  if (!notice || !isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={() => setIsVisible(false)}
          className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm pointer-events-auto"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-lg rounded-sm shadow-2xl overflow-hidden pointer-events-auto flex flex-col border border-border-light"
        >
          {/* Header Banner */}
          <div className="bg-charcoal p-8 text-white relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
              <Megaphone className="w-48 h-48" />
            </div>
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/20">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <span className="text-[13px] font-bold uppercase tracking-[0.3em] text-white/60">Official Announcement</span>
            </div>
            <h2 className="font-serif text-3xl leading-tight relative z-10">{notice.title}</h2>
          </div>

          {/* Content Area */}
          <div className="p-10 space-y-8 bg-hanji-white/30">
            <div className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap font-normal max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
              {notice.content}
            </div>
            
            <Link 
              href="/support/notices" 
              onClick={() => setIsVisible(false)}
              className="flex items-center justify-center gap-2 w-full py-4 border border-border-light text-muted hover:text-charcoal hover:bg-white transition-all text-[13px] uppercase font-bold tracking-widest rounded-sm shadow-sm"
            >
              View Patch Notes <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Footer Actions */}
          <div className="flex border-t border-border-light bg-white">
            <button 
              onClick={handleCloseToday}
              className="flex-1 py-5 text-[13px] font-bold text-muted hover:bg-hanji-white transition-colors uppercase tracking-widest border-r border-border-light"
            >
              오늘 하루 보지 않기
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="flex-1 py-5 text-[13px] font-bold text-charcoal hover:bg-hanji-white transition-colors uppercase tracking-widest"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
