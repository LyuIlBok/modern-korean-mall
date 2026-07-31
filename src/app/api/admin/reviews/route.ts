import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin Reviews API]
 * reviews 테이블 마이그레이션(20240410_coupons_and_reviews.sql)에는 SELECT(전체 공개),
 * INSERT(본인), UPDATE(본인) 정책만 있고 DELETE 정책이 없습니다. 즉 관리자 화면에서
 * 클라이언트가 직접 supabase.from('reviews').delete(...)를 호출하는 기존 방식은
 * RLS 상 거부되어 "삭제"가 조용히 실패하거나(정책 없음=기본 거부), 혹은 추적되지 않은
 * 별도 정책에 의존하는 상태였습니다. service_role로 처리하는 관리자 API로 통일합니다.
 */

export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
