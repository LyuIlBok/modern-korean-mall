'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, User, Sparkles, BellRing } from 'lucide-react';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  is_admin: boolean;
  is_read: boolean;
  created_at: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data as ChatMessage[]);
      // 읽지 않은 관리자 메시지 개수 계산
      const unread = (data as ChatMessage[]).filter(m => m.is_admin && !m.is_read).length;
      setUnreadCount(unread);
    }
  }, []);

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const subscribeToMessages = useCallback((uid: string) => {
    const channel = supabase
      .channel(`chat-${uid}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_messages', 
          filter: `user_id=eq.${uid}` 
        },
        (payload) => {
          const { eventType, new: newMsg, old: oldMsg } = payload;
          
          if (eventType === 'INSERT') {
            const msg = newMsg as ChatMessage;
            setMessages((prev) => {
              if (prev.find(m => m.id === msg.id)) return prev;
              
              // 관리자 메시지이고 창이 닫혀있으면 알림 카운트 증가
              if (msg.is_admin && !isOpen) {
                setUnreadCount(c => c + 1);
              }
              return [...prev, msg];
            });
          } 
          else if (eventType === 'UPDATE') {
            const msg = newMsg as ChatMessage;
            // 관리자가 메시지를 수정했을 때 즉각 반영
            setMessages((prev) => prev.map(m => 
              m.id === msg.id ? { ...m, ...msg } : m
            ));
          } 
          else if (eventType === 'DELETE') {
            const msg = oldMsg as ChatMessage;
            // 관리자가 메시지를 삭제했을 때 즉각 제거
            setMessages((prev) => prev.filter(m => m.id !== msg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;

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
      const unsubscribe = subscribeToMessages(userId);
      return unsubscribe;
    };
    initChat();
  }, [fetchMessages, subscribeToMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // 창이 열려있을 때 관리자 메시지가 오면 즉시 읽음 처리
    if (isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.is_admin && !lastMsg.is_read) {
        markAsRead(lastMsg.id);
      }
    }
  }, [messages, isOpen]);

  // 창이 열릴 때 알림 초기화 및 마지막 메시지 읽음 처리
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatUserId) return;

    const content = input.trim();
    setInput('');
    setLoading(true);

    const { error } = await supabase
      .from('support_messages')
      .insert([{ user_id: chatUserId, content, is_admin: false, is_read: false }]);

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
            className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-border-light flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-charcoal p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] p-2 opacity-5"><Sparkles className="w-32 h-32" /></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-charcoal rounded-full" />
                </div>
                <div>
                  <h3 className="font-serif text-xl leading-none tracking-tight">실시간 1:1 상담</h3>
                  <p className="text-[10px] opacity-60 mt-2 uppercase tracking-[0.2em] font-bold">Nature&apos;s Essence Support</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/10 rounded-full p-2 transition-all relative z-10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-hanji-white/30 scroll-smooth custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-16 space-y-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-border-light/50">
                    <MessageCircle className="w-10 h-10 text-deep-sage/30" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-charcoal font-medium">안녕하세요! 복이네 농장입니다.</p>
                    <div className="text-[12px] text-muted leading-relaxed px-10 font-light">
                      상품에 대해 궁금하신 점이나<br/>
                      배송 관련 문의를 남겨주시면<br/>
                      <span className="text-deep-sage font-semibold underline underline-offset-4 decoration-deep-sage/30">최대한 빠르게</span> 답변해 드릴게요.
                    </div>
                  </div>
                </div>
              )}
              {messages.map((msg, index) => {
                const isNewDay = index === 0 || 
                  new Date(msg.created_at).toDateString() !== new Date(messages[index-1].created_at).toDateString();
                
                return (
                  <div key={msg.id} className="space-y-4">
                    {isNewDay && (
                      <div className="flex justify-center my-6">
                        <span className="bg-white/80 border border-border-light px-4 py-1 rounded-full text-[10px] text-muted font-medium shadow-sm">
                          {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex flex-col ${msg.is_admin ? 'items-start' : 'items-end'} max-w-[85%]`}>
                        <div
                          className={`p-4 rounded-2xl text-[14px] shadow-sm leading-relaxed ${
                            msg.is_admin
                              ? 'bg-white text-charcoal border border-border-light rounded-tl-none font-light'
                              : 'bg-deep-sage text-white rounded-tr-none font-medium'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 opacity-40 px-1">
                          {!msg.is_admin && msg.is_read && (
                            <span className="text-[9px] text-deep-sage font-bold">읽음</span>
                          )}
                          <span className="text-[9px]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-5 bg-white border-t border-border-light flex gap-3 items-center shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="상담 내용을 입력해 주세요..."
                className="flex-1 bg-hanji-white/50 border border-border-light px-5 py-3.5 rounded-xl text-sm focus:ring-2 focus:ring-deep-sage/10 focus:border-deep-sage outline-none transition-all placeholder:text-muted/60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-12 h-12 bg-charcoal text-white rounded-xl flex items-center justify-center hover:bg-deep-sage transition-all disabled:opacity-30 shadow-lg active:scale-95"
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
        className="w-16 h-16 bg-charcoal text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.25)] hover:bg-deep-sage transition-all group relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div key="chat" className="relative" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-8 h-8" />
              {unreadCount > 0 && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute -top-2 -right-2 bg-terracotta text-white text-[10px] font-bold w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.div>
              )}
              {unreadCount === 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Unread Alert Bubble */}
        {!isOpen && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-20 bg-white text-charcoal px-4 py-2 rounded-xl shadow-xl border border-border-light whitespace-nowrap hidden sm:flex items-center gap-2 pointer-events-none"
          >
            <BellRing className="w-3.5 h-3.5 text-terracotta animate-bounce" />
            <span className="text-[12px] font-medium">관리자의 답변이 도착했습니다.</span>
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
