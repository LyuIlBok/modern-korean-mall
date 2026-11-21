<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:multi-agent-coordination -->
# 다중 AI 작업자 협업 안내

이 저장소는 여러 AI 코딩 세션(Cowork, Claude Code 등)이 동시에 작업할 수 있습니다.
**코드를 수정하기 전에 반드시 다음 두 파일을 먼저 읽으세요:**
1. `PROJECT_CONTEXT.md` — 전체 사업/인프라 구조(쇼핑몰+단어앱, Supabase 프로젝트 공유 여부 등). 특히 단어앱(AgriLeitner) 관련 작업을 시작하는 세션은 반드시 먼저 읽을 것.
2. `AI_STATUS.md` — 쇼핑몰 저장소의 실시간 작업 현황/협업 규칙.

작업 시작/종료 시 `AI_STATUS.md`를 갱신하고 커밋하는 것이 필수입니다.
<!-- END:multi-agent-coordination -->

<!-- BEGIN:ai-wiki -->
# AI 위키 참조 안내

일복님의 지식 베이스가 `C:\Users\유일복\Desktop\AI-Wiki`에 있습니다 (옵시디언 볼트, 마크다운).

- **읽기**: 작업 중 배경지식이 필요하면 위키를 참조하세요. 시작점은 `Home.md`,
  용어(코웍/클코/단코/안티 등)는 `용어사전.md`, 협업 규칙은 `30_활용/멀티 AI 세션 협업.md`.
- **쓰기**: 작업 중 얻은 교훈·해법·팁 중 "다음에 또 쓸 것 같은 지식"이 나오면
  `AI-Wiki\00_인박스`에 메모 파일로 남기세요 (예: `클코_git충돌해법_메모.md`).
  위키 본문을 직접 수정할 때는 반드시 `AI-Wiki\WIKI_GUIDE.md`의 규칙을 먼저 읽고 따르세요.
- **금지**: 비밀값(API 키 등)은 위키에 절대 기록하지 않습니다.
<!-- END:ai-wiki -->

<!-- BEGIN:release-checklist -->
# 출시 전 검토사항

로그인·검색·업로드·결제·패키지·입력 양식·홍보 문구를 건드리거나 배포하기 전에는
`docs/RELEASE_CHECKLIST.md`(보안 5 + 법적·소비자 보호 20)의 해당 항목을 읽고,
보고 끝에 `체크리스트: A-1 ✅ …` 한 줄을 붙이세요.
**이 저장소는 공개입니다.** 점검에서 찾은 취약 지점은 파일·커밋에 적지 말고 일복님께 직접 보고하세요.
<!-- END:release-checklist -->
