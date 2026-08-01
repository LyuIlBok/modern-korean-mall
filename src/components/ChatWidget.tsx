'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Loader2, User, Sparkles, 
  BellRing, ShoppingBag, ExternalLink, ChevronRight,
  PackageCheck, Lock
} from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  is_read: boolean;
  created_at: string;
  isOptimistic?: boolean;
}

export default function ChatWidget() {
  const { 
    isOpen, toggleChat, inquiryProduct, setInquiryProduct, 
    autoSendMessage, autoSendMessageMetadata, triggerAutoSend,
    resetInitializing
  } = useChatStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 1. Fetch History from DB (Authenticated Users Only)
  const fetchMessages = useCallback(async (uid: string) => {
    if (!uid) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data as ChatMessage[]);
      const unread = data.filter(m => m.is_admin && !m.is_read).length;
      setUnreadCount(unread);
    } else if (error) {
      console.error('Fetch messages error:', error.message);
    }
  }, []);

  const markAsRead = useCallback(async (uid: string) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('user_id', uid)
      .eq('is_admin', true)
      .eq('is_read', false);
  }, []);

  const subscribeToMessages = useCallback((uid: string) => {
    if (!uid) return () => {};

    const channel = supabase
      .channel(`chat-${uid}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `user_id=eq.${uid}` 
        },
        (payload) => {
          const { eventType, new: newMsg } = payload;
          
          if (eventType === 'INSERT') {
            const msg = newMsg as ChatMessage;
            setMessages((prev) => {
              // Remove matching optimistic message if any
              const filtered = prev.filter(m => !m.isOptimistic);
              if (filtered.find(m => m.id === msg.id)) return filtered;
              return [...filtered, msg];
            });
            if (msg.is_admin) {
              setUnreadCount(c => c + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        setIsLoggedIn(true);
        setChatUserId(userId);
        fetchMessages(userId);
        return subscribeToMessages(userId);
      } else {
        setIsLoggedIn(false);
        setChatUserId(null);
        setMessages([]); // Clear on Guest
      }
    };
    initChat();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (userId) {
        setIsLoggedIn(true);
        setChatUserId(userId);
        fetchMessages(userId);
      } else {
        setIsLoggedIn(false);
        setChatUserId(null);
        setMessages([]); // CLEAR HISTORY ON LOGOUT
        toggleChat(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMessages, subscribeToMessages, toggleChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    if (isOpen && isLoggedIn && chatUserId) {
      markAsRead(chatUserId);
      setUnreadCount(0);
    }
  }, [messages, isOpen, isLoggedIn, chatUserId, markAsRead]);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoggedIn]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatUserId || !isLoggedIn) return;

    const content = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      user_id: chatUserId,
      message: content,
      is_admin: false,
      is_read: false,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: chatUserId,
        message: content,
        is_admin: false
      }]);

    if (error) {
      console.error('Send error:', error.message);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('메시지 전송에 실패했습니다.');
    }
    setLoading(false);
  };

  const handleToggleChat = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true); // GUEST RESTRICTION
      return;
    }
    toggleChat(!isOpen);
  };

  if (!isLoggedIn && !showLoginModal) {
    return (
      <div className="fixed bottom-8 right-8 z-[9999]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleChat}
          className="w-16 h-16 bg-charcoal text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-deep-sage transition-all"
        >
          <MessageCircle className="w-8 h-8" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-[9999] font-sans">
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLoginModal(false)} className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white p-10 rounded-2xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-deep-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-deep-sage" />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4 tracking-tight">회원 전용 서비스</h3>
              <p className="text-muted text-base leading-relaxed mb-10 font-normal">1:1 상담은 회원님들께만 제공되는 서비스입니다.<br/>로그인 후 더 자세한 상담을 받아보세요.</p>
              <div className="space-y-3">
                <button onClick={() => { setShowLoginModal(false); router.push('/login'); }} className="w-full bg-charcoal text-white py-4 rounded-xl font-bold hover:bg-deep-sage transition-all">로그인하러 가기</button>
                <button onClick={() => setShowLoginModal(false)} className="w-full text-sm text-muted font-medium py-2">나중에 하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[650px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-border-light flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-charcoal p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-xl leading-none tracking-tight">실시간 1:1 상담</h3>
                  <p className="text-[13px] opacity-60 mt-2 uppercase tracking-[0.2em] font-bold">Nature&apos;s Essence Support</p>
                </div>
              </div>
              <button onClick={() => toggleChat(false)} className="hover:bg-white/10 rounded-full p-2 relative z-10"><X className="w-6 h-6" /></button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-hanji-white/30 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-16 space-y-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-border-light/50">
                    <MessageCircle className="w-10 h-10 text-deep-sage/30" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-charcoal font-medium">안녕하세요! 복이네 농장입니다.</p>
                    <p className="text-[12px] text-muted leading-relaxed font-normal">최대한 빠르게 답변해 드릴게요.</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex flex-col ${msg.is_admin ? 'items-start' : 'items-end'} max-w-[85%]`}>
                    <div className={`p-4 rounded-2xl text-[14px] shadow-sm leading-relaxed ${msg.is_admin ? 'bg-white text-charcoal border border-border-light rounded-tl-none font-normal' : 'bg-deep-sage text-white rounded-tr-none font-medium'}`}>
                      {msg.message}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 opacity-40 px-1">
                      {!msg.is_admin && msg.is_read && <span className="text-[13px] text-deep-sage font-bold">읽음</span>}
                      <span className="text-[13px]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-5 bg-white border-t border-border-light flex gap-3 items-center">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="내용을 입력해 주세요..." className="flex-1 bg-hanji-white/50 border border-border-light px-5 py-3.5 rounded-xl text-sm focus:border-deep-sage outline-none" />
              <button type="submit" disabled={loading || !input.trim()} className="w-12 h-12 bg-charcoal text-white rounded-xl flex items-center justify-center hover:bg-deep-sage transition-all disabled:opacity-30">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleChat}
        className="w-16 h-16 bg-charcoal text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-deep-sage transition-all relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? <X className="w-7 h-7" key="x" /> : <MessageCircle className="w-8 h-8" key="msg" />}
        </AnimatePresence>
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-terracotta text-white text-[13px] font-bold w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
