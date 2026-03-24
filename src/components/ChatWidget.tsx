'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, User } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchMessages(session.user.id);
        subscribeToMessages(session.user.id);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const subscribeToMessages = (uid: string) => {
    const channel = supabase
      .channel(`chat-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${uid}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;

    const content = input.trim();
    setInput('');
    setLoading(true);

    const { error } = await supabase
      .from('support_messages')
      .insert([{ user_id: userId, content, is_admin: false }]);

    if (error) {
      console.error('Send error:', error.message);
      alert('메시지 전송에 실패했습니다.');
    }
    setLoading(false);
  };

  if (!userId) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-80 sm:w-96 h-[500px] bg-white rounded-sm shadow-2xl border border-border-light flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-deep-sage p-6 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg leading-none">1:1 실시간 상담</h3>
                  <p className="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-bold">Nature's Essence Support</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-hanji-white/30 scroll-smooth">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <MessageCircle className="w-6 h-6 text-deep-sage/30" />
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed px-4 italic">
                    안녕하세요! 무엇을 도와드릴까요?<br/>궁금하신 점을 남겨주시면 곧 답변드리겠습니다.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] p-4 rounded-sm text-sm shadow-sm ${
                      msg.is_admin
                        ? 'bg-white text-charcoal border border-border-light font-light'
                        : 'bg-deep-sage text-white font-medium'
                    }`}
                  >
                    {msg.content}
                    <p className={`text-[8px] mt-2 opacity-50 ${msg.is_admin ? 'text-left' : 'text-right'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-border-light flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="메시지를 입력해 주세요..."
                className="flex-1 bg-hanji-white/50 border-none px-4 py-2.5 rounded-sm text-sm focus:ring-1 focus:ring-deep-sage outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-charcoal text-white rounded-sm flex items-center justify-center hover:bg-deep-sage transition-all disabled:opacity-30 shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-charcoal text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-deep-sage transition-all group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-7 h-7" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute -top-1 -left-1 w-3 h-3 bg-terracotta rounded-full border-2 border-hanji-white animate-pulse" />
      </motion.button>
    </div>
  );
}
