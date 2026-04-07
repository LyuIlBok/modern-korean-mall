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
    gender?: string;
    age?: string;
    birthday?: string;
    profile_image?: string;
    birthyear?: string;
    mobile?: string;
  };
}

/**
 * [OIDC Standard Naver Profile Translator]
 * This API transforms Naver's custom profile response into standard OIDC claims.
 * Map this in Supabase -> Authentication -> Providers -> Naver (Custom) -> User Profile Endpoint
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
  }

  try {
    // 1. Fetch user info from Naver OpenAPI
    const naverResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': authHeader,
      },
      cache: 'no-store',
    });

    if (!naverResponse.ok) {
      const errorText = await naverResponse.text();
      console.error('[Naver API Error]:', errorText);
      return NextResponse.json({ error: 'Failed to fetch from Naver' }, { status: naverResponse.status });
    }

    const data: NaverMeResponse = await naverResponse.json();

    // 2. Map to OIDC Standard Claims
    // Supabase requires standard claims like 'sub', 'email', 'name'
    if (data.resultcode === '00' && data.response) {
      const res = data.response;
      
      const oidcProfile = {
        sub: res.id, // [CRITICAL] Unique identifier mapped to 'sub'
        name: res.name || res.nickname || 'Naver User',
        email: res.email,
        picture: res.profile_image || null,
        email_verified: true, // Naver provides verified emails by default
        preferred_username: res.nickname || null,
        given_name: res.name || null,
      };

      console.log(`[OIDC Sync] Successfully mapped Naver user: ${oidcProfile.email}`);
      return NextResponse.json(oidcProfile);
    } else {
      console.error('[Naver Response Error]:', data.message);
      return NextResponse.json({ error: data.message || 'Invalid Naver response' }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Naver Profile Translator Fatal Error]:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
