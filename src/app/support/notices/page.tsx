'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Megaphone, ChevronRight, Clock, Star, Sparkles, 
  Info, Bell, Package, ArrowLeft, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: 'UPDATE' | 'EVENT' | 'NOTICE';
  created_at: string;
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) setNotices(data as Notice[]);
      setLoading(false);
    };
    fetchNotices();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'UPDATE': return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'EVENT': return <Star className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-deep-sage" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'UPDATE': return 'Patch Notes';
      case 'EVENT': return 'Special Event';
      default: return 'Announcement';
    }
  };

  return (
    <div className="bg-hanji-white min-h-screen flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full flex-1">
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()} 
          className="inline-flex items-center gap-2 text-muted hover:text-charcoal transition-colors mb-16 group text-[10px] uppercase tracking-widest font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> Back
        </button>

        <header className="mb-20 space-y-6">
          <div className="inline-flex items-center gap-3 bg-charcoal text-white px-4 py-2 rounded-full">
            <Megaphone className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Official Channel</span>
          </div>
          <h1 className="font-serif text-5xl text-charcoal tracking-tight">공지 및 업데이트</h1>
          <p className="text-muted font-light italic max-w-xl leading-relaxed">
            자연의 결이 전해드리는 정직한 소식과 새로운 기능 업데이트를 확인해 보세요.
          </p>
        </header>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-deep-sage" /></div>
        ) : notices.length === 0 ? (
          <div className="py-32 text-center border-y border-border-light border-dashed italic text-muted font-light">등록된 소식이 없습니다.</div>
        ) : (
          <div className="space-y-8">
            {notices.map((notice, idx) => (
              <motion.div 
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-border-light rounded-sm overflow-hidden shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="p-8 md:p-12 space-y-8">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-hanji-white p-2.5 rounded-sm border border-border-light">
                        {getCategoryIcon(notice.category)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted">{getCategoryLabel(notice.category)}</span>
                        <h2 className="text-2xl font-serif text-charcoal leading-tight">{notice.title}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted font-mono uppercase tracking-tighter opacity-60">
                      <Clock className="w-3 h-3" /> {new Date(notice.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap font-light italic-patch">
                    {notice.content}
                  </div>

                  {notice.category === 'UPDATE' && (
                    <div className="pt-8 border-t border-hanji-white flex justify-end">
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-deep-sage opacity-40 group-hover:opacity-100 transition-opacity">
                        Patch Applied <Package className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
