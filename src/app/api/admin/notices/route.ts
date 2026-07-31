import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * [Admin Notices API]
 * notices 테이블은 서비스 롤 전용 쓰기 정책이라, 공지 등록/수정/삭제는
 * 반드시 이 API(관리자 검증 통과)를 통해서만 이루어져야 합니다.
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
  const { searchParams } = new URL(request.url);
  const adminToken = searchParams.get('adminToken');

  if (!adminToken || !(await validateAdmin(adminToken))) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { adminToken, title, content, category, is_popup, is_active } = body;

  if (!adminToken || !(await validateAdmin(adminToken))) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }
  if (!title || !content) {
    return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('notices')
    .insert([{ title, content, category, is_popup, is_active }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { adminToken, id, title, content, category, is_popup, is_active } = body;

  if (!adminToken || !(await validateAdmin(adminToken))) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('notices')
    .update({ title, content, category, is_popup, is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminToken = searchParams.get('adminToken');
  const id = searchParams.get('id');

  if (!adminToken || !(await validateAdmin(adminToken))) {
    return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('notices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
