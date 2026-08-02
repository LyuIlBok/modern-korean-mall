import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { status, tracking_number } = body;

    // [cowork 2026-08-01] 예전엔 status를 검증 없이 그대로 UPDATE하고 취소류
    // 상태일 때만 재고를 복구했음 — 이미 취소/환불된 주문을 실수로 "배송완료"로
    // 되돌리면 재고가 다시 차감되지 않은 채 발송 처리되어 오버셀로 이어질 수
    // 있었고, 취소 시 적립됐던 포인트도 전혀 회수되지 않았음. 이제
    // admin_update_order_status RPC가 상태 전이 검증 + 재고 반영 + 포인트 회수를
    // 원자적으로 처리(취소류 상태에서는 다른 그룹으로 전이 불가).
    const { data: rpcResult, error } = await supabaseAdmin.rpc('admin_update_order_status', {
      p_order_id: id,
      p_new_status: status,
      p_tracking_number: tracking_number ?? null,
    });

    if (error) throw error;
    if (!rpcResult?.success) {
      return NextResponse.json({ error: rpcResult?.message ?? '주문 상태 변경이 거부되었습니다.' }, { status: 409 });
    }

    const { data, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select()
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, data, points_reversed: rpcResult.points_reversed ?? 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Order PATCH Error]:', msg);
    return NextResponse.json({ error: '주문 상태 수정에 실패했습니다.' }, { status: 500 });
  }
}
