'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, User, Send, Loader2, Search, 
  ArrowLeft, Clock, ChevronRight, Hash, ShieldCheck
} from 'lucide-react';
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
      subscribeToAllMessages();
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatUsers = async () => {
    const { data } = await supabase
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
            lastIsAdmin: msg.is_admin,
            isGuest: msg.user_id.startsWith('guest_')
          });
        }
      });
      setUsers(Array.from(userMap.values()));
    }
    setLoading(false);
  };

  const subscribeToAllMessages = () => {
    return supabase
      .channel('admin-chat-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new;
          
          // 1. 대화창 실시간 업데이트
          setSelectedUserId(currentId => {
            if (currentId === newMsg.user_id) {
              setMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
            return currentId;
          });

          // 2. 유저 목록 실시간 갱신 및 최상단 이동 (Sorting)
          setUsers(prev => {
            const others = prev.filter(u => u.id !== newMsg.user_id);
            const target = {
              id: newMsg.user_id,
              lastMessage: newMsg.content,
              lastTime: newMsg.created_at,
              lastIsAdmin: newMsg.is_admin,
              isGuest: newMsg.user_id.startsWith('guest_')
            };
            // 새 메시지가 온 유저를 맨 앞으로 배치
            return [target, ...others];
          });
        }
      )
      .subscribe();
  };

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedUserId) return;

    const content = input.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      user_id: selectedUserId,
      content,
      is_admin: true,
      created_at: new Date().toISOString()
    };

    // 1. Optimistic UI: 화면에 즉시 반영
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSendLoading(true);

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{ user_id: selectedUserId, content, is_admin: true }])
        .select()
        .single();

      if (error) throw error;

      // 2. 성공 시 임시 메시지를 실제 데이터로 교체
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      
      // 유저 목록 갱신
      setUsers(prev => {
        const others = prev.filter(u => u.id !== selectedUserId);
        const target = prev.find(u => u.id === selectedUserId);
        if (target) {
          return [{ ...target, lastMessage: content, lastTime: data.created_at, lastIsAdmin: true }, ...others];
        }
        return prev;
      });
    } catch (err) {
      console.error('Send error:', err);
      alert('메시지 전송에 실패했습니다.');
      // 실패 시 롤백
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSendLoading(false);
    }
  };

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u => u.id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-hanji-white overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 sm:w-96 border-r border-border-light bg-white flex flex-col shadow-sm">
        <div className="p-8 border-b border-border-light bg-hanji-white/50">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <h1 className="font-serif text-2xl">상담 센터</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="고객 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-border-light pl-12 pr-4 py-3 rounded-sm text-sm focus:outline-none focus:border-deep-sage transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-deep-sage" /></div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full p-6 flex items-start gap-4 border-b border-border-light transition-all hover:bg-hanji-white/50 ${selectedUserId === user.id ? 'bg-deep-sage/5 border-l-4 border-l-deep-sage' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${user.isGuest ? 'bg-hanji-white text-muted' : 'bg-deep-sage/10 text-deep-sage'}`}>
                  {user.isGuest ? <Hash className="w-5 h-5" /> : <User className="w-6 h-6" />}
                </div>
                <div className="flex-1 text-left overflow-hidden relative">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-mono text-muted uppercase">{user.isGuest ? 'GUEST' : 'MEMBER'}</p>
                    <div className="flex items-center gap-2">
                      {!user.lastIsAdmin && (
                        <span className="flex h-2 w-2 rounded-full bg-terracotta animate-pulse" title="새로운 메시지" />
                      )}
                      <span className="text-[9px] text-muted flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(user.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <p className={`text-sm truncate ${!user.lastIsAdmin ? 'text-deep-sage font-bold' : 'text-charcoal font-light'}`}>{user.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main: Chat View */}
      <main className="flex-1 flex flex-col bg-white relative shadow-inner">
        {selectedUserId ? (
          <>
            {/* Chat Header (Fixed) */}
            <div className="p-6 border-b border-border-light flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-charcoal text-white rounded-full flex items-center justify-center shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl">{selectedUserId.startsWith('guest_') ? '비회원 상담' : '회원 상담'}</h3>
                  <p className="text-[10px] text-muted font-mono uppercase tracking-tighter opacity-60">ID: {selectedUserId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-deep-sage text-[10px] font-bold uppercase tracking-widest bg-deep-sage/5 px-4 py-2 rounded-full border border-deep-sage/10">
                <span className="w-2 h-2 bg-deep-sage rounded-full animate-pulse" /> Realtime Live
              </div>
            </div>

            {/* Messages Area (Scrollable) */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 bg-hanji-white/20 scroll-smooth custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    <div
                      className={`p-5 rounded-sm shadow-sm text-sm leading-relaxed ${
                        msg.is_admin
                          ? 'bg-charcoal text-white font-medium shadow-charcoal/10'
                          : 'bg-white text-charcoal border border-border-light font-light shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-muted mt-2 px-1 tracking-tighter opacity-60">
                      {new Date(msg.created_at).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Admin Input Area (Fixed Bottom) */}
            <div className="p-8 bg-white border-t border-border-light shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <form onSubmit={handleSend} className="flex gap-4 items-center max-w-5xl mx-auto">
                <input
                  type="text"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="답변 내용을 입력해 주세요 (Enter를 눌러 전송)"
                  className="flex-1 bg-hanji-white/50 border border-border-light px-6 py-4 rounded-sm text-sm focus:outline-none focus:border-deep-sage focus:ring-1 focus:ring-deep-sage/20 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !input.trim()}
                  className="bg-charcoal text-white px-10 py-4 rounded-sm flex items-center gap-3 hover:bg-deep-sage transition-all shadow-lg disabled:opacity-30 uppercase text-xs font-bold tracking-widest group"
                >
                  {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />} 전송하기
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-muted">
            <div className="w-24 h-24 bg-hanji-white rounded-full flex items-center justify-center shadow-inner"><MessageSquare className="w-10 h-10 opacity-20" /></div>
            <div className="text-center space-y-2">
              <p className="font-serif text-2xl text-charcoal/40">상담할 고객을 선택해 주세요</p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-light italic">Waiting for new messages...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
