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

    // Resend를 통한 실제 이메일 발송
    const { data, error } = await resend.emails.send({
      from: '자연의 결 <onboarding@resend.dev>', // 실제 도메인 연결 전까지는 onboarding 계정 사용
      to: [email],
      subject: '[자연의 결] 요청하신 아이디(이메일) 안내입니다.',
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; color: #333;">
          <h2 style="color: #4A5D4E; margin-bottom: 24px;">안녕하세요 ${fullName}님,</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            요청하신 고객님의 아이디(가입 이메일)는 다음과 같습니다.
          </p>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; margin: 32px 0; text-align: center; border: 1px solid #eee;">
            <span style="font-size: 22px; font-weight: bold; color: #2A2A2A; letter-spacing: 0.5px;">${email}</span>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.6;">
            보안을 위해 비밀번호는 안내해 드리지 않습니다.<br/>
            비밀번호가 생각나지 않으시면 로그인 화면의 '비밀번호 찾기'를 이용해 주세요.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #999;">
            본 메일은 발신 전용으로 회신이 되지 않습니다.<br/>
            © 2026 NATURE TEXTURE (복이네농장). All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json({ error: '이메일 발송 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send Email Catch Error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
