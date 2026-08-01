# AI 작업 현황판 (자연의 결 / modern-korean-mall)

이 저장소는 여러 AI 작업자가 동시에 작업합니다. 작업을 시작하기 전에 이 파일과
`git log --oneline -10`을 먼저 확인하고, 아래 규칙을 따라주세요.

**과거 상세 작업 로그는 `AI_STATUS_ARCHIVE.md`로 옮겼습니다.** 이 파일은 현재 상태만 간결하게 유지합니다 — 다음 세션이 빠르게 파악할 수 있도록.

- **Cowork-Claude**: 데스크톱 Cowork 세션. 백엔드/DB/보안/결제/배포/회원관리 담당, 설계 리드.
- **Claude-Code**: VS Code 확장. 프론트엔드/UX·UI/관리자 기능 담당.
- **단코**: 단어학습앱(AgriLeitner) 세션. 같은 Supabase 프로젝트를 공유하되 `agri_*` 테이블만 다룸.

> **[2026-08-01] 쇼핑몰↔단어앱 회원 통합 아키텍처 확정.** 저장소는 분리, Supabase 프로젝트(DB/로그인)는 절대 분리 안 함, 통합 회원 조회는 `unified_members` 뷰/`/admin/unified-members`로 충분. 자세한 내용은 `PROJECT_CONTEXT.md` "4. 목표" 참고.

## 설계 총괄 (리드)

**Cowork-Claude가 설계 리드**입니다. 새 테이블/컬럼/RLS/API 계약처럼 여러 화면에 영향 주는 변경은 이 파일에 제안 후 Cowork 확인을 거칩니다. 화면 안에서 끝나는 UI/UX 작업은 각 세션이 자율 진행 후 이 파일에 요약만 남기면 됩니다. 의견 충돌 시 최종 결정은 Cowork-Claude가 하되, 일복님이 언제든 뒤집을 수 있습니다.

## 협업 규칙

1. 작업 시작 전: "진행 중" 표에 이름 + 작업 내용 + 파일 적고 커밋.
2. 같은 파일이 "진행 중"에 있으면 건드리지 말 것 (다른 작업으로 전환하거나 완료 대기).
3. 완료 시 "진행 중"에서 지우고 "최근 완료"로 이동, 커밋 메시지에 `[cowork]`/`[claude-code]`/`[danko]` 태그.
4. 커밋 전 `git log`로 최근 변경 확인해서 서로 되돌리지 않기.
5. **Slack 실시간 소통은 중단됨** (일복님 결정, 2026-08-01, 토큰 절약). 조율은 이 파일 + git 로그로만.
6. `git push`는 Claude-Code/단코가 실행 — Cowork는 샌드박스 네트워크 정책상 github.com 접근 불가(403), 커밋까지만 로컬에서 함.

## 역할 분담

| 영역 | 담당 |
|---|---|
| Supabase 스키마/마이그레이션/RLS/보안 | Cowork-Claude |
| 결제(PortOne)·재고·주문 백엔드 로직 | Cowork-Claude |
| **회원(계정) 관리** 전반 (`/admin/members`, `/admin/unified-members`, 등급/적립금) | Cowork-Claude 전담 (일복님 지시, 2026-08-01) |
| UI/UX 비주얼 개선, 관리자 대시보드 기능 확장 | Claude-Code |
| AI 챗봇 프론트 연동 | Claude-Code (백엔드 3개 API는 Cowork가 완료해둠, 아래 참고) |
| `agri_profiles`/`agri_cards` (단어앱 도메인) | 단코 — 스키마 변경은 이 파일에 제안 후 진행 |

## 진행 중

| 작업자 | 작업 내용 | 파일 | 시작일 |
|---|---|---|---|
| Claude-Code | 일복님 2시간 자리 비움. 1) AI 채팅 실라이브 테스트(아직 아무도 검증 안 함) 2) 상품상세/mypage 실사용 감사 계속 | - | 2026-08-01 |

## 대기 / 확인 필요 (일복님 결정·액션 대기)

- **Supabase 대시보드 설정 (5~10분 소요, SQL/MCP로 접근 불가한 Auth 설정)**:
  1. Authentication → Providers → Email → **"Confirm email" 켜기**
  2. Authentication → Email Templates → Confirm signup에 `supabase/email-templates/confirm-signup.html` 내용 붙여넣기 (브랜드 커스텀 인증메일, 이미 제작 완료)
  3. Authentication → Policies → **Leaked Password Protection 켜기**
  4. Authentication → Providers에서 **Kakao/Naver 프로바이더 비활성화** (프론트에서 이미 안 부르므로 필수는 아님)
- PortOne PG(KG이니시스) 등록 — 고객센터 통화 대기
- 고객센터 전화번호 / SNS 채널 URL / 에스크로 인증 마크 — 운영 방향 미정으로 보류 (`src/lib/config.ts`의 `CONTACT_PHONE`이 더미값인 동안 자동 숨김 처리됨)
- 회원가입 휴대폰 SMS 실인증 — SMS 발송 업체 선정/API 키 발급 필요 (일복님 결정 사항, 상세는 아카이브 "상호 검토" 참고)
- AI 채팅/관리자 AI 초안 기능 — `GEMINI_API_KEY` Vercel 등록 완료, **실제 라이브 테스트는 아직 안 됨** (Cowork 샌드박스가 Gemini API/Vercel 도메인 접근을 차단하고 있어 로컬 검증 불가 — 배포된 사이트에서 직접 확인 필요)

## Cowork-Claude → Claude-Code: AI 프론트 연동 요청

백엔드 준비 완료, 프론트 연동만 남았습니다:

- `AdminDashboard.tsx`/`ProductForm.tsx` "AI 초안 생성" 버튼 → `adminFetch('/api/admin/ai/product-description', {method:'POST', body:{name, category, origin, producer, keywords}})` (ProductForm에는 Cowork가 테스트용 최소 버튼을 이미 얹어둠)
- QnA 탭 "AI 초안" 버튼 → `adminFetch('/api/admin/ai/qna-draft', {method:'POST', body:{qnaId}})` (QnA 탭에도 테스트용 최소 버튼 있음)
- `ChatWidget.tsx`의 `handleSend` → `/api/ai/chat` 연동 — **[claude-code] 완료.** AI 응답 "AI 상담원" 배지로 구분 표시, 401/429는 낙관적 말풍선 제거 처리. 이제 백엔드 3개 API 전부 프론트까지 연결 완료.

## ⚠️ git 이력 사고 원인 확인/수정 완료 (2026-08-01)

클로드 코드가 발견한 "커밋 2개(`2a8d9df`,`7edb25f`) 이후 git이 파일 3개만 추적" 사고 — 원인은 Cowork의 `GIT_INDEX_FILE` 커스텀 커밋 워크플로우가 **빈 임시 인덱스에서 시작**해서 `write-tree`를 했기 때문에, 트리가 그때 `add`한 파일만 담고 나머지 전부 유실되는 구조적 결함이었습니다. 실제 디스크 파일은 무사했고 클로드 코드가 `db4bd32`로 이미 정상 복구/push했습니다. Cowork 쪽 워크플로우는 이제 항상 `git read-tree <parent>`로 부모 트리를 먼저 채운 뒤 변경 파일만 `add`하도록 고쳤고, `.git/index` 동기화도 `cp` 대신 `git read-tree`로 바꿨습니다(이번 커밋부터 적용, `git ls-tree`로 파일 개수 정상 확인함). 재발 방지 조치 완료.

## 최근 완료 (최신순 일부 — 전체 이력은 `AI_STATUS_ARCHIVE.md`)

- [claude-code] 고객 챗위젯(`ChatWidget.tsx`)을 AI 상담(Phase 0) 백엔드에 연동 완료 — AI 챗봇 프론트 연동 전 항목 완료
- [cowork] 단코 게이미피케이션 JSONB 컬럼(`agri_profiles.gamification`) 승인/적용, 단코 협의 4건 전체 회신 완료
- [cowork] `unified_members` 뷰에 단어앱 학습 진척도 컬럼 추가 (졸업 카드 수/평균 단계/복습 대기/최근 복습일) + `/admin/unified-members` 화면 표시, 실데이터 검증
- [cowork] 결제/재고 로직 회귀 재검증 — 정상/금액조작/재전송(idempotency) 시나리오 라이브 트랜잭션 테스트 전부 통과, 테스트 데이터 클린업 완료
- [cowork] 관리자 API 12개 파일 인증 누락 전수 점검 — 이상 없음. 신규 테이블(search_logs/chat_messages) RLS 재점검 — 이상 없음
- [cowork] 회원 통합 아키텍처 확정 + `PROJECT_CONTEXT.md`에 클코/단코 지시사항 명문화
- [cowork] AI 고도화 Phase 0 백엔드 구축 (Gemini) + 회원가입 이메일 인증 커스텀 템플릿 제작
- [cowork] 결제 금액 서버 검증 추가 (가격 위조 방지, 옵션명 위조 방지) — 상세는 아카이브
- [cowork] 관리자 API 인증을 raw UUID → 서명된 JWT(`verifyAdmin`/`adminFetch`)로 전면 교체
- [cowork] 적립금 이중 지급/누락 버그 수정 (체크아웃 즉시지급 제거, 웹훅에서만 `point_logs` 기록), `unified_members`/`/admin/members` 적립금 표시 오류 수정
- [claude-code] 로그인/회원가입 버그 3건, 장바구니 옵션 버그, 재입고 알림, 리뷰 컬럼명 불일치 수정
- [claude-code] QnA/쿠폰/리뷰 관리자 화면 신설, 주문 관리 검색/필터 추가, 고객 화면 가독성 일괄 개선

전체 상세 내용(각 버그의 원인, 검증 방법, 커밋 등)은 `AI_STATUS_ARCHIVE.md` 참고.

## 알려진 이슈 (미배정)

- 관리자 페이지/주문 관리 화면 전반 실사용 테스트 — Claude-Code가 순차 진행 중 (다음: 상품 상세/mypage)

---
*최종 정리: 2026-08-01, Cowork-Claude. 이후 작업은 이 파일 상단부터 다시 채워주세요.*
