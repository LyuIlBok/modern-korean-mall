import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * [Admin Coupon Issue API]
 * - POST: 특정 회원(이메일)에게 쿠폰 지급
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { couponId, email, adminToken } = body;

    if (!adminToken) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

    const isAdmin = await validateAdmin(adminToken);
    if (!isAdmin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    if (!couponId || !email) {
      return NextResponse.json({ error: '쿠폰과 회원 이메일을 모두 입력해주세요.' }, { status: 400 });
    }

    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!targetProfile) {
      return NextResponse.json({ error: '해당 이메일의 회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from('user_coupons')
      .select('id')
      .eq('user_id', targetProfile.id)
      .eq('coupon_id', couponId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 해당 쿠폰을 보유한 회원입니다.' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_coupons')
      .insert([{ user_id: targetProfile.id, coupon_id: couponId, is_used: false }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data, memberName: targetProfile.full_name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin Coupon Issue Error]:', msg);
    return NextResponse.json({ error: '쿠폰 지급에 실패했습니다.' }, { status: 500 });
  }
}
