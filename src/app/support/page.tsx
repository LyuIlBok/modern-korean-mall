'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Leaf, ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

export default function SupportPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 1. 유저 인증 및 초기 메시지 로드
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 실제로는 DB에서 해당 유저의 문의 내역을 가져옵니다.
      // (지금은 채팅 UI 체험을 위한 예시 데이터를 포함합니다.)
      const initialMessages: Message[] = [
        { id: '1', content: '안녕하세요, 자연의 결 고객센터입니다. 무엇을 도와드릴까요?', is_admin: true, created_at: new Date().toISOString() }
      ];
      setMessages(initialMessages);
      setIsLoading(false);
    };
    init();
  }, [router]);

  // 2. 메시지 전송 로직
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const userMsg: Message = {
      id: Math.random().toString(),
      content: newMessage,
      is_admin: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');

    // 가상 관리자 자동 답변 (나중에 실제 관리자 기능과 연동)
    setTimeout(() => {
      const adminMsg: Message = {
        id: Math.random().toString(),
        content: '문의를 접수했습니다. 정성껏 확인 후 잠시만 기다려주시면 답변해 드릴게요.',
        is_admin: true,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, adminMsg]);
      setIsSending(false);
    }, 1000);
  };

  // 3. 새 메시지 올 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-hanji-white text-deep-sage">연결 중...</div>;

  return (
    <div className="flex-1 bg-hanji-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border-light sticky top-0 z-10 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/mypage" className="p-2 hover:bg-hanji-white rounded-full transition-colors text-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-deep-sage/10 rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-deep-sage" />
            </div>
            <div>
              <h1 className="font-serif text-lg text-charcoal">자연의 결 대화방</h1>
              <p className="text-[13px] text-deep-sage uppercase tracking-widest font-medium">1:1 Customer Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <div className="text-center mb-8">
          <span className="text-[13px] bg-border-light/30 text-muted px-3 py-1 rounded-full uppercase tracking-tighter">
            상담원이 연결되었습니다
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.is_admin ? 'flex-row' : 'flex-row-reverse'}`}>
                {msg.is_admin && (
                  <div className="w-8 h-8 rounded-full bg-deep-sage flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Leaf className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.is_admin 
                      ? 'bg-white border border-border-light text-charcoal rounded-tl-none shadow-sm' 
                      : 'bg-charcoal text-white rounded-tr-none shadow-md'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[13px] text-muted ${msg.is_admin ? 'text-left' : 'text-right'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-border-light pb-8 sm:pb-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="문의하실 내용을 입력해 주세요"
            className="flex-1 bg-hanji-white/50 border border-border-light px-5 py-4 rounded-full focus:outline-none focus:border-deep-sage transition-all text-sm pr-14"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-charcoal text-white rounded-full flex items-center justify-center hover:bg-deep-sage transition-colors disabled:opacity-30 disabled:hover:bg-charcoal"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-[13px] text-center text-muted mt-4 font-normal">
          * 보통 1시간 내외로 답변을 드리며, 야간 및 공휴일에는 답변이 다소 늦어질 수 있습니다.
        </p>
      </div>
    </div>
  );
}
