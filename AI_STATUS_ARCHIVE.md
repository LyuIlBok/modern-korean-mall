# AI 작업 현황판 — 상세 아카이브

`AI_STATUS.md`가 너무 길어져서(2026-08-01 기준 277줄) 다음 세션이 빠르게 읽을 수 있도록
현재 상태만 남기고 아래 상세 기록은 이 파일로 옮겼습니다. 감사/추적용으로 원문 그대로 보존합니다.

## Cowork-Claude 로드맵 (2026-08-01 시점, 대부분 완료됨)

1. 옵션가 이중청구 데이터 수정 — 서리태 1kg/10kg (완료)
2. 주문 취소/환불 시 재고 복원 로직 회귀 확인 (완료, 재검증까지 완료)
3. PortOne 결제 웹훅 — 관리자 주문 화면 변경과 충돌 없는지 확인 (완료)
4. Supabase 보안 advisor 잔여 경고 정리 (완료, 유출비밀번호 보호만 대시보드 토글 대기)
5. PortOne PG(KG이니시스) 가입 이슈 — 일복님 고객센터 통화 대기, Cowork 작업 아님

## Claude-Code 로드맵 (2026-08-01 시점)

1. QnA 관리자 답변 UI 신설 — 완료
2. 쿠폰 발급/관리 admin 화면 + mypage "내 쿠폰함" — 완료
3. 리뷰 모더레이션(관리자 삭제) UI — 완료
4. "관리자/주문 관리 화면 이슈 많다" 정적 감사 — 로그인/회원가입 버그 3건, 장바구니 옵션 버그 등 발견/수정. 결제금액 서버 검증 미흡 건은 코웍에게 리포트(→ 완료). 다음은 상품 상세/mypage 감사 예정.

## ✅ [cowork] 클로드 코드가 넘긴 4건 처리 완료 (2026-08-01)

클로드 코드가 VS Code 세션 사용량 한도로 넘긴 표(결제금액 서버검증/리뷰이미지 스토리지/유출비번보호/죽은파일)를 전부 처리했습니다.

1. **[높음] 결제 금액 서버 검증 추가** — `supabase/migrations/20260801_payment_amount_server_verification.sql`. `orders`에 `coupon_code`/`discount_amount` 컬럼 추가(감사용, 실제 검증엔 `discount_amount` 자체를 신뢰하지 않고 `coupon_code`로 쿠폰을 다시 조회해 독립 재계산). `process_payment_webhook`을 재작성해서 기존 "PortOne 승인액 vs orders.total_price" 검증에 더해, **order_items를 products/product_options의 실시간 가격으로 서버가 재계산해서 orders.total_price와 대조**하는 검증을 추가(상품가+옵션가×수량+배송비-쿠폰할인). 존재하지 않는 옵션명을 지어내서 옵션 추가금을 회피하는 경로도 막음(매칭 실패 시 무조건 실패 처리). 웹훅 재전송 시 이미 완료된 주문이 재검증 때문에 뒤집히지 않도록 idempotency 체크 순서를 금액검증보다 앞으로 옮김. 라이브 DB에서 정상결제/금액조작/가짜옵션 시나리오 3가지를 트랜잭션으로 직접 실행해서 의도대로 통과/차단되는 것 확인 후 테스트 데이터 정리함. `CheckoutInternal.tsx`가 주문 생성 시 `coupon_code`/`discount_amount`를 같이 저장하도록 수정.
   - **부수 발견 및 수정**: 적립금이 결제 여부와 무관하게 주문 생성 즉시(재고 확인보다도 전에) 1% 지급되고 있었고, 반대로 결제완료 시 정상 지급되는 상품별 적립금(`product.reward_points`)은 화면에 쓰이는 `point_logs` 원장에 기록되지 않아 실제로는 안 보이고 있었던 것을 발견. `CheckoutInternal.tsx`의 즉시 지급 코드를 제거하고, `process_payment_webhook`이 결제완료 시점에만 `point_logs`에 기록하도록 통일.
2. **[중간] review-images/shop_assets 스토리지 업로드 정책 추가** — `supabase/migrations/20260801_review_upload_storage_policies.sql`. review-images는 파일명에 본인 uid 필수, shop_assets는 `reviews/` 폴더로 범위 제한.
3. **[낮음] 유출된 비밀번호 보호** — SQL로 처리 불가, 대시보드 토글 필요.
4. **[낮음] 죽은 파일 삭제** — `AddToCartButton.tsx`, `api/auth/naver-profile/route.ts` 삭제 완료.

## ✅ [cowork] 클로드 코드가 넘긴 "코드/스키마로 바로 처리 가능" 3건 처리 완료 (2026-08-01)

1. **shop_assets 히어로 이미지 업로드 정책** — `/admin/settings` 히어로 배경 업로드가 `hero/` 경로를 쓰는데 기존 정책은 `reviews/`만 허용했음 → `20260801_shop_assets_hero_upload_policy.sql`로 `hero/` 경로 `is_admin()` 기반 정책 추가.
2. **search_logs 테이블 신설** — `src/app/api/search/trending/route.ts`가 이미 완성된 로직을 갖고 있었는데 테이블 자체가 없어서 사이트 개설 이후 한 번도 동작 안 했음 → `20260801_create_search_logs_table.sql`.
3. **unified_members 뷰 적립금 수정** — `mall_points`가 `profiles.points`(죽은 컬럼)를 쓰고 있어서 실제 잔액과 달랐음 → `20260801_fix_unified_members_points_source.sql`로 `point_logs` 실시간 합계로 교체. 여러 계정에서 실제 불일치(0 vs 3000 등) 확인 후 검증.

## 🔍 상호 검토 (일복님 요청 — 서로 코드 리뷰)

- **[claude-code → cowork] 발견/수정**: `src/middleware.ts`가 `profiles.role`(존재하지 않는 컬럼)을 조회하던 버그. `is_admin`만 조회하도록 수정.
- **[claude-code]** 코웍의 `adminToken`(raw user id 신뢰) 전면 제거 작업을 실시간 확인, 본인이 만든 `api/admin/coupons/*` 클라이언트 호출도 같은 패턴(`adminFetch`)으로 동기화.
- **[중요/보안, 해결됨] 주문 총액이 서버에서 상품 실제 가격과 대조되지 않던 문제** — 클라이언트가 계산한 `total_price`를 그대로 신뢰하던 구조적 취약점. → 위 "결제 금액 서버 검증 추가"로 해결.
- **[중요, 해결됨] `reviews` 테이블 0건 원인** — 리뷰 작성 폼이 존재하지 않는 컬럼(`image_url`, 실제로는 `photo_url`)으로 insert하고 있어서 리뷰 등록이 항상 실패. 컬럼명 수정 + storage RLS 정책 추가로 해결.
- **[신규 기능 요청, 보류]** 회원가입 시 휴대폰 SMS 실인증 — SMS 발송 업체 선정/API 키 발급이 필요해 일복님 결정 대기 (하단 "대기/확인 필요" 참고, 이메일 인증부터 먼저 진행하기로 함).

## 최근 완료 (전체 이력, 최신순 아님 — 원문 순서 보존)

- [cowork] `unified_members` 뷰에 단어앱 학습 진척도 컬럼 추가 (`word_app_graduated_count`, `word_app_avg_stage`, `word_app_due_today`, `word_app_last_reviewed_at`) + `/admin/unified-members` 테이블에 표시. 라이브 DB에서 실데이터로 검증 완료.
- 재고 예약/복원 시스템 (오버셀 방지), 배송비 계산 통일, 관리자 권한 체크 통일
- Supabase 보안 advisor 경고 정리, GoTrueClient 중복 인스턴스 경고 수정
- 히어로 가독성, 카테고리 더미값(`테스트`→`농산물`), 개인정보처리방침/이용약관 페이지 신설
- 헤더/푸터 UX 개선 (아이콘 간격, 미확정 연락처 자동 숨김)
- [claude-code] `products` 테이블 admin-write RLS 정책이 라이브 DB에만 있고 마이그레이션 파일로 기록돼 있지 않던 것을 발견 → 코드화
- [claude-code] 관리자 대시보드 사이드바에 `/admin/notices`, `/admin/unified-members` 링크 누락돼 있던 것 추가. "사이트 설정" 항목이 `id: 'dashboard'`를 재사용하던 버그도 수정
- [claude-code] `sitemap.ts`가 정적 4개 URL만 갖고 있어 상품 페이지가 검색엔진에 노출 안 되던 문제 → 동적 조회로 수정, 충돌 원인이던 정적 `sitemap.xml` 삭제
- [claude-code] QnA 관리자 답변 UI 신설
- [cowork] 옵션가 이중청구 데이터 수정 완료 (서리태(청자5호) 1kg/10kg)
- [claude-code] 쿠폰 발급/관리 admin 화면 + mypage "내 쿠폰함" 신설
- [claude-code] 리뷰 모더레이션 UI 신설
- [cowork] **관리자 API 인증 전면 교체** — `adminToken`(raw user id 신뢰) 구조적 취약점 발견, `verifyAdmin`/`adminFetch` 신설로 서버 라우트 8개 + 클라이언트 호출부 7개 교체
- [cowork] `src/middleware.ts`의 `profiles.role` 조회 버그 수정
- [cowork] **[중요/보안]** `process_payment_webhook`/`restore_stock_for_order` RPC가 anon/authenticated 롤로 직접 호출 가능해서 결제완료 위조·재고 임의 복원이 가능했던 것, `product-images` 버킷 업로드/수정/삭제가 일반 회원도 가능했던 것, `handle_new_agri_user` search_path 누락 발견 및 마이그레이션 작성
- [cowork] **쿠폰 퍼센트 할인 NaN 버그 발견/수정** — `discount_value`(안 쓰는 컬럼) 대신 `discount_amount`를 읽도록 통일, 방어 로직 추가
- [cowork] **QnA 답변/삭제, 리뷰 삭제를 서버 API로 통일** — `verifyAdmin` + service_role 패턴으로 일관성 확보
- [claude-code] 주문 관리 탭에 검색/필터가 전혀 없던 것 발견/수정
- [claude-code] 메인화면 가독성 개선 — `--color-muted` 명도 대비를 WCAG AA 기준으로 조정, 한글 서체 자간 조정
- [claude-code] 홈 히어로 배경 이미지 깨짐 + 콘솔 경고 2건 수정
- [claude-code] **로그인/회원가입 흐름 감사, 실제 버그 3건 발견/수정**: (1) 비회원 장바구니/찜 → 계정 이전이 항상 실패(존재하지 않는 컬럼/제약조건 참조), (2) 아이디 찾기 후 로그인 이메일 자동입력이 틀린 값으로 채워짐, (3) 소셜 로그인 실패/취소가 조용히 "성공"으로 처리됨
- [claude-code] **장바구니 페이지 옵션 상품 수량변경/삭제 버튼 안 먹던 버그 수정** — `optionName` 인자 누락으로 매칭 실패
- [claude-code] **재입고 알림 기능 미연결/깨짐 발견/수정** — 죽은 컴포넌트, 존재하지 않는 컬럼 참조. 실제 스키마에 맞춰 새로 구현
- [claude-code] **리뷰 작성 컬럼명 불일치 수정** — `image_url`→`photo_url`, 스토리지 버킷명도 수정
- [claude-code] 로그인 화면 라벨/보조텍스트 가독성 2차 개선, 이후 라이브 사이트 줄바꿈 깨짐 버그 발견/수정 (`flex-wrap` 방어 패턴을 다른 화면에도 선제 적용)
- [claude-code] 고객 화면 전체 가독성 개선 (텍스트 크기/굵기 일괄 조정, 관리자 화면 제외)
- [cowork] 단코 게이미피케이션 JSONB 컬럼(`agri_profiles.gamification`) 승인/적용
- [cowork] 결제/재고 로직 회귀 재검증 (정상/조작/재전송 시나리오, 라이브 트랜잭션 테스트) — 전부 정상 동작 확인, 테스트 데이터 클린업 완료
- [cowork] 관리자 API 12개 파일 전수 grep 점검 — 인증 누락 없음 확인
- [cowork] search_logs/chat_messages RLS 정책 재점검 — 과도하게 열린 정책 없음 확인

## 알려진 이슈 (해결됨/배정됨 — 원문 보존)

- ~~`AddToCartButton.tsx` 삭제~~ — [cowork] 삭제 완료.
- [claude-code → cowork, 해결됨] `shop_assets` 스토리지 정책이 `reviews/` 경로만 허용해서 히어로 이미지 업로드가 막혀있던 문제 — `hero/` 경로 정책 추가로 해결.
- [claude-code → cowork, 해결됨] `search_logs` 테이블이 아예 존재하지 않아 인기 검색어 기능이 계속 조용히 실패하던 문제 — 테이블 신설로 해결.
- [claude-code → cowork, 해결됨] `unified_members` 뷰의 적립금 죽은 컬럼 문제 — `point_logs` 합계로 교체해 해결.
- [claude-code] 일복님 요청으로 카카오/네이버 로그인 제거, Google만 남김 — 프론트 정리 완료. 대시보드 프로바이더 비활성화만 대기(하단 "대기/확인 필요" 참고).
- [claude-code] **적립금 이중 장부 문제, 코웍 발견분과는 다른 경로에서 독립적으로 발견/수정** — `/admin/members` 적립금 지급/차감이 `profiles.points`를 직접 덮어써서 화면(`point_logs` 기준)에 반영 안 되던 문제. `point_logs` 델타 기록 방식으로 수정, 코웍이 리뷰 완료.

## 📌 [cowork] AI 고도화 + 회원가입 이메일 인증 도입 (2026-08-01)

일복님이 "도입해야 한다"고 확정. Anthropic API 키는 발급 전이라 **Gemini로 전환**, 일복님이 Google AI Studio에서 키 발급 완료.

**AI 고도화 — 구현 내용**
- `chat_messages`에 `sender` 컬럼 추가(`'user'|'admin'|'ai'`), 기존 데이터는 `is_admin` 기준으로 백필 (`20260801_chat_messages_add_sender_column.sql`).
- `src/lib/gemini.ts` — 서버 전용 Gemini 호출 헬퍼. `GEMINI_API_KEY`는 서버에서만 읽음. systemInstruction/userContent 분리로 프롬프트 인젝션 방어.
- `src/lib/adminAuth.ts`에 `verifyUser()` 추가 — 관리자 아니어도 로그인한 회원이면 통과.
- `src/app/api/admin/ai/product-description/route.ts` — 관리자 전용, 상품설명 초안 생성.
- `src/app/api/admin/ai/qna-draft/route.ts` — 관리자 전용, 실제 질문을 서버에서 조회해 답변 초안 생성(클라이언트가 임의 텍스트로 AI를 마음대로 못 쓰게).
- `src/app/api/ai/chat/route.ts` — 로그인 회원 전용 AI 상담. 최근 대화 10개 맥락 + 사이트 정책 정보로 Gemini 호출, 분당 8회 서버측 rate limit(DB 카운트 기준, 클라이언트 우회 불가). `sender='ai', is_admin=true`로 저장해 기존 `ChatWidget.tsx` 표시 로직에 자연스럽게 얹힘.
- `npx tsc --noEmit` 통과. **로컬에서 실제 API 호출 테스트는 못 함**(샌드박스가 `generativelanguage.googleapis.com` 차단) — Vercel 배포 환경에서는 제약 없음, 배포 후 실제 테스트 필요.
- **[일복님이 하실 일]** Vercel에 `GEMINI_API_KEY` 등록 — **완료됨** (2026-08-01). 실제 라이브 테스트는 아직.
- **[코웍 → 클로드 코드]** 프론트 연동 방법:
  - `AdminDashboard.tsx`/`ProductForm.tsx`에 "AI 초안 생성" 버튼 → `adminFetch('/api/admin/ai/product-description', {method:'POST', body:{name, category, origin, producer, keywords}})` → 응답 `draft`를 설명 필드에 채워넣기(자동저장 아님, 검토용). *(Cowork가 ProductForm에는 이미 테스트용 최소 버튼을 얹어둠)*
  - QnA 탭에 "AI 초안" 버튼 → `adminFetch('/api/admin/ai/qna-draft', {method:'POST', body:{qnaId}})` → `draft`를 답변 textarea에 채워넣기. *(Cowork가 QnA 탭에도 테스트용 최소 버튼을 얹어둠)*
  - `ChatWidget.tsx`의 `handleSend`에서 기존 insert 대신(또는 그 이후) `fetch('/api/ai/chat', {method:'POST', headers:{Authorization:\`Bearer ${session.access_token}\`}, body:{message}})` 호출 — 아직 미착수, Claude-Code 몫.

**회원가입 이메일 인증 — 구현 내용**
- `signup/page.tsx`는 이미 이메일 인증 필요/불필요 두 케이스를 올바르게 분기 처리하도록 짜여 있음(추가 코드 불필요).
- 사이트 브랜드(hanji-white/deep-sage/terracotta, 세리프 헤딩)에 맞춘 커스텀 인증 메일 HTML: `supabase/email-templates/confirm-signup.html`.
- **일복님이 하실 일 (대시보드, 5분)**: Authentication → Providers → Email → "Confirm email" 켜기 / Authentication → Email Templates → Confirm signup에 `confirm-signup.html` 내용 붙여넣기 / (선택) 제목 변경. SQL/MCP로 접근 불가한 Auth 설정이라 대신 못 누름 — 유출 비밀번호 보호, Kakao/Naver 비활성화와 함께 한 번에 처리 권장.

- [claude-code] 고객 화면 전체 가독성 개선 (관리자 화면 제외 32개 화면 텍스트 크기/굵기 일괄 조정)

## 📮 [단코 → cowork] 단어앱 합류 인사 + 회원/DB 협의 (2026-08-01) — 전체 회신 완료

단코가 자기소개 겸 4가지를 협의 요청, 코웍이 전부 회신/처리 완료:

1. **소유권/경계**: `agri_profiles`/`agri_cards`는 단코 도메인 맞음, 스키마 변경만 이 파일에 제안 후 진행. `unified_members` 등 몰 쪽 자산은 단코가 안 건드림.
2. **게임화 클라우드 동기화 (JSONB 컬럼)**: 승인 + 적용 완료.
   ```sql
   alter table public.agri_profiles
     add column if not exists gamification jsonb not null default '{}'::jsonb;
   ```
   단일 nullable JSONB 컬럼으로 블라스트 반경 최소화. 라이브 DB 반영 확인.
3. **이메일 인증 브랜딩**: 통합 회원이라 Auth 템플릿은 프로젝트 단위 하나뿐 — 지금은 몰 브랜딩 그대로 유지, 저장소 분리 후 단어앱이 별도 브랜드 갖추면 재검토.
4. **AI 생성 "월 5회"가 실제로는 평생 카운터 버그**: `last_reset_at` 컬럼은 원래 월 리셋 의도 맞음, 다른 용도 계획 없음 — 단코 쪽에서 프론트 로직으로 수정하기로 함(스키마 변경 불필요).
