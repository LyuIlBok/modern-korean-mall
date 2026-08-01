'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft, BarChart3, Loader2, Users, UserPlus, UserCheck, UserMinus, Repeat,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { adminFetch } from '@/lib/adminFetch';
import { CONFIG } from '@/lib/config';

// SalesChart.tsx와 동일한 이유(Recharts SSR 이슈)로 클라이언트 전용 동적 임포트.
const CategorySalesChart = dynamic(() => import('./CategorySalesChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-deep-sage" />
    </div>
  ),
});

interface CategorySales {
  category: string;
  total_sales: number;
  order_count: number;
}

interface AnalyticsData {
  period_days: number;
  category_sales: CategorySales[];
  customer_segments: {
    new_customers: number;
    repeat_customers: number;
    dormant_customers: number;
    total_customers_with_orders: number;
  };
  repurchase_rate_percent: number;
}

const PERIOD_OPTIONS = [30, 90, 365];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  const router = useRouter();

  const fetchAnalytics = useCallback(async (selectedDays: number) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
        return;
      }
      // profiles.is_admin이 진짜 관리자 판정 기준입니다. CONFIG.ADMIN_EMAILS는
      // 최초 슈퍼관리자 이메일 하나만 담긴 폴백입니다.
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      const isSuperAdmin = session.user.email === CONFIG.ADMIN_EMAILS[0];
      if (!profile?.is_admin && !isSuperAdmin) {
        router.replace('/');
        return;
      }

      const res = await adminFetch(`/api/admin/analytics?days=${selectedDays}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '분석 데이터를 불러오지 못했습니다.');
      setData(json.data);
      setFetchError(null);
    } catch (err: unknown) {
      console.error('Error fetching analytics:', err);
      setFetchError(err instanceof Error ? err.message : '분석 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAnalytics(days);
  }, [fetchAnalytics, days]);

  const segments = data?.customer_segments;

  return (
    <div className="min-h-screen bg-hanji-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-sm shadow-sm border border-border-light">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-hanji-white rounded-full transition-all">
              <ArrowLeft className="w-5 h-5 text-charcoal" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-charcoal text-white rounded-sm flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-charcoal">통계 분석</h1>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Admin Analytics</p>
              </div>
            </div>
          </div>

          <div className="flex bg-hanji-white/50 border border-border-light rounded-sm p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                className={`px-4 py-2 rounded-sm text-sm font-bold transition-all ${
                  days === opt ? 'bg-charcoal text-white shadow-sm' : 'text-muted hover:text-charcoal'
                }`}
              >
                최근 {opt}일
              </button>
            ))}
          </div>
        </div>

        {fetchError && (
          <div className="bg-terracotta/5 border border-terracotta/20 text-terracotta text-sm font-medium rounded-sm px-6 py-4">
            {fetchError}
          </div>
        )}

        {loading ? (
          <div className="h-[400px] flex items-center justify-center bg-white border border-border-light rounded-sm">
            <Loader2 className="w-8 h-8 animate-spin text-deep-sage" />
          </div>
        ) : data ? (
          <>
            {/* 고객 세그먼트 요약 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 border border-border-light rounded-sm shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold">신규 고객</p>
                  <h4 className="font-serif text-2xl text-charcoal">{segments?.new_customers.toLocaleString()}명</h4>
                </div>
                <div className="w-11 h-11 bg-deep-sage/5 rounded-full flex items-center justify-center text-deep-sage">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white p-6 border border-border-light rounded-sm shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold">재구매 고객</p>
                  <h4 className="font-serif text-2xl text-charcoal">{segments?.repeat_customers.toLocaleString()}명</h4>
                </div>
                <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white p-6 border border-border-light rounded-sm shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold">휴면 고객 (90일+)</p>
                  <h4 className="font-serif text-2xl text-charcoal">{segments?.dormant_customers.toLocaleString()}명</h4>
                </div>
                <div className="w-11 h-11 bg-hanji-white rounded-full flex items-center justify-center text-muted">
                  <UserMinus className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white p-6 border border-border-light rounded-sm shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold">재구매율</p>
                  <h4 className="font-serif text-2xl text-charcoal">{data.repurchase_rate_percent}%</h4>
                </div>
                <div className="w-11 h-11 bg-terracotta/5 rounded-full flex items-center justify-center text-terracotta">
                  <Repeat className="w-5 h-5" />
                </div>
              </div>
            </div>

            <p className="text-[13px] text-muted flex items-center gap-2 px-1">
              <Users className="w-3.5 h-3.5" /> 최근 {data.period_days}일간 결제완료 주문 기준, 전체 구매 이력 있는 고객 {segments?.total_customers_with_orders.toLocaleString()}명 중 집계
            </p>

            {/* 카테고리별 매출 차트 */}
            <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
              <div className="mb-8">
                <h3 className="font-serif text-2xl text-charcoal">카테고리별 매출</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">Sales by Category (Last {data.period_days} Days)</p>
              </div>
              <CategorySalesChart data={data.category_sales} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
