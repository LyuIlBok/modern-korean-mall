'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, User, Sparkles } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      // 1. 로그인 유저 확인
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;

      // 2. 비회원일 경우 localStorage에서 고유 ID 생성/조회
      if (!userId) {
        const storedId = localStorage.getItem('boki_chat_session');
        if (storedId) {
          userId = storedId;
        } else {
          const newId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
          localStorage.setItem('boki_chat_session', newId);
          userId = newId;
        }
      }

      setChatUserId(userId);
      fetchMessages(userId);
      subscribeToMessages(userId);
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
        { event: '*', schema: 'public', table: 'support_messages', filter: `user_id=eq.${uid}` },
        (payload) => {
          const { eventType, new: newMsg, old: oldMsg } = payload;
          
          if (eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          } 
          else if (eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg } : m));
          } 
          else if (eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== oldMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatUserId) return;

    const content = input.trim();
    setInput('');
    setLoading(true);

    const { error } = await supabase
      .from('support_messages')
      .insert([{ user_id: chatUserId, content, is_admin: false }]);

    if (error) {
      console.error('Send error:', error.message);
      alert('메시지 전송에 실패했습니다.');
    }
    setLoading(false);
  };

  if (!chatUserId) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-80 sm:w-96 h-[550px] bg-white rounded-sm shadow-2xl border border-border-light flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-charcoal p-6 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><Sparkles className="w-20 h-24 rotate-12" /></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg leading-none tracking-tight">1:1 실시간 상담</h3>
                  <p className="text-[9px] opacity-60 mt-1.5 uppercase tracking-[0.2em] font-bold">Nature's Essence Support</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform p-1 relative z-10">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-hanji-white/40 scroll-smooth">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-border-light/50">
                    <MessageCircle className="w-7 h-7 text-deep-sage/40" />
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed px-6 italic font-light">
                    자연의 결을 찾아주셔서 감사합니다.<br/>
                    궁금하신 점을 남겨주시면<br/>
                    <span className="text-deep-sage font-medium italic">생산자가 직접</span> 답변해 드립니다.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex flex-col ${msg.is_admin ? 'items-start' : 'items-end'} max-w-[85%]`}>
                    <div
                      className={`p-4 rounded-sm text-[13px] shadow-sm leading-relaxed ${
                        msg.is_admin
                          ? 'bg-white text-charcoal border border-border-light font-light'
                          : 'bg-deep-sage text-white font-medium'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[8px] mt-1.5 opacity-40 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-5 bg-white border-t border-border-light flex gap-3 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="상담 내용을 입력해 주세요..."
                className="flex-1 bg-hanji-white/60 border-none px-5 py-3 rounded-sm text-sm focus:ring-1 focus:ring-deep-sage outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-12 h-12 bg-charcoal text-white rounded-sm flex items-center justify-center hover:bg-deep-sage transition-all disabled:opacity-30 shadow-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-charcoal text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.2)] hover:bg-deep-sage transition-all group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div key="chat" className="relative" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-8 h-8" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-terracotta rounded-full border-2 border-white animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
