'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, ChevronDown, ChevronUp, Loader2, 
  ArrowLeft, Edit, Plus, Minus, DollarSign, Crown, ShieldCheck, X 
} from 'lucide-react';
import { CONFIG } from '@/lib/config';

type Profile = {
  id: string;
  email: string;
  full_name: string;
  total_spent: number;
  tier: string;
  points: number;
  created_at?: string;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointAction, setPointAction] = useState<'add' | 'sub'>('add');
  const [pointAmount, setPointAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email || !CONFIG.ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/');
        return;
      }
      fetchMembers();
    };
    checkAdminAndFetch();
  }, [router]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', false);
    
    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const filteredAndSortedMembers = members
    .filter(m => 
      (m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') || 
      (m.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    )
    .sort((a, b) => {
      if (sortOrder === 'desc') return (b.total_spent || 0) - (a.total_spent || 0);
      return (a.total_spent || 0) - (b.total_spent || 0);
    });

  const openModal = (member: Profile) => {
    setSelectedMember(member);
    setSelectedTier(member.tier || 'FAMILY');
    setPointAmount('');
    setPointAction('add');
    setIsModalOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    setActionLoading(true);

    let newPoints = selectedMember.points || 0;
    const amount = parseInt(pointAmount) || 0;

    if (amount > 0) {
      if (pointAction === 'add') {
        newPoints += amount;
      } else {
        newPoints = Math.max(0, newPoints - amount);
      }
    }

    try {
      // [보안 고도화] 클라이언트 직접 수정 대신 서버 API 호출
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          targetTier: selectedTier,
          targetPoints: newPoints,
          adminToken: session?.user?.id // 서버에서 is_admin 여부 재검증용
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업데이트 실패');
      }

      // 로컬 상태 즉시 반영
      setMembers(prev => prev.map(m => 
        m.id === selectedMember.id 
          ? { ...m, tier: selectedTier, points: newPoints }
          : m
      ));
      alert(result.message || '회원 정보가 성공적으로 수정되었습니다.');
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error.message);
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'VVIP': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'VIP': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-hanji-white text-charcoal border-border-light';
    }
  };

  return (
    <div className="min-h-screen bg-hanji-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-border-light">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-hanji-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-deep-sage/10 rounded-full flex items-center justify-center text-deep-sage">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-charcoal">회원 관리 (CRM)</h1>
                <p className="text-xs text-muted">고객 등급 및 적립금 관리</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                placeholder="이름 또는 이메일 검색" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-hanji-white/50 border border-border-light pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-deep-sage focus:ring-1 focus:ring-deep-sage transition-all"
              />
            </div>
            <button 
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-light rounded-lg text-sm hover:bg-hanji-white transition-all whitespace-nowrap"
            >
              누적 구매액 {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted uppercase bg-hanji-white/50 border-b border-border-light">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">회원 정보</th>
                  <th className="px-6 py-4 font-medium tracking-wider">등급 (Tier)</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">누적 구매액</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">보유 적립금</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-deep-sage mx-auto" />
                    </td>
                  </tr>
                ) : filteredAndSortedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-hanji-white/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-charcoal">{member.full_name || '이름 없음'}</div>
                        <div className="text-xs text-muted mt-0.5">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-full border ${getTierColor(member.tier || 'FAMILY')}`}>
                          {member.tier || 'FAMILY'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {new Intl.NumberFormat('ko-KR').format(member.total_spent || 0)}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-deep-sage font-bold">
                          {new Intl.NumberFormat('ko-KR').format(member.points || 0)} P
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => openModal(member)}
                          className="p-2 text-muted hover:text-deep-sage bg-hanji-white hover:bg-deep-sage/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {isModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border-light flex justify-between items-center bg-hanji-white/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-border-light">
                    <ShieldCheck className="w-5 h-5 text-deep-sage" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold">고객 상세 관리</h3>
                    <p className="text-xs text-muted">{selectedMember.full_name} ({selectedMember.email})</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted hover:bg-hanji-white rounded-full"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Tier Management */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5" /> 회원 등급 변경
                  </label>
                  <select 
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full bg-white border border-border-light p-3 rounded-lg text-sm focus:outline-none focus:border-deep-sage focus:ring-1 focus:ring-deep-sage transition-all appearance-none"
                  >
                    <option value="FAMILY">FAMILY (일반)</option>
                    <option value="VIP">VIP (우수)</option>
                    <option value="VVIP">VVIP (최우수)</option>
                  </select>
                </div>

                {/* Points Management */}
                <div className="space-y-3 pt-4 border-t border-border-light">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" /> 적립금 관리 (현재: {new Intl.NumberFormat('ko-KR').format(selectedMember.points || 0)}P)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex bg-hanji-white rounded-lg p-1 border border-border-light">
                      <button 
                        type="button"
                        onClick={() => setPointAction('add')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-1 transition-all ${pointAction === 'add' ? 'bg-white shadow-sm text-deep-sage' : 'text-muted hover:text-charcoal'}`}
                      >
                        <Plus className="w-3 h-3" /> 지급
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPointAction('sub')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-1 transition-all ${pointAction === 'sub' ? 'bg-white shadow-sm text-terracotta' : 'text-muted hover:text-charcoal'}`}
                      >
                        <Minus className="w-3 h-3" /> 차감
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        value={pointAmount}
                        onChange={(e) => setPointAmount(e.target.value)}
                        placeholder="금액 입력"
                        className="w-full h-full bg-white border border-border-light pl-4 pr-8 rounded-lg text-sm focus:outline-none focus:border-deep-sage focus:ring-1 focus:ring-deep-sage transition-all text-right font-medium"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">P</span>
                    </div>
                  </div>
                  {pointAmount && (
                    <p className="text-xs text-right text-muted">
                      변경 후 예상: <span className="font-bold text-charcoal">
                        {new Intl.NumberFormat('ko-KR').format(
                          pointAction === 'add' 
                            ? (selectedMember.points || 0) + parseInt(pointAmount || '0')
                            : Math.max(0, (selectedMember.points || 0) - parseInt(pointAmount || '0'))
                        )} P
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 bg-hanji-white/50 border-t border-border-light flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-charcoal bg-white border border-border-light rounded-xl hover:bg-hanji-white transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateMember}
                  disabled={actionLoading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-charcoal rounded-xl hover:bg-deep-sage transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장하기'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
