'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, User, Send, Loader2, Search, 
  ArrowLeft, Clock, CheckCircle2, ChevronRight 
} from 'lucide-react';
import Image from 'next/image';
import { CONFIG } from '@/lib/config';

export default function AdminChatPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email || !CONFIG.ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/');
        return;
      }
      setIsAdmin(true);
      fetchChatUsers();
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      const channel = subscribeToMessages(selectedUserId);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatUsers = async () => {
    // 모든 메시지를 가져와 사용자별로 그룹화 (최근 메시지순)
    const { data, error } = await supabase
      .from('support_messages')
      .select('user_id, created_at, content, is_admin')
      .order('created_at', { ascending: false });

    if (data) {
      const userMap = new Map();
      data.forEach((msg) => {
        if (!userMap.has(msg.user_id)) {
          userMap.set(msg.user_id, {
            id: msg.user_id,
            lastMessage: msg.content,
            lastTime: msg.created_at,
            unread: !msg.is_admin // 단순화된 로직 (실제로는 더 정교한 읽음 처리 필요)
          });
        }
      });
      setUsers(Array.from(userMap.values()));
    }
    setLoading(false);
  };

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const subscribeToMessages = (uid: string) => {
    return supabase
      .channel(`admin-chat-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${uid}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // 유저 목록 상태도 업데이트 (최근 메시지 갱신)
          setUsers(prev => {
            const updated = prev.map(u => u.id === uid ? { ...u, lastMessage: payload.new.content, lastTime: payload.new.created_at } : u);
            return updated.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
          });
        }
      )
      .subscribe();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedUserId) return;

    const content = input.trim();
    setInput('');
    setSendLoading(true);

    const { error } = await supabase
      .from('support_messages')
      .insert([{ user_id: selectedUserId, content, is_admin: true }]);

    if (error) alert('메시지 전송 실패');
    setSendLoading(false);
  };

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u => u.id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-hanji-white overflow-hidden font-sans">
      {/* Sidebar: User List */}
      <aside className="w-80 sm:w-96 border-r border-border-light bg-white flex flex-col shadow-sm">
        <div className="p-8 border-b border-border-light bg-hanji-white/50">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <h1 className="font-serif text-2xl">고객 상담 센터</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="고객 ID 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-border-light pl-12 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-deep-sage" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-muted italic font-light text-sm">문의 내역이 없습니다.</div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full p-6 flex items-start gap-4 border-b border-border-light transition-all hover:bg-hanji-white/50 ${selectedUserId === user.id ? 'bg-deep-sage/5 border-l-4 border-l-deep-sage' : ''}`}
              >
                <div className="w-12 h-12 bg-hanji-white rounded-full flex items-center justify-center text-deep-sage shadow-sm flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-mono text-muted uppercase tracking-tighter">ID: {user.id.slice(0, 8)}</p>
                    <span className="text-[9px] text-muted flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {new Date(user.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${selectedUserId === user.id ? 'text-deep-sage font-medium' : 'text-charcoal font-light'}`}>
                    {user.lastMessage}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 mt-4 transition-transform ${selectedUserId === user.id ? 'rotate-90 text-deep-sage' : 'text-muted/30'}`} />
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main: Chat View */}
      <main className="flex-1 flex flex-col bg-white relative shadow-inner">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-border-light flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-deep-sage/10 rounded-full flex items-center justify-center text-deep-sage">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl">고객 상담 중</h3>
                  <p className="text-[10px] text-muted font-mono uppercase">User: {selectedUserId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-deep-sage text-[10px] font-bold uppercase tracking-widest bg-deep-sage/5 px-4 py-2 rounded-full border border-deep-sage/10">
                <span className="w-2 h-2 bg-deep-sage rounded-full animate-pulse" /> Realtime Connected
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 bg-hanji-white/20 scroll-smooth">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div
                      className={`p-5 rounded-sm shadow-sm text-sm leading-relaxed ${
                        msg.is_admin
                          ? 'bg-charcoal text-white font-medium'
                          : 'bg-white text-charcoal border border-border-light font-light'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-muted mt-2 px-1">
                      {new Date(msg.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Admin Input */}
            <form onSubmit={handleSend} className="p-8 bg-white border-t border-border-light flex gap-4 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="답변을 입력해 주세요..."
                className="flex-1 bg-hanji-white/50 border border-border-light px-6 py-4 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all"
              />
              <button
                type="submit"
                disabled={sendLoading || !input.trim()}
                className="bg-charcoal text-white px-10 py-4 rounded-sm flex items-center gap-3 hover:bg-deep-sage transition-all shadow-lg disabled:opacity-30 uppercase text-xs font-bold tracking-widest"
              >
                {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 전송하기
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-muted">
            <div className="w-24 h-24 bg-hanji-white rounded-full flex items-center justify-center shadow-inner">
              <MessageSquare className="w-10 h-10 opacity-20" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-serif text-2xl text-charcoal/40">상담할 고객을 선택해 주세요</p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-light">Select a customer from the left to start chatting</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
