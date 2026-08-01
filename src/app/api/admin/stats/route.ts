import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total_price, created_at, status')
      // [cowork] '배송준비중'도 이미 결제된 주문인데 빠져있어서 최근 30일 매출이
      // 과소집계되고 있었음(get_admin_analytics_summary RPC 만들면서 같은 문제 발견) — 추가.
      .in('status', ['결제완료', '배송준비중', '배송완료'])
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Stats API Error]:', msg);
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
