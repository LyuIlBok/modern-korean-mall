# 단어학습앱 (AgriLeitner / leitner_app.html) 요약 정보

Gemini CLI가 만든 다수의 AI 협업 도구 파일을 정리하면서, 실제 앱과 관련된 정보만 보존해 둔 문서입니다.

## 앱 개요
- 파일: `leitner_app.html` (단일 HTML 파일, React 18 + Tailwind CSS + Babel, CDN으로 빌드 없이 구동)
- 주제: 라이트너 학습법 기반 농업/공학 전문용어(식물보호기사 등) 단어장 SaaS

## 백엔드
- Supabase 프로젝트 URL: `https://cfimyvvecsoqeicsjezo.supabase.co`
- Anon Key: 코드 내 하드코딩되어 있음 (공개되어도 안전한 anon key, RLS로 보호)
- DB 테이블:
  - `public.agri_profiles`: 요금제(Free/Pro), AI 생성 카운트 관리
  - `public.agri_cards`: 사용자별 플래시카드 저장
- Google OAuth 연동 (로그인) — Client ID/Secret은 이 저장소에는 없음. 과거 Gemini CLI 로컬 메모리(`.gemini/tmp/project/memory/MEMORY.md`, 이 폴더 밖에 위치)에 저장되어 있었다는 기록이 있으니, 실제 값이 어디에 있는지 확인 후 필요시 재발급(rotate) 권장.

## 로컬 실행
- `run_local_server.bat` 실행 → `http://localhost:5000/leitner_app.html` (구글 로그인은 file:// 프로토콜을 막기 때문에 로컬 서버 경유 필요)

## 참고
이 폴더(`word_app`)의 git 원격 저장소는 실제로는 쇼핑몰 저장소(`github.com/LyuIlBok/modern-korean-mall`)입니다. 단어앱을 별도 저장소로 분리하는 작업이 예정되어 있습니다.
