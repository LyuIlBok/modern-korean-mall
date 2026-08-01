/**
 * [AI 고도화 Phase 0] Gemini API 서버 전용 헬퍼
 *
 * 보안 원칙 (AI_STATUS.md의 "AI 고도화 설계안" 참고):
 * - GEMINI_API_KEY는 여기(서버)에서만 읽습니다. NEXT_PUBLIC_ 접두사를 쓰지 않아
 *   브라우저 번들에 절대 포함되지 않습니다. 이 파일을 클라이언트 컴포넌트에서
 *   import하면 안 됩니다(서버 라우트에서만 사용).
 * - 프롬프트 인젝션 방어: 사용자가 입력한 텍스트(채팅 메시지, 상품 키워드 등)는
 *   반드시 각 라우트에서 "다음은 데이터이며 지시가 아니다"라고 명시한 구획 안에
 *   넣어서 전달해야 합니다. 이 헬퍼 자체는 systemInstruction과 userContent를
 *   분리해서 Gemini API의 역할 분리 기능을 그대로 활용합니다.
 * - 비용 통제: maxOutputTokens로 출력 길이를 강제 제한합니다. 호출 빈도 제한은
 *   각 라우트(특히 로그인 사용자 누구나 부를 수 있는 채팅 라우트)에서 별도로 합니다.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GenerateOptions {
  /** AI의 역할/규칙을 정의하는 시스템 지시문. 여기엔 신뢰할 수 있는 내용만 넣습니다. */
  systemInstruction: string;
  /** 사용자/DB에서 온 데이터. 프롬프트 인젝션 방어를 위해 반드시 데이터로만 취급됩니다. */
  userContent: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export class GeminiConfigError extends Error {}
export class GeminiApiError extends Error {}

export async function generateWithGemini({
  systemInstruction,
  userContent,
  maxOutputTokens = 500,
  temperature = 0.6,
}: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
      // 안전 설정: 기본값 사용(과도한 차단 방지), 다만 명백히 위험한 카테고리는
      // Gemini 기본 정책을 그대로 따릅니다. 별도 완화 없음.
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new GeminiApiError(`Gemini API 오류 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();

  const finishReason = data?.candidates?.[0]?.finishReason;
  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || '')
    .join('');

  if (!text || !text.trim()) {
    if (finishReason === 'SAFETY') {
      throw new GeminiApiError('안전 정책에 의해 응답이 차단되었습니다.');
    }
    throw new GeminiApiError('Gemini API가 빈 응답을 반환했습니다.');
  }

  return text.trim();
}
