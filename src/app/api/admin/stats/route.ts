import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 어드민용 Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    // 1. 최근 30일간의 '결제완료' 및 '배송완료' 주문 조회
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_price, created_at, status')
      .in('status', ['결제완료', '배송완료'])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. 데이터 가공 (일별 집계)
    const statsMap: Record<string, { date: string; revenue: number; count: number }> = {};

    // 최근 30일간의 날짜 미리 채우기 (데이터가 없는 날도 0으로 표시하기 위함)
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      statsMap[dateStr] = { date: dateStr.slice(5), revenue: 0, count: 0 };
    }

    orders?.forEach((o) => {
      const dateStr = o.created_at.split('T')[0];
      if (statsMap[dateStr]) {
        statsMap[dateStr].revenue += Number(o.total_price);
        statsMap[dateStr].count += 1;
      }
    });

    const chartData = Object.values(statsMap);

    // 3. 누적 정보 계산
    const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_price), 0) || 0;
    const totalCount = orders?.length || 0;

    return NextResponse.json({
      success: true,
      data: chartData,
      summary: {
        totalRevenue,
        totalCount
      }
    });
  } catch (err: any) {
    console.error('[Admin Stats API Error]:', err.message);
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
