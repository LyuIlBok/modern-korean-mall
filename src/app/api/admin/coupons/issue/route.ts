import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * [Admin Coupon Issue API]
 * - POST: 특정 회원(이메일)에게 쿠폰 지급
 */

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });

    const body = await request.json();
    const { couponId, email } = body;

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
