import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * [통합 회원 관리 API]
 * - 쇼핑몰(profiles)과 단어앱(agri_profiles)을 합쳐서 보여주는 unified_members 뷰를 조회합니다.
 * - unified_members는 auth.users를 포함하므로 반드시 관리자 검증을 통과한 요청에만 응답합니다.
 */
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

    const { data, error } = await supabaseAdmin
      .from('unified_members')
      .select('*')
      .order('signed_up_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: `조회 실패: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `서버 내부 오류: ${msg}` }, { status: 500 });
  }
}
