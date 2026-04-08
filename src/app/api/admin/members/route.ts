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
      return NextResponse.json({ error: '인증 토큰이 누락되었습니다.' }, { status: 401 });
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
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 전체 회원 목록 조회 (비관리자 유저만)
    const { data: members, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, data: members });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin CRM GET Error]:', msg);
    return NextResponse.json({ error: '데이터 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, targetTier, targetPoints, adminToken } = body;

    // 1. 관리자 권한 검증
    const { data: adminProfile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('id', adminToken)
      .single();

    const isSuperAdmin = adminProfile?.email === CONFIG.ADMIN_EMAILS[0];
    const isAdmin = adminProfile?.is_admin || isSuperAdmin;

    if (authError || !isAdmin) {
      console.error('[Security Violation] Unauthorized admin PATCH attempt');
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

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: '회원 정보가 성공적으로 업데이트되었습니다.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin CRM PATCH Error]:', msg);
    return NextResponse.json({ error: '회원 정보 수정에 실패했습니다.' }, { status: 500 });
  }
}
