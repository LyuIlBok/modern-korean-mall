import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [통합 회원 관리 API]
 * - 쇼핑몰(profiles)과 단어앱(agri_profiles)을 합쳐서 보여주는 unified_members 뷰를 조회합니다.
 * - unified_members는 auth.users를 포함하므로 반드시 관리자 검증을 통과한 요청에만 응답합니다.
 */

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
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
