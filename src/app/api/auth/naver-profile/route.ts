import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NaverMeResponse {
  resultcode: string;
  message: string;
  response?: {
    id: string;
    nickname?: string;
    name?: string;
    email: string;
    profile_image?: string;
  };
}

/**
 * [OIDC Naver Profile Translator]
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const naverResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { 'Authorization': authHeader },
      cache: 'no-store',
    });

    if (!naverResponse.ok) {
      return NextResponse.json({ error: 'Naver API error' }, { status: naverResponse.status });
    }

    const data: NaverMeResponse = await naverResponse.json();

    if (data.resultcode === '00' && data.response) {
      const res = data.response;
      return NextResponse.json({
        sub: res.id,
        name: res.name || res.nickname || 'Naver User',
        email: res.email,
        picture: res.profile_image || null,
        email_verified: true,
      });
    }
    return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Naver Profile Error:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
