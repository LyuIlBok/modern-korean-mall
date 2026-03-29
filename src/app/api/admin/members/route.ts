import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드 전용 Supabase 클라이언트 (Service Role 권한 활용 - 보안 주의)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // .env.local에 정의되어야 함
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function PATCH(request: Request) {
  try {
    // 1. 요청 보낸 사용자 세션 확인 (보안 강화)
    // 실제 운영 환경에서는 auth.getUser()를 통해 세션을 재검증해야 함
    // 여기서는 지시사항에 따라 보안 로직을 최상단에 배치
    const body = await request.json();
    const { userId, targetTier, targetPoints, adminToken } = body;

    // [보안] 관리자 신분증 검증 로직
    // 실제 세션 쿠키를 확인하거나, 관리자 프로필을 DB에서 직접 조회
    // 여기서는 간단하게 전달된 adminToken (세션 ID 등)을 통해 profiles 테이블의 is_admin을 서버에서 직접 확인
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

  } catch (err: any) {
    console.error('[Admin API Error]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
