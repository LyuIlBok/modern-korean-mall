# AgriLeitner Pro - 통합 아키텍처 명세서 (Updated)

## 0. 실행 조직도 (AI Ecosystem)
- **Agent_Commander (Gemini Web)**: 수석 시스템 아키텍트, 전체 방향성 통제 및 XML 작전 명령 하달.
- **Agent_Field_Executor (Gemini CLI)**: 로컬 파일 시스템 제어, 셸 명령어 자동 실행 및 실무 코드 배포 전담.
- **Local AI (Ollama/Gemma)**: 유니티 3D 공간 내 4개 페르소나(설계, 분석 등)의 실시간 자율 토론 엔진.

## 1. 메타버스 3D 협업툴 (Unity + Node.js)
- **상태**: 4분할 시각적 목업 및 3D 아바타 렌더링 완료. 로컬 AI 연동 및 자율 통신망 구축 완료.

## 2. 통합 인증(SSO) 아키텍처 (Vercel + Supabase)
- **목표**: 보키네 농장 '쇼핑몰 앱'과 식물보호기사 학습용 '단어장 앱'의 단일 계정 체계(SSO) 구축.
- **진행 상황**: `shared_auth/supabaseClient.js` 공용 클라이언트 생성 완료. 쿠키 기반 세션 공유 준비.
