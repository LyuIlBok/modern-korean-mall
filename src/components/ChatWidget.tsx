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
  content: string;
  is_admin: boolean;
  is_read: boolean;
  metadata?: any;
  created_at: string;
  isOptimistic?: boolean;
}

export default function ChatWidget() {
  const { 
    isOpen, toggleChat, inquiryProduct, setInquiryProduct, 
    autoSendMessage, autoSendMessageMetadata, triggerAutoSend,
    isInitializing, resetInitializing
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

  const fetchMessages = useCallback(async (uid: string) => {
    if (!uid || uid.startsWith('guest_')) return;

    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    
    if (data) {
      const msgs = data as ChatMessage[];
      setMessages(msgs);
      const unread = msgs.filter(m => m.is_admin && !m.is_read).length;
      setUnreadCount(unread);
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string) => {
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('id', messageId);
  }, []);

  const subscribeToMessages = useCallback((uid: string) => {
    if (!uid || uid.startsWith('guest_')) return () => {};

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
              const filtered = prev.filter(m => !m.isOptimistic);
              if (filtered.find(m => m.id === msg.id)) return filtered;
              return [...filtered, msg];
            });
            if (msg.is_admin) {
              setUnreadCount(c => c + 1);
            }
          } 
          else if (eventType === 'UPDATE') {
            const msg = newMsg as ChatMessage;
            setMessages((prev) => prev.map(m => 
              m.id === msg.id ? { ...m, ...msg } : m
            ));
          } 
          else if (eventType === 'DELETE') {
            const msg = oldMsg as ChatMessage;
            setMessages((prev) => prev.filter(m => m.id !== msg.id));
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
        const guestId = `guest_${Math.random().toString(36).substring(2, 11)}`;
        setChatUserId(guestId);
      }
    };
    initChat();
  }, [fetchMessages, subscribeToMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    if (isOpen && isLoggedIn && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.is_admin && !lastMsg.is_read) {
        const timer = setTimeout(() => {
          markAsRead(lastMsg.id);
          setUnreadCount(0);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, isOpen, markAsRead, isLoggedIn]);

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      const timer = setTimeout(() => {
        setUnreadCount(0);
        if (inputRef.current) inputRef.current.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoggedIn]);

  // 자동 메시지 전송 로직 (옵티미스틱 UI 적용)
  useEffect(() => {
    if (isOpen && isLoggedIn && autoSendMessage && chatUserId) {
      const sendAutoMessage = async () => {
        const content = autoSendMessage;
        const metadata = autoSendMessageMetadata;
        
        const optimisticMsg: ChatMessage = {
          id: `opt_${Date.now()}`,
          user_id: chatUserId,
          content,
          is_admin: false,
          is_read: false,
          metadata,
          created_at: new Date().toISOString(),
          isOptimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);

        triggerAutoSend(null, null); // 상태 초기화
        
        const payload: any = {
          user_id: chatUserId,
          content,
          is_admin: false,
          is_read: false
        };
        
        if (metadata) {
          payload.metadata = metadata;
        } else {
          payload.metadata = {};
        }

        const { error } = await supabase
          .from('support_messages')
          .insert([payload]);
        
        if (error) {
          console.error('Auto-send error details:', error.message, error.details);
        }
        
        resetInitializing();
      };
      sendAutoMessage();
    }
  }, [isOpen, isLoggedIn, autoSendMessage, autoSendMessageMetadata, chatUserId, triggerAutoSend, resetInitializing]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatUserId || !isLoggedIn) return;

    const content = input.trim();
    const currentMetadata = inquiryProduct ? {
      productId: inquiryProduct.id,
      productName: inquiryProduct.name,
      imageUrl: inquiryProduct.imageUrl,
      orderId: inquiryProduct.orderId
    } : null;

    setInput('');
    setLoading(true);

    const optimisticMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      user_id: chatUserId,
      content,
      is_admin: false,
      is_read: false,
      metadata: currentMetadata,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const payload: any = {
      user_id: chatUserId,
      content,
      is_admin: false,
      is_read: false
    };

    if (currentMetadata) {
      payload.metadata = currentMetadata;
    } else {
      payload.metadata = {};
    }

    const { error } = await supabase
      .from('support_messages')
      .insert([payload]);

    if (error) {
      console.error('Send error details:', error.message, error.details);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('메시지 전송에 실패했습니다.');
    } else {
      if (inquiryProduct) await setInquiryProduct(null);
    }
    setLoading(false);
  };

  const handleToggleChat = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    toggleChat(!isOpen);
  };

  const renderRichMessage = (msg: ChatMessage, index: number) => {
    const { content, metadata } = msg;
    let cardData = metadata;

    if (!cardData?.productId && index === messages.length - 1 && isInitializing && inquiryProduct) {
      cardData = {
        productId: inquiryProduct.id,
        productName: inquiryProduct.name,
        imageUrl: inquiryProduct.imageUrl,
        orderId: inquiryProduct.orderId
      };
    }
    
    if (cardData && cardData.productId) {
      return (
        <div className="space-y-4 w-full min-w-[240px]">
          <Link 
            href={`/shop/${cardData.productId}`}
            target="_blank"
            className="flex items-center gap-4 bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-xl transition-all group/card shadow-inner"
          >
            <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-white/10">
              {cardData.imageUrl ? (
                <Image src={cardData.imageUrl} alt="" fill className="object-cover group-hover/card:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10">
                  <ShoppingBag className="w-6 h-6 text-white/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Product Detail</span>
                <ExternalLink className="w-2.5 h-2.5 text-white/40" />
              </div>
              <p className="text-sm font-serif font-bold text-white truncate leading-tight mb-1">{cardData.productName || '상품 정보'}</p>
              {cardData.orderId && (
                <div className="flex items-center gap-1.5 opacity-60">
                  <PackageCheck className="w-3 h-3 text-white" />
                  <span className="text-[10px] text-white font-mono uppercase tracking-tighter">Order: #{cardData.orderId.slice(0,8)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover/card:translate-x-1 transition-transform" />
          </Link>
          {content && (
            <div className="px-1 text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {content}
            </div>
          )}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap">{content}</div>;
  };

  if (!chatUserId) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] font-sans">
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-10 rounded-2xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-deep-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-deep-sage" />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4 tracking-tight">회원 전용 서비스</h3>
              <p className="text-muted text-base leading-relaxed mb-10 font-light">
                1:1 상담은 회원님들께만 제공되는 서비스입니다.<br/>
                로그인 후 더 자세한 상담을 받아보세요.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => { setShowLoginModal(false); router.push('/login'); }}
                  className="w-full bg-charcoal text-white py-4 rounded-xl font-bold hover:bg-deep-sage transition-all shadow-lg"
                >
                  로그인하러 가기
                </button>
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="w-full text-sm text-muted font-medium py-2 hover:text-charcoal transition-colors"
                >
                  나중에 하기
                </button>
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
                onClick={() => toggleChat(false)} 
                className="hover:bg-white/10 rounded-full p-2 transition-all relative z-10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Inquiry Context Bar */}
            {inquiryProduct && (
              <Link 
                href={`/shop/${inquiryProduct.id}`}
                onClick={() => toggleChat(false)}
                className="bg-hanji-white border-b border-border-light p-4 flex items-center gap-4 hover:bg-white transition-colors group"
              >
                <div className="relative w-12 h-14 rounded-sm overflow-hidden border border-border-light flex-shrink-0 shadow-sm">
                  <Image src={inquiryProduct.imageUrl} alt={inquiryProduct.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold flex items-center gap-1">
                    현재 문의 중인 상품 <ChevronRight className="w-2.5 h-2.5" />
                  </p>
                  <p className="text-sm font-serif text-charcoal truncate">{inquiryProduct.name}</p>
                  {inquiryProduct.orderId && <p className="text-[9px] text-deep-sage font-mono">ORDER: #{inquiryProduct.orderId.slice(0,8).toUpperCase()}</p>}
                </div>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setInquiryProduct(null); }}
                  className="p-1.5 hover:bg-charcoal/5 rounded-full text-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </Link>
            )}

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
                          {msg.is_admin ? msg.content : renderRichMessage(msg, index)}
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
        onClick={handleToggleChat}
        className="w-16 h-16 bg-charcoal text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.25)] hover:bg-deep-sage transition-all group relative"
      >
        <AnimatePresence mode="wait">
          {isOpen && isLoggedIn ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-7 h-7" />
            </motion.div>
          ) : (
            <motion.div key="chat" className="relative" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-8 h-8" />
              {isLoggedIn && unreadCount > 0 && (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute -top-2 -right-2 bg-terracotta text-white text-[10px] font-bold w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.div>
              )}
              {isLoggedIn && unreadCount === 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isOpen && isLoggedIn && unreadCount > 0 && (
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
