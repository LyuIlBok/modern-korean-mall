import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, fullName } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: '이메일과 성함 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // Resend를 통한 이메일 발송
    // API 키가 없으면 실제 발송은 실패하지만, try-catch로 제어 가능
    const { data, error } = await resend.emails.send({
      from: 'Nature Texture <onboarding@resend.dev>',
      to: [email],
      subject: '[자연의 결] 요청하신 아이디 정보입니다.',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0;">
          <h2 style="color: #4A5D4E; margin-bottom: 24px;">안녕하세요 ${fullName}님,</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            요청하신 아이디(이메일) 정보를 안내해 드립니다.
          </p>
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 4px; margin: 32px 0; text-align: center;">
            <span style="font-size: 20px; font-weight: bold; color: #2A2A2A;">${email}</span>
          </div>
          <p style="font-size: 14px; color: #666;">
            보안을 위해 본 메일은 발신 전용으로 회신되지 않습니다.<br/>
            감사합니다.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #999;">
            © 2026 NATURE TEXTURE (복이네농장). All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email Send Error:', error);
      // API Key가 설정되지 않은 경우 등을 대비해 에러 반환
      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다. (API 키를 확인해주세요)' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send Email Catch Error:', err);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
