'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, User, Send, Loader2, Search, 
  ArrowLeft, Clock, ChevronRight, Hash, ShieldCheck,
  Edit2, Trash2, Check, X, Bell, UserCheck
} from 'lucide-react';
import { CONFIG } from '@/lib/config';

export default function AdminChatPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUserRef = useRef<string | null>(null); // 실시간 구독 클로저 해결용
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 선택된 유저 ID가 바뀔 때마다 Ref 업데이트
  useEffect(() => {
    selectedUserRef.current = selectedUserId;
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      markAllAsRead(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email || !CONFIG.ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/');
        return;
      }
      setIsAdmin(true);
      fetchChatUsers();
      
      const channel = subscribeToAllMessages();
      return () => {
        supabase.removeChannel(channel);
      };
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatUsers = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('user_id, created_at, content, is_admin, is_read')
      .order('created_at', { ascending: false });

    if (data) {
      const userMap = new Map();
      data.forEach((msg) => {
        if (!userMap.has(msg.user_id)) {
          const unreadCount = data.filter(m => m.user_id === msg.user_id && !m.is_admin && !m.is_read).length;
          userMap.set(msg.user_id, {
            id: msg.user_id,
            lastMessage: msg.content,
            lastTime: msg.created_at,
            lastIsAdmin: msg.is_admin,
            isGuest: msg.user_id.startsWith('guest_'),
            unreadCount
          });
        }
      });
      setUsers(Array.from(userMap.values()));
    }
    setLoading(false);
  };

  const markAllAsRead = async (uid: string) => {
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('user_id', uid)
      .eq('is_admin', false);
    
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, unreadCount: 0 } : u));
  };

  const subscribeToAllMessages = () => {
    const channel = supabase
      .channel('admin-chat-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_messages' },
        (payload) => {
          const { eventType, new: newMsg, old: oldMsg } = payload;
          
          if (eventType === 'INSERT') {
            if (selectedUserRef.current === newMsg.user_id) {
              setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
              if (!newMsg.is_admin) markAllAsRead(selectedUserRef.current);
            }
            updateUserList(newMsg);
          } 
          else if (eventType === 'UPDATE') {
            if (selectedUserRef.current === newMsg.user_id) {
              setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg } : m));
            }
            setUsers(prev => prev.map(u => u.id === newMsg.user_id ? { ...u, lastMessage: newMsg.content } : u));
          } 
          else if (eventType === 'DELETE') {
            // 삭제 시에는 oldMsg에 ID만 담겨올 수 있으므로 ID로 필터링
            setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
            fetchChatUsers(); // 목록 갱신을 위해 재조회
          }
        }
      )
      .subscribe();
    return channel;
  };

  const updateUserList = (msg: any) => {
    setUsers(prev => {
      const others = prev.filter(u => u.id !== msg.user_id);
      const target = prev.find(u => u.id === msg.user_id) || { 
        id: msg.user_id, 
        isGuest: msg.user_id.startsWith('guest_'),
        unreadCount: 0
      };
      
      const newUnreadCount = (msg.user_id !== selectedUserRef.current && !msg.is_admin) 
        ? (target.unreadCount + 1) 
        : target.unreadCount;

      return [{ 
        ...target, 
        lastMessage: msg.content, 
        lastTime: msg.created_at, 
        lastIsAdmin: msg.is_admin,
        unreadCount: newUnreadCount 
      }, ...others];
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  const handleUpdateMessage = async (id: string) => {
    if (!editInput.trim()) return;
    
    // 1. Supabase 업데이트 실행
    const { error } = await supabase
      .from('support_messages')
      .update({ 
        content: editInput.trim(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error.message);
      alert('수정에 실패했습니다.');
      return;
    }

    // 2. 성공 시 로컬 상태 즉시 변경
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, content: editInput.trim(), updated_at: new Date().toISOString() } : m
    ));
    setEditingId(null);
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    // 1. Supabase 삭제 실행
    const { error } = await supabase
      .from('support_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error.message);
      alert('삭제에 실패했습니다.');
      return;
    }

    // 2. 성공 시 로컬 상태 배열에서 즉시 제거
    setMessages(prev => prev.filter(m => m.id !== id));
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
      is_read: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSendLoading(true);

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{ user_id: selectedUserId, content, is_admin: true, is_read: false }])
        .select()
        .single();

      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err) {
      console.error('Send error:', err);
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
      <aside className="w-80 sm:w-[400px] border-r border-border-light bg-white flex flex-col shadow-lg z-20">
        <div className="p-8 space-y-6 bg-white border-b border-border-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/admin')} className="p-2 hover:bg-hanji-white rounded-full transition-all">
                <ArrowLeft className="w-5 h-5 text-charcoal" />
              </button>
              <h1 className="font-serif text-2xl font-bold">상담 관리</h1>
            </div>
            <div className="bg-deep-sage/10 text-deep-sage p-2 rounded-full">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="고객 ID 또는 내용 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-hanji-white/50 border border-border-light pl-12 pr-4 py-4 rounded-xl text-sm focus:outline-none focus:border-deep-sage focus:ring-2 focus:ring-deep-sage/10 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-60 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
              <p className="text-xs text-muted">고객 목록을 불러오는 중...</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light/50">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full p-6 flex items-start gap-5 transition-all hover:bg-hanji-white/40 group relative ${selectedUserId === user.id ? 'bg-deep-sage/5' : ''}`}
                >
                  {selectedUserId === user.id && (
                    <motion.div layoutId="active-bar" className="absolute left-0 top-0 bottom-0 w-1.5 bg-deep-sage" />
                  )}
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${user.isGuest ? 'bg-hanji-white text-muted' : 'bg-deep-sage/10 text-deep-sage'}`}>
                      {user.isGuest ? <Hash className="w-6 h-6" /> : <User className="w-7 h-7" />}
                    </div>
                    {user.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-terracotta text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-md animate-bounce">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden pt-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className={`text-[10px] font-bold tracking-widest ${user.isGuest ? 'text-muted' : 'text-deep-sage'}`}>
                        {user.isGuest ? 'GUEST' : 'MEMBER'}
                      </p>
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(user.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[13px] truncate ${user.unreadCount > 0 ? 'text-charcoal font-bold' : 'text-muted font-light'}`}>
                      {user.lastMessage}
                    </p>
                    {user.lastIsAdmin && (
                      <p className="text-[9px] text-deep-sage/60 mt-1 flex items-center gap-1 italic">
                        <Check className="w-3 h-3" /> 답변 완료
                      </p>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted mt-5 transition-transform ${selectedUserId === user.id ? 'translate-x-1 text-deep-sage' : 'group-hover:translate-x-1'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main: Chat View */}
      <main className="flex-1 flex flex-col bg-white relative">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="px-10 py-6 border-b border-border-light flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-charcoal text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold">{selectedUserId.startsWith('guest_') ? '비회원 고객님' : '정회원 고객님'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted">ID: {selectedUserId}</span>
                    <span className="w-1 h-1 bg-muted rounded-full" />
                    <span className="text-[10px] text-deep-sage font-bold uppercase tracking-widest">Active Session</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-0.5">최근 활동</p>
                  <p className="text-xs font-medium">{new Date().toLocaleString()}</p>
                </div>
                <button className="p-3 hover:bg-hanji-white rounded-xl transition-all border border-border-light shadow-sm">
                  <Edit2 className="w-5 h-5 text-charcoal" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-10 bg-hanji-white/20 custom-scrollbar scroll-smooth">
              {messages.map((msg, index) => {
                const isNewDay = index === 0 || 
                  new Date(msg.created_at).toDateString() !== new Date(messages[index-1].created_at).toDateString();
                
                return (
                  <div key={msg.id} className="space-y-6">
                    {isNewDay && (
                      <div className="flex justify-center my-10">
                        <span className="bg-white border border-border-light px-6 py-2 rounded-full text-[11px] text-muted font-bold shadow-sm tracking-widest">
                          {new Date(msg.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
                        
                        {/* Admin Controls */}
                        {msg.is_admin && editingId !== msg.id && !msg.id.startsWith('temp-') && (
                          <div className="absolute -left-20 top-0 hidden group-hover:flex items-center gap-2 bg-white p-2 border border-border-light shadow-xl rounded-xl z-10">
                            <button onClick={() => { setEditingId(msg.id); setEditInput(msg.content); }} className="p-1.5 hover:text-deep-sage transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:text-terracotta transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}

                        <div
                          className={`p-5 rounded-2xl shadow-sm text-[15px] leading-relaxed transition-all ${
                            msg.is_admin
                              ? 'bg-charcoal text-white font-medium rounded-tr-none shadow-charcoal/10'
                              : 'bg-white text-charcoal border border-border-light font-light rounded-tl-none'
                          }`}
                        >
                          {editingId === msg.id ? (
                            <div className="flex flex-col gap-4 min-w-[250px]">
                              <textarea 
                                autoFocus
                                value={editInput}
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUpdateMessage(msg.id);
                                  }
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="w-full bg-white/10 border border-white/20 p-4 rounded-xl text-sm focus:outline-none focus:border-white/40 text-white min-h-[100px] resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs">취소</button>
                                <button onClick={() => handleUpdateMessage(msg.id)} className="px-3 py-1.5 bg-white text-charcoal rounded-lg text-xs font-bold">저장</button>
                              </div>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2 px-1">
                          {msg.is_admin && (
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${msg.is_read ? 'text-deep-sage' : 'text-muted'}`}>
                              {msg.is_read ? (
                                <><Check className="w-3 h-3" /> 읽음</>
                              ) : '안읽음'}
                            </span>
                          )}
                          <span className="text-[10px] text-muted tracking-tighter opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Input Area */}
            <div className="p-10 bg-white border-t border-border-light shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <form onSubmit={handleSend} className="flex gap-5 items-center max-w-6xl mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="답변을 입력하세요... (Enter 전송)"
                    className="w-full bg-hanji-white/50 border border-border-light px-8 py-5 rounded-2xl text-[15px] focus:outline-none focus:border-deep-sage focus:ring-4 focus:ring-deep-sage/5 transition-all shadow-inner"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-[10px] text-muted font-bold bg-white px-2 py-1 rounded border border-border-light shadow-sm">Enter</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sendLoading || !input.trim()}
                  className="bg-charcoal text-white h-16 px-10 rounded-2xl flex items-center gap-3 hover:bg-deep-sage transition-all shadow-xl disabled:opacity-30 group"
                >
                  {sendLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  <span className="font-bold text-sm tracking-widest uppercase">전송</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-hanji-white/10">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-[40px] flex items-center justify-center shadow-2xl rotate-3"><MessageSquare className="w-14 h-14 text-deep-sage/20" /></div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-deep-sage/10 rounded-full flex items-center justify-center blur-sm" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="font-serif text-3xl text-charcoal/30">상담 대기 중인 고객이 없습니다</h2>
              <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-muted animate-pulse">Waiting for real-time connection...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
