import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin QnA API]
 * qna 테이블은 저장소 마이그레이션 이력에 RLS 정책이 전혀 기록되어 있지 않아,
 * 관리자 답변 등록/삭제를 클라이언트에서 직접 supabase.from('qna')로 처리하면
 * 실제 접근 통제가 DB에 남아있는(추적 불가능한) RLS 정책에만 의존하게 됩니다.
 * 다른 관리자 API들과 동일하게 서버에서 JWT 기반 verifyAdmin으로 검증 후
 * service_role(supabaseAdmin)로만 쓰기 작업을 수행하도록 통일합니다.
 */

export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

  const body = await request.json();
  const { id, answer } = body;

  if (!id || !answer || !String(answer).trim()) {
    return NextResponse.json({ error: 'id와 답변 내용이 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('qna')
    .update({ answer: String(answer).trim(), answered_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('qna').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
