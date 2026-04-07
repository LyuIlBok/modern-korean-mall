import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, targetTier, targetPoints, adminToken } = body;

    // [보안] 관리자 신분증 검증 로직
    const { data: adminProfile, error: authError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('id', adminToken)
      .single();

    if (authError || !adminProfile?.is_admin) {
      console.error('[Security Violation] Unauthorized admin action attempt');
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 회원 정보 업데이트 수행
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tier: targetTier, 
        points: targetPoints,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: '회원 정보가 안전하게 업데이트되었습니다.' });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin API Error]:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
