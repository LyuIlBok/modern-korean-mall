import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { fullName, phone } = await request.json();

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: '이름과 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이름과 연락처로 프로필 조회
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('full_name', fullName)
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Find ID Error:', error);
      return NextResponse.json(
        { error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: '일치하는 회원 정보가 없습니다.' },
        { status: 404 }
      );
    }

    // 이메일 마스킹 (te***@naver.com 형식)
    const [local, domain] = profile.email.split('@');
    let maskedLocal = local;
    if (local.length > 2) {
      maskedLocal = local.substring(0, 2) + '*'.repeat(local.length - 2);
    } else {
      maskedLocal = local.substring(0, 1) + '*';
    }
    const maskedEmail = `${maskedLocal}@${domain}`;

    return NextResponse.json({ 
      email: maskedEmail
    });
  } catch (err) {
    console.error('Find ID Catch Error:', err);
    return NextResponse.json(
      { error: '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
