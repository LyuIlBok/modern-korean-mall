import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_price, created_at, status')
      .in('status', ['결제완료', '배송완료'])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    const statsMap: Record<string, { date: string; revenue: number; count: number }> = {};

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
