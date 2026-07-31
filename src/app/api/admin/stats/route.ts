import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

async function validateAdmin(adminToken: string) {
  const { data: adminProfile, error: authError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, email')
    .eq('id', adminToken)
    .single();

  if (authError || !adminProfile) return false;

  const isSuperAdmin = adminProfile.email === CONFIG.ADMIN_EMAILS[0];
  return adminProfile.is_admin || isSuperAdmin;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminToken = searchParams.get('adminToken');

    if (!adminToken) {
      return NextResponse.json({ error: '인증 토큰(adminToken)이 누락되었습니다.' }, { status: 401 });
    }

    const isAdmin = await validateAdmin(adminToken);
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabaseAdmin
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Stats API Error]:', msg);
    return NextResponse.json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
