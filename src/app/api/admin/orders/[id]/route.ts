import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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

    // 관리자가 주문을 취소/환불 상태로 바꾸면 차감했던 재고를 복구합니다.
    const cancellationStatuses = ['취소됨', '주문취소', '환불완료', '재고부족취소'];
    if (cancellationStatuses.includes(status)) {
      const { error: restoreError } = await supabaseAdmin.rpc('restore_stock_for_order', { p_order_id: id });
      if (restoreError) {
        console.error('[Admin Order PATCH] Stock restore failed:', restoreError.message);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Order PATCH Error]:', msg);
    return NextResponse.json({ error: '주문 상태 수정에 실패했습니다.' }, { status: 500 });
  }
}
