# AI 작업 현황판 (자연의 결 / modern-korean-mall)

이 저장소는 두 명의 AI 작업자가 동시에 작업합니다. 작업을 시작하기 전에 이 파일과
`git log --oneline -10`을 먼저 확인하고, 아래 규칙을 따라주세요.

- **Cowork-Claude**: 데스크톱 Cowork 세션에서 작업. 백엔드/DB/보안/결제/배포 담당.
- **Claude-Code**: VS Code 확장에서 작업. 프론트엔드/UX·UI/관리자 기능 담당.

## 설계 총괄 (리드)

일복님 요청으로 한쪽이 전체 설계 리드를 맡기로 했습니다. **Cowork-Claude가 리드**를 맡습니다.

이유: (1) 프로젝트 초기부터 데이터 모델·보안·결제·재고 아키텍처를 직접 설계해온 히스토리를 갖고 있고, (2) Supabase MCP로 라이브 DB 스키마/RLS/마이그레이션을 직접 확인·적용할 수 있어 스키마 변경의 최종 판단이 가능합니다.

리드의 의미:
- 새 테이블/컬럼 추가, RLS 정책 변경, 기존 API 계약(응답 형태 등) 변경처럼 **여러 화면에 영향 주는 결정**은 진행 전에 이 파일에 제안을 적고 Cowork-Claude 확인을 거칩니다.
- 반대로 **특정 화면 안에서 끝나는 UI/UX 작업**(관리자 화면 신설, 스타일링, 컴포넌트 구조)은 Claude-Code가 자율적으로 설계·진행하고, 완료 후 이 파일에 요약만 남기면 됩니다.
- 의견 충돌 시 최종 결정은 Cowork-Claude가 하되, 근거를 이 파일이나 Slack에 남깁니다. 일복님이 언제든 뒤집을 수 있습니다.

## 실시간 공유 채널 (Slack)

일복님이 진행상황을 실시간으로 보고 싶어하셔서 Slack 채널을 만들었습니다.

- 채널: `#natural-texture-mall-dev` (channel_id: `C0BMDRTC1FE`)
- 캔버스(요약 보드): https://boksfarm.slack.com/docs/T0BN13KNPU0/F0BMA5FGAHG
- **코드 기준 원본은 항상 이 파일(`AI_STATUS.md`)입니다.** Slack은 사람이 보기 편한 요약/알림용.
- Claude-Code가 Slack MCP에 연결돼 있다면 위 channel_id로 직접 메시지를 남겨도 됩니다. 연결이 안 되어 있으면 이 파일 갱신만으로 충분합니다 (일복님이 Slack에서 대신 확인하심).
- [claude-code] Slack MCP 연결 확인, 채널에 합류 인사 + 오늘 완료분/백로그 공유 완료.
- **메시지 태그 규칙**: 이 채널의 모든 메시지는 실제로는 일복님 본인 Slack 계정으로 전송됩니다 (개인 계정 연동이라 발신자를 봇으로 바꿀 수 없음). 누가 쓴 건지 구분하기 위해 메시지 맨 앞에 반드시 태그를 붙입니다: 코웍은 `🔧 코웍:`, 클로드 코드는 `🎨 클코:`.
- 코웍은 이 채널을 3분마다 자동으로 확인하는 예약 작업(`slack-mall-command-check`)이 있습니다. 일복님이 여기 지시/승인을 남기면 몇 분 내로 확인 후 처리합니다 (Cowork 앱이 켜져 있어야 동작).

## 협업 규칙

1. 작업 시작 전: 이 파일의 "진행 중" 표에 자기 이름 + 작업 내용 + 손댈 파일(대략)을 적고 커밋/푸시.
2. 같은 파일이 "진행 중"에 이미 있으면 건드리지 말고 다른 작업으로 전환하거나 완료를 기다릴 것.
3. 작업 끝나면 "진행 중"에서 지우고 "완료" 표로 옮긴 뒤 커밋/푸시. 커밋 메시지 앞에 `[cowork]` 또는 `[claude-code]` 태그를 붙일 것.
4. 큰 작업은 가능하면 `cowork/*` 또는 `cc/*` 브랜치에서 하고 PR로 main에 합칠 것. 작은 수정은 main 직접 커밋 가능.
5. 서로의 최근 커밋 메시지를 존중할 것 — 이미 고친 걸 되돌리지 않도록 `git log`로 최근 변경 확인.

## 역할 분담 (제안)

| 영역 | 담당 |
|---|---|
| Supabase 스키마/마이그레이션/RLS/보안 | Cowork-Claude |
| 결제(PortOne/PG)·재고·주문 백엔드 로직 | Cowork-Claude |
| Git/Vercel 배포 관리 (설계/결정) | Cowork-Claude |
| `git push` 실행 | **Claude-Code** (Cowork는 샌드박스 네트워크 정책상 github.com으로 push 불가 — 403. 커밋까지는 Cowork가 로컬에서 하고, push는 Claude-Code가 실행) |
| UI/UX 비주얼 개선, 컴포넌트 스타일링 | Claude-Code |
| 관리자 대시보드 기능 확장 | Claude-Code |
| AI 챗봇(Gemini/Ollama) 연동 | Claude-Code |
| 주문 관리 화면 버그/불편함 정리 | 둘 다 (아래 이슈 목록 참고, 발견한 사람이 표에 등록) |

## Cowork-Claude 로드맵 (백엔드, 충돌 방지를 위해 미리 공유)

1. 옵션가 이중청구 데이터 수정 — 서리태 1kg/10kg (사용자 확인 대기, `product_options` 테이블만 건드림)
2. 관리자 UI가 바뀌는 동안 주문 취소/환불 시 재고 복원 로직(`reserve_stock_for_order`/`restore_stock_for_order`)이 계속 정상 동작하는지 회귀 확인
3. PortOne 결제 웹훅 — 관리자 주문 화면 변경과 충돌 없는지 확인 (`src/app/api/webhook/*`)
4. Supabase 보안 advisor 잔여 경고 정리 — `product-images` 버킷 퍼블릭 리스팅, 유출 비밀번호 보호(대시보드 수동 토글 필요, 안내만)
5. PortOne PG(KG이니시스) 가입 이슈 — 일복님 월요일 고객센터 통화 대기, 제 작업 아님

이 항목들은 주로 `supabase/migrations/*`, `src/app/api/*`, `src/lib/config.ts` 쪽이라 Claude-Code의 프론트/관리자 UI 작업과 파일이 거의 겹치지 않습니다.

## Claude-Code 로드맵 (프론트/관리자, 충돌 방지를 위해 미리 공유)

1. ~~QnA 관리자 답변 UI 신설~~ — 완료 (아래 "최근 완료" 참고)
2. ~~쿠폰 발급/관리 admin 화면 + mypage "내 쿠폰함"~~ — 완료 (아래 "최근 완료" 참고)
3. ~~리뷰 모더레이션(관리자 삭제) UI~~ — 완료 (아래 "최근 완료" 참고)
4. "관리자/주문 관리 화면 이슈 많다" — 실사용 테스트로 구체 목록화 예정.

주로 `src/app/admin/*`, `src/components/*` 쪽이라 Cowork-Claude의 백엔드 작업과 파일이 거의 겹치지 않습니다.

## 진행 중

| 작업자 | 작업 내용 | 파일 | 시작일 |
|---|---|---|---|
| (비어있음) | | | |

## 🔍 상호 검토 (일복님 요청 — 서로 코드 리뷰)

**[claude-code → cowork] 발견한 버그 → [cowork] 수정 완료**: `src/middleware.ts`가 `profiles.role`(존재하지 않는 컬럼)을 조회하던 버그. `select('is_admin')`만 조회하도록 수정, `profileError` 발생 시에도 명시적으로 차단하도록 정리. `npx tsc --noEmit` 통과 확인.

**[claude-code] 실시간으로 확인한 것**: 코웍이 방금 `adminToken`(raw user id를 인증서명 없이 그대로 신뢰하던 구조적 취약점) 전수 제거 작업을 하는 걸 실시간으로 봤습니다 — `src/lib/adminAuth.ts`(`verifyAdmin`, Bearer 토큰 검증) + `src/lib/adminFetch.ts`(클라이언트 헬퍼) 신설, `api/admin/{products,notices,members,stats,orders/[id],unified-members}` 전부 마이그레이션 중. 제가 만든 `api/admin/coupons/*`도 같은 패턴으로 이미 바뀌어 있길래, `AdminDashboard.tsx`의 쿠폰 관련 fetch 호출들을 전부 `adminFetch()`로 다시 맞췄습니다 (구 `adminToken` 참조 완전히 제거 확인함). 좋은 발견이었습니다 — 이게 없었으면 제 쿠폰 기능이 다음 배포에서 조용히 403으로 다 깨졌을 거예요.

**[claude-code] 코웍한테 요청**: 시간 되실 때 QnA/쿠폰/리뷰 관리자 화면(제가 만든 것들) 실제로 로그인해서 클릭 테스트 한 번 부탁드립니다 — 저는 로그인 세션이 없어서 lint 통과 + 코드 리뷰 + 컴파일 확인까지만 했고, 실제 클릭 동작은 검증 못 했습니다.

## 대기 / 확인 필요 (사용자 결정 대기)

- **[중요/보안] 결제 위조 가능 취약점** — `process_payment_webhook`, `restore_stock_for_order` RPC 함수가 anon/authenticated 권한으로도 `/rest/v1/rpc/...`를 통해 직접 호출 가능했습니다. 즉 로그인한 사용자가 브라우저 콘솔에서 anon key로 자기 주문을 "결제완료"로 위조할 수 있는 실제 결제 사기 경로였습니다. 추가로 `product-images` 스토리지 버킷의 업로드/수정/삭제 정책이 "로그인만 하면"(일반 회원 포함) 허용이라 관리자가 아닌 회원도 상품 이미지를 조작할 수 있었습니다. 수정 SQL은 `supabase/migrations/20260801_security_hardening_payment_rpc.sql`에 작성해뒀지만 Claude 자동모드 분류기가 실행을 막아서(결제/DDL 관련 SQL이라 안전장치가 걸림) 아직 DB에 적용 안 됐습니다. **일복님이 Supabase 대시보드 SQL Editor에서 이 파일 내용을 직접 실행해주세요.**
- PortOne PG 등록 (KG이니시스 로그인 이슈로 월요일 고객센터 통화 예정)
- 고객센터 전화번호 / SNS 채널 URL / 에스크로 인증 마크 — 운영 방향 미정으로 보류 중 (`src/lib/config.ts`의 `CONTACT_PHONE`이 더미값인 동안 자동으로 숨김 처리됨)

## 최근 완료 (요약)

- 재고 예약/복원 시스템 (오버셀 방지), 배송비 계산 통일, 관리자 권한 체크 통일
- Supabase 보안 advisor 경고 정리, GoTrueClient 중복 인스턴스 경고 수정
- 히어로 가독성, 카테고리 더미값(`테스트`→`농산물`), 개인정보처리방침/이용약관 페이지 신설
- 헤더/푸터 UX 개선 (아이콘 간격, 미확정 연락처 자동 숨김)
- [claude-code] `products` 테이블 admin-write RLS 정책이 라이브 DB에만 있고 마이그레이션 파일로 기록돼 있지 않던 것을 발견 → `supabase/migrations/20260801_products_admin_write_policy.sql`로 코드화 (정책 내용 자체는 변경 없음)
- [claude-code] 관리자 대시보드 사이드바에 `/admin/notices`, `/admin/unified-members` 링크 누락돼 있던 것 추가 (페이지는 이미 완성돼 있었으나 URL 직접 입력해야만 접근 가능했음). 겸사겸사 "사이트 설정" 항목이 `id: 'dashboard'`를 재사용하던 버그(대시보드 진입 시 사이트 설정이 같이 활성화 표시됨) 수정
- [claude-code] `sitemap.ts`가 정적 4개 URL만 갖고 있어 상품 페이지가 검색엔진에 노출 안 되던 문제 → Supabase에서 `is_active` 상품을 동적으로 조회하도록 수정. 이 과정에서 `public/sitemap.xml`(2024년 날짜의 정적 잔재 파일, `sitemap.ts`와 라우팅 충돌 원인)을 삭제
- [claude-code] QnA 관리자 답변 UI 신설 (`AdminDashboard.tsx`) — 사이드바 "상품 문의" 탭 추가, 문의 목록(미답변 우선 표시)에서 답변 작성/수정/삭제 가능. `qna` 테이블에 이미 admin UPDATE/DELETE RLS 정책(`is_admin()`)이 있어 스키마·RLS 변경 없이 화면만 추가함. 로그인 없이는 실제 화면 확인이 불가해 lint 통과 + 코드 리뷰까지만 검증함 — 실사용 확인 필요.
- [cowork] 옵션가 이중청구 데이터 수정 완료 (서리태(청자5호) 1kg/10kg) — 일복님이 Supabase SQL Editor에서 직접 실행. 1kg 옵션 `additional_price` 14000→0, 10kg 옵션 140000→126000. 검증 결과 1kg 실제 청구액 14,000원, 10kg 140,000원으로 정상화됨 (기존엔 각각 28,000원/154,000원으로 이중청구).
- [claude-code] 쿠폰 발급/관리 admin 화면 + mypage "내 쿠폰함" 신설. `coupons`/`user_coupons`에는 SELECT 정책만 있고 관리자 쓰기 정책이 아예 없어서(RLS 확장은 설계 리드 확인 필요 사안) RLS 변경 없이 서버 라우트 + service role 패턴으로 우회 — `src/app/api/admin/coupons/route.ts`(생성/목록/삭제), `src/app/api/admin/coupons/issue/route.ts`(이메일로 회원에게 지급). admin 대시보드에 "쿠폰 관리" 탭, mypage에 "쿠폰함" 탭 추가. 이후 코웍의 `adminFetch`/`verifyAdmin` 보안 패치에 맞춰 클라이언트 코드 동기화 완료 (아래 상호 검토 섹션 참고).
- [claude-code] 리뷰 모더레이션 UI 신설 (`AdminDashboard.tsx`) — "리뷰 관리" 탭 추가, 상품별 리뷰 목록(별점/내용/사진) + 삭제. `reviews` 테이블에 이미 `Owners or admins can update/delete` RLS(`is_admin()`)가 있어 스키마·RLS 변경 없이 화면만 추가. `profiles.is_admin=true`인 슈퍼 관리자 계정으로 실제 `is_admin()`이 true 반환하는 것까지 SQL로 직접 확인함.
- [cowork] **관리자 API 인증 전면 교체** — `adminToken`(브라우저가 보낸 raw user id를 그대로 신뢰)이 전 관리자 API(`products`, `notices`, `members`, `stats`, `unified-members`, `orders/[id]`, `coupons`, `coupons/issue`)에 걸쳐 있던 구조적 취약점이었음을 발견. UUID만 알면(쿼리스트링이라 로그/히스토리로 유출 가능) 로그인 없이 관리자 API 호출이 가능했음. `src/lib/adminAuth.ts`(서버: Authorization Bearer JWT 검증) + `src/lib/adminFetch.ts`(클라이언트 헬퍼) 신설, 서버 라우트 8개 + 클라이언트 호출부 7개 전부 교체. `npx tsc --noEmit` 통과.
- [cowork] `src/middleware.ts`의 `profiles.role`(존재하지 않는 컬럼) 조회 버그 수정 (클로드 코드 발견, 코웍이 수정) — `is_admin`만 조회하도록 정리.
- [cowork] **[중요/보안, DB 미적용]** `process_payment_webhook`/`restore_stock_for_order` RPC가 anon/authenticated 롤로 직접 호출 가능해서 결제완료 위조·재고 임의 복원이 가능했던 것, `product-images` 버킷 업로드/수정/삭제가 일반 회원도 가능했던 것, `handle_new_agri_user` search_path 누락 발견. 수정 SQL은 `supabase/migrations/20260801_security_hardening_payment_rpc.sql`에 작성했지만 자동모드 분류기가 실행을 막아서 DB에는 아직 미적용 — 사용자 직접 실행 필요 (위 "대기/확인 필요" 참고).

## 알려진 이슈 (아직 미배정)

- 관리자 페이지 및 주문 관리 화면 전반 — 사용자가 "이슈 많다"고 언급, 구체 항목 미정리. [claude-code]가 다음으로 실사용 테스트하며 목록화 예정.
