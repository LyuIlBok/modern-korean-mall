'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Search, ShoppingBag, BookOpen } from 'lucide-react';

interface UnifiedMember {
  id: string;
  email: string;
  signed_up_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  uses_mall: boolean;
  mall_tier: string | null;
  mall_points: number | null;
  mall_total_spent: number | null;
  mall_order_count: number;
  uses_word_app: boolean;
  word_app_tier: string | null;
  word_app_ai_generations: number | null;
  word_app_card_count: number;
}

export default function UnifiedMembersPage() {
  const [members, setMembers] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('인증 세션이 유효하지 않습니다. 다시 로그인해주세요.');
        return;
      }
      const res = await fetch(`/api/admin/unified-members?adminToken=${session.user.id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || '조회에 실패했습니다.');
        return;
      }
      setMembers(json.data);
    } catch {
      setError('조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter(m =>
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button onClick={() => router.push('/admin')} className="flex items-center gap-1 text-sm text-muted mb-4 hover:text-charcoal">
        <ArrowLeft className="w-4 h-4" /> 관리자 홈으로
      </button>

      <h1 className="text-2xl font-bold mb-1">통합 회원 관리</h1>
      <p className="text-sm text-muted mb-6">쇼핑몰(자연의 결)과 단어앱(AgriLeitner) 가입 현황을 한 번에 봅니다. 같은 Supabase 계정(이메일)을 공유하므로 한 사람이 두 서비스 모두 이용 중인지 바로 확인할 수 있어요.</p>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="이메일 또는 이름 검색"
          className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted"><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">이메일</th>
                <th className="p-3">이름</th>
                <th className="p-3">가입일</th>
                <th className="p-3"><ShoppingBag className="w-4 h-4 inline mr-1" />쇼핑몰</th>
                <th className="p-3"><BookOpen className="w-4 h-4 inline mr-1" />단어앱</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="p-3">{m.email}{m.is_admin && <span className="ml-2 text-xs bg-charcoal text-white px-1.5 py-0.5 rounded">관리자</span>}</td>
                  <td className="p-3">{m.full_name || '-'}</td>
                  <td className="p-3 text-muted">{m.signed_up_at ? new Date(m.signed_up_at).toLocaleDateString() : '-'}</td>
                  <td className="p-3">
                    {m.uses_mall
                      ? <span>{m.mall_tier || '-'} · 주문 {m.mall_order_count}건 · {(m.mall_points ?? 0).toLocaleString()}P</span>
                      : <span className="text-muted">미이용</span>}
                  </td>
                  <td className="p-3">
                    {m.uses_word_app
                      ? <span>{m.word_app_tier || '-'} · 카드 {m.word_app_card_count}개</span>
                      : <span className="text-muted">미이용</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
