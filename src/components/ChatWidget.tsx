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
import { useCartStore } from '@/store/useCartStore';
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
  sender?: 'user' | 'admin' | 'ai' | null;
  isOptimistic?: boolean;
}

export default function ChatWidget() {
  const { 
    isOpen, toggleChat, inquiryProduct, setInquiryProduct, 
    autoSendMessage, autoSendMessageMetadata, triggerAutoSend,
    resetInitializing
  } = useChatStore();
  const { addItem } = useCartStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);
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
    setAiThinking(true);
    setChatError(null);

    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      user_id: chatUserId,
      message: content,
      is_admin: false,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: 'user',
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 429) {
          // 이 두 경우는 서버가 사용자 메시지를 저장하기도 전에 막은 것이라
          // 낙관적 말풍선을 제거해 "보낸 것처럼" 오해하지 않게 합니다.
          setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
        // 그 외(AI 응답 생성 실패 등)는 사용자 메시지 자체는 이미 저장됐으므로
        // 낙관적 말풍선을 그대로 두고, 실시간 구독이 실제 행으로 교체하게 둡니다.
        // alert()는 전체 화면을 막아버려서(자동화 테스트 중 탭이 응답 없음 상태가 되는 것도
        // 확인함) 채팅 안에서만 조용히 보이는 문구로 대체합니다.
        setChatError(result.error || 'AI 상담원 응답에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } else if (result.action?.type === 'add_to_cart') {
        // [AI 고도화 Phase 2] AI가 "장바구니에 담아줘" 요청을 처리한 결과입니다.
        // 서버가 실시간 상품 목록과 대조해 이미 검증을 마친 상태라 그대로 담습니다.
        addItem({
          id: result.action.id,
          name: result.action.name,
          price: result.action.price,
          imageUrl: result.action.imageUrl,
          category: result.action.category,
          shipping_fee: result.action.shipping_fee,
          quantity: result.action.quantity,
        });
        setCartToast(`${result.action.name} ${result.action.quantity}개를 장바구니에 담았어요`);
        setTimeout(() => setCartToast(null), 4000);
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setChatError('메시지 전송에 실패했습니다. 인터넷 연결을 확인해 주세요.');
    } finally {
      setLoading(false);
      setAiThinking(false);
    }
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
                  <h3 className="font-serif text-xl leading-none tracking-tight">AI 상담 (담당자 연결 가능)</h3>
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
                    <p className="text-[13px] text-muted leading-relaxed font-normal">AI 상담원이 먼저 빠르게 답변해 드리고,<br/>필요하면 담당자가 직접 이어받아요.</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
                  <div className={`flex flex-col ${msg.is_admin ? 'items-start' : 'items-end'} max-w-[85%]`}>
                    {msg.is_admin && (
                      <span className={`flex items-center gap-1 text-[12px] font-bold mb-1 ml-1 ${msg.sender === 'ai' ? 'text-deep-sage' : 'text-charcoal/50'}`}>
                        {msg.sender === 'ai' ? <><Sparkles className="w-3 h-3" /> AI 상담원</> : '담당자'}
                      </span>
                    )}
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
              {aiThinking && (
                <div className="flex justify-start">
                  <div className="flex flex-col items-start max-w-[85%]">
                    <span className="flex items-center gap-1 text-[12px] font-bold mb-1 ml-1 text-deep-sage">
                      <Sparkles className="w-3 h-3" /> AI 상담원
                    </span>
                    <div className="px-4 py-3.5 rounded-2xl rounded-tl-none bg-white border border-border-light shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-deep-sage/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-deep-sage/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-deep-sage/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {chatError && (
              <div className="px-5 py-3 bg-terracotta/5 border-t border-terracotta/10 flex items-start gap-2">
                <p className="text-[13px] text-terracotta leading-relaxed flex-1">{chatError}</p>
                <button onClick={() => setChatError(null)} className="text-terracotta/60 hover:text-terracotta p-0.5" aria-label="오류 메시지 닫기">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {cartToast && (
              <div className="px-5 py-3 bg-deep-sage/5 border-t border-deep-sage/10 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-deep-sage flex-shrink-0" />
                <p className="text-[13px] text-deep-sage font-medium leading-relaxed flex-1">{cartToast}</p>
                <button onClick={() => setCartToast(null)} className="text-deep-sage/60 hover:text-deep-sage p-0.5" aria-label="알림 닫기">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
