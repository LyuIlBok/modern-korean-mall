import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback/naver`);
  const state = Math.random().toString(36).substring(7);

  if (!clientId) {
    console.error('Missing NAVER_CLIENT_ID');
    return NextResponse.json({ error: 'Naver Login is not configured' }, { status: 500 });
  }

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

  return NextResponse.redirect(naverAuthUrl);
}
