import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * [Admin CRM API]
 * - GET: 모든 회원 목록 조회 (관리자 전용)
 * - PATCH: 회원 등급 및 적립금 수정
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminToken = searchParams.get('adminToken');

    if (!adminToken) {
      console.error('[Admin CRM GET] Missing adminToken in query params');
      return NextResponse.json({ error: '인증 토큰(adminToken)이 누락되었습니다.' }, { status: 401 });
    }

    // 1. 관리자 권한 검증
    const { data: adminProfile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('id', adminToken)
      .single();

    if (authError) {
      console.error('[Admin CRM GET] Auth Query Error:', authError.message);
      return NextResponse.json({ error: `관리자 확인 실패: ${authError.message}` }, { status: 403 });
    }

    const isSuperAdmin = adminProfile?.email === CONFIG.ADMIN_EMAILS[0];
    const isAdmin = adminProfile?.is_admin || isSuperAdmin;

    if (!isAdmin) {
      console.error('[Admin CRM GET] Unauthorized attempt by:', adminProfile?.email);
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

    return NextResponse.json({ success: true, data: members });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown fatal error';
    console.error('[Admin CRM GET] Fatal Exception:', msg);
    return NextResponse.json({ error: `서버 내부 오류: ${msg}` }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, targetTier, targetPoints, adminToken } = body;

    if (!adminToken || !userId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 1. 관리자 권한 검증
    const { data: adminProfile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('id', adminToken)
      .single();

    const isSuperAdmin = adminProfile?.email === CONFIG.ADMIN_EMAILS[0];
    const isAdmin = adminProfile?.is_admin || isSuperAdmin;

    if (authError || !isAdmin) {
      console.error('[Admin CRM PATCH] Unauthorized attempt');
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 회원 정보 업데이트 수행
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tier: targetTier, 
        points: targetPoints,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Admin CRM PATCH] Update Error:', updateError.message);
      return NextResponse.json({ error: `수정 실패: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '회원 정보가 성공적으로 업데이트되었습니다.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown fatal error';
    console.error('[Admin CRM PATCH] Fatal Exception:', msg);
    return NextResponse.json({ error: `서버 내부 오류: ${msg}` }, { status: 500 });
  }
}
