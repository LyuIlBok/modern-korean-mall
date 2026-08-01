import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin CRM API]
 * - GET: 모든 회원 목록 조회 (관리자 전용)
 * - PATCH: 회원 등급 및 적립금 수정
 */

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      console.error('[Admin CRM GET] Unauthorized attempt');
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 전체 회원 목록 조회
    const { data: members, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Admin CRM GET] Fetch Profiles Error:', fetchError.message);
      return NextResponse.json({ error: `데이터베이스 조회 에러: ${fetchError.message}` }, { status: 500 });
    }

    if (!members) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 실제 적립금은 profiles.points 컬럼이 아니라 point_logs 원장의 합계입니다
    // (마이페이지도 user_total_points 뷰=point_logs 합계로 보여줌). profiles.points는
    // 아무 데서도 읽히지 않는 죽은 컬럼이라 여기서 실제 합계를 같이 계산해서 내려줍니다.
    const { data: pointTotals } = await supabaseAdmin
      .from('point_logs')
      .select('user_id, amount');

    const pointsByUser = new Map<string, number>();
    (pointTotals || []).forEach((row) => {
      pointsByUser.set(row.user_id, (pointsByUser.get(row.user_id) || 0) + row.amount);
    });

    const membersWithRealPoints = members.map((m) => ({
      ...m,
      real_points: pointsByUser.get(m.id) || 0,
    }));

    return NextResponse.json({ success: true, data: membersWithRealPoints });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown fatal error';
    console.error('[Admin CRM GET] Fatal Exception:', msg);
    return NextResponse.json({ error: `서버 내부 오류: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      console.error('[Admin CRM PATCH] Unauthorized attempt');
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, targetTier, pointsDelta } = body;

    if (!userId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 2. 등급 업데이트 (tier는 profiles 컬럼이 실제 기준이 맞음)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        tier: targetTier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin CRM PATCH] Update Error:', updateError.message);
      return NextResponse.json({ error: `수정 실패: ${updateError.message}` }, { status: 500 });
    }

    // 3. 적립금은 원장(point_logs)에 증감분만 기록 — 회원 실제 잔액(user_total_points)은
    // 이 테이블의 합계이므로, profiles.points를 직접 덮어쓰면 화면에 반영되지 않습니다.
    if (pointsDelta && Number(pointsDelta) !== 0) {
      const { error: pointError } = await supabaseAdmin
        .from('point_logs')
        .insert([{
          user_id: userId,
          amount: Number(pointsDelta),
          reason: 'ADMIN_ADJUSTMENT',
        }]);

      if (pointError) {
        console.error('[Admin CRM PATCH] Point Log Insert Error:', pointError.message);
        return NextResponse.json({ error: `적립금 기록 실패: ${pointError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: '회원 정보가 성공적으로 업데이트되었습니다.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown fatal error';
    console.error('[Admin CRM PATCH] Fatal Exception:', msg);
    return NextResponse.json({ error: `서버 내부 오류: ${msg}` }, { status: 500 });
  }
}
