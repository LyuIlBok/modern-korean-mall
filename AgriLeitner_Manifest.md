# 🎓 자연의 결 & AgriLeitner Pro - 가상 오피스 통합 명세 (Manifest)

이 명세서는 개발 환경의 지속성과 세션 재부팅 시의 완벽한 문맥 보존을 장장 100% 설계하여 기록하는 상태 명세서입니다.

---

## 1. 📂 프로젝트 핵심 정보
- **프로젝트 명**: 자연의 결 & AgriLeitner Pro SaaS (AgriLeitner_MetaSpace)
- **주요 워크스페이스**: `C:\Users\유일복\Desktop\word_app`
- **유니티 프로젝트**: `C:\Users\유일복\My project` (Unity 6.5.0f1 기반)
- **메인 어플리케이션**: `leitner_app.html` (React, Tailwind CSS, Supabase Cloud 및 Google OAuth 연동 싱글 페이지 프리미엄 SaaS)

---

## 2. 🔌 하이브리드 아키텍처 & 실시간 네트워크 사양
- **백엔드 서버 (`unity_server.js`)**: 포트 `5001`에서 가동
- **주요 REST API 사양**:
  - `GET /api/status`: 실시간 에이전트 생각, 행동, 실행 결과 폴링 (유니티 3D 로봇 및 캐릭터 제어용)
  - `GET /api/state`: 현재 시스템 수준 상태 명세서(`system_state.json`) 폴링 (신규 구축)
  - `POST /api/command`: 유니티 클라이언트 인풋 필드를 통한 자연어 명령 전달 및 AI 루프 구동
- **재부팅 무중단 설계(Reboot Robustness)**:
  - 서버 다운 시 유니티 에디터 스팸 로그 억제 및 Hot-Reconnection 완료.
  - 에이전트 동작 이력을 `agent_state.json`에 항시 기록하여 급작스러운 다운 후 재부팅 시 중단 원인을 자동 분석하고 상태 원상 복구 및 유니티에 예외 공유.

---

## 3. 🎯 개발 히스토리 및 현재 달성 마일스톤
- **Phase 1 [완료]**: 유니티 ⇄ Node.js REST API 기본 통신 구축 및 `AIWorkspaceManager.cs` 네트워킹 검증.
- **Phase 2 [완료/검증]**: 
  - 3D 캐릭터 애니메이션 바인딩 자동화(Option B) 완료.
  - 마우스 클릭 없이 유니티 툴바 단 한번의 실행으로 모든 하이어라키 오브젝트, 애니메이터 상태 노드(Thinking, Typing, Cheer, Sad, Idle) 및 상태 조건 전이선 5개를 원클릭 자동 구성하는 **`AIWorkspaceEditorAutomator.cs`** 설계 및 배치 완료.
- **철통 보안 GitHub Push 연동 [완료]**:
  - 원격 깃허브 저장소(`https://github.com/LyuIlBok/modern-korean-mall`) 연결 성공.
  - 노출 위험이 있던 기밀(Google Client Secret 등)을 마스킹하고, 로컬 Git 내의 286개 과거 커밋 이력을 통째로 역추적하여 기밀을 완전 세탁(`git filter-branch`)하는 고난도 보안 무결성 푸시 성공.

---

## 4. 📅 차기 개발 이정표 (Next Todo)
- **Phase 3 (Live Code Inspector 및 실시간 탐색기)**:
  - `unity_server.js`에 `/api/files` (파일 목록 수신) 및 `/api/file_content` (코드 내용 수신) 구축.
  - 유니티 내에 ScrollView UI 배치 및 파일명 버튼 클릭 시 3D 화면 상 대형 컴퓨터 스크린에 코드가 실시간 렌더링되도록 구현.
