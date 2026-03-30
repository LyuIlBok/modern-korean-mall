import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * [네이버 프로필 통역기 API]
 * Supabase Custom Provider 설정의 'User Profile Endpoint'에 이 주소를 입력하세요.
 * 예: https://your-domain.vercel.app/api/auth/naver-profile
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'No Authorization header provided' }, { status: 401 });
  }

  try {
    // 1. Supabase가 넘겨준 토큰으로 네이버 프로필 API 호출
    const naverResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!naverResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Naver' }, { status: naverResponse.status });
    }

    const data = await naverResponse.json();

    // 2. 네이버 특유의 'response' 껍데기를 벗기고 알맹이만 반환 (Supabase 인식용)
    if (data.resultcode === '00' && data.response) {
      return NextResponse.json(data.response);
    } else {
      return NextResponse.json({ error: data.message || 'Invalid response from Naver' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Naver Profile Translator Error]:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
