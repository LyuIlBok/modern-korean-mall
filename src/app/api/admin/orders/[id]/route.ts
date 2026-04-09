import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, tracking_number, adminToken } = body;

    if (!adminToken) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    
    const isAdmin = await validateAdmin(adminToken);
    if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const updateData: any = { status };
    if (tracking_number !== undefined) {
      updateData.tracking_number = tracking_number;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Order PATCH Error]:', msg);
    return NextResponse.json({ error: '주문 상태 수정에 실패했습니다.' }, { status: 500 });
  }
}
