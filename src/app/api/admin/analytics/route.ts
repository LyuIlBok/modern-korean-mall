import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [cowork] 관리자 분석 고도화 트랙 — 카테고리별 매출 / 고객 세그먼트(신규·재구매·휴면) /
 * 재구매율을 한 번에 반환. 무거운 집계는 `get_admin_analytics_summary` SQL 함수(Postgres
 * 쪽, supabase/migrations/20260801_create_admin_analytics_summary_rpc.sql 계열) 안에서
 * 처리하고, 이 라우트는 관리자 인증 + 얇은 프록시 역할만 합니다.
 *
 * RPC 자체도 SECURITY DEFINER 안에서 is_admin()을 다시 체크하므로, 이 라우트의
 * verifyAdmin이 뚫리더라도 RPC 단에서 한 번 더 막힙니다(이중 방어).
 *
 * 쿼리 파라미터: ?days=90 (기본 90일, 집계 기간)
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 3650 ? Math.floor(daysParam) : 90;

    const { data, error } = await supabaseAdmin.rpc('get_admin_analytics_summary', { p_days: days });
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Analytics API Error]:', msg);
    return NextResponse.json({ error: '분석 데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
