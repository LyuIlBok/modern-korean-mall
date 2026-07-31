'use client';

import { useEffect, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Loader2, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useLanguageStore } from '@/store/useLanguageStore';
import { supabase } from '@/lib/supabaseClient';

interface ChartData {
  date: string;
  revenue: number;
  count: number;
}

interface SummaryData {
  totalRevenue: number;
  totalCount: number;
}

export default function SalesChart() {
  const { t, language } = useLanguageStore();
  const [data, setData] = useState<ChartData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalRevenue: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch(`/api/admin/stats?adminToken=${session.user.id}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setSummary(json.summary);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="h-[400px] flex flex-col items-center justify-center bg-white border border-border-light rounded-sm">
      <Loader2 className="w-8 h-8 animate-spin text-deep-sage mb-4" />
      <p className="text-[10px] uppercase tracking-widest text-muted">{t?.admin?.loadingStats || '통계 데이터 분석 중...'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 1. 요약 카드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 border border-border-light rounded-sm shadow-sm flex items-center justify-between group hover:border-deep-sage transition-all">
          <div className="space-y-2">
            <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{t?.admin?.revenue30Days || '최근 30일 누적 매출'}</p>
            <h4 className="font-serif text-3xl text-charcoal group-hover:text-deep-sage transition-colors">
              ₩{summary.totalRevenue.toLocaleString()}
            </h4>
          </div>
          <div className="w-14 h-14 bg-deep-sage/5 rounded-full flex items-center justify-center text-deep-sage group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-8 border border-border-light rounded-sm shadow-sm flex items-center justify-between group hover:border-terracotta transition-all">
          <div className="space-y-2">
            <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{t?.admin?.orders30Days || '최근 30일 주문 건수'}</p>
            <h4 className="font-serif text-3xl text-charcoal group-hover:text-terracotta transition-colors">
              {summary.totalCount.toLocaleString()}건
            </h4>
          </div>
          <div className="w-14 h-14 bg-terracotta/5 rounded-full flex items-center justify-center text-terracotta group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. 매출 추이 차트 */}
      <div className="bg-white p-10 border border-border-light rounded-sm shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-charcoal flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-deep-sage" /> {t?.admin?.revenueTrend || '매출 트렌드'}
            </h3>
            <p className="text-[10px] text-muted uppercase tracking-widest">Revenue Trend (Last 30 Days)</p>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A6741" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4A6741" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#999' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#999' }} 
                tickFormatter={(val) => language === 'ko' ? `₩${(val/10000).toLocaleString()}만` : `₩${(val/1000).toLocaleString()}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '0px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                labelStyle={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}
                itemStyle={{ fontSize: '12px', color: '#4A6741', fontWeight: 'bold' }}
                formatter={(val) => [`₩${Number(val).toLocaleString()}`, t?.admin?.revenueAmount || '매출액']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#4A6741" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
