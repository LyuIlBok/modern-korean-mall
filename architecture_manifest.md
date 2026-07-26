# AgriLeitner Pro - 통합 아키텍처 명세서
- 프로젝트 목표: 다중 AI(Multi-Agent) 협업 기반의 3D 메타버스 오피스 및 웹앱(쇼핑몰, 단어장) 통합 관리.
- 통신 프로토콜: 로컬 Node.js (Port: 5001) 기반 REST API 메시지 브로커.
- AI 역할 분담 (예정):
  1. Agent_Commander: 전체 시스템 아키텍처 및 3D 씬 기획.
  2. Agent_Worker: 로컬 코드 작성, 백엔드/프론트엔드 실무 구현.

- [NEW] BYOK (Bring Your Own Key) 확장 시스템:
  소비자가 Llama 등 무료 오픈소스 AI 또는 외부 API 키를 플랫폼에 직접 등록하면, 해당 AI가 5001번 브로커에 접속하여 독립적인 Worker Agent로 활동하도록 권한을 부여함. (토큰 비용 제로화 아키텍처)
