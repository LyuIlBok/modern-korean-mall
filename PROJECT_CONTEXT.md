# 복이네농장 마스터 통합관리 — 프로젝트 컨텍스트

## 1. 사업 구조
- **쇼핑몰 "자연의 결"**: 농산물 판매몰. Next.js(App Router) + Supabase + Vercel.
  - GitHub: `github.com/LyuIlBok/modern-korean-mall` (public)
  - Vercel 프로젝트: `modern-korean-mall` (정상 운영중, GitHub main 브랜치 push 시 자동 배포)
  - 로컬 작업 폴더: `C:\Users\유일복\Desktop\word_app` (이름은 word_app이지만 실제로는 쇼핑몰 저장소)
- **단어학습앱 "AgriLeitner"**: 라이트너 학습법 기반 농업/공학(식물보호기사 등) 전문용어 단어장.
  - 현재 `leitner_app.html` 단일 HTML 파일(React+Tailwind, CDN 빌드) 형태로 위 쇼핑몰 저장소 안에 같이 들어있음.
  - **별도 저장소로 분리 예정** (미완료 작업)

## 2. 인프라 (연결 완료)
- Supabase 프로젝트: `cfimyvvecsoqeicsjezo` ("LyuIlBok's Project", ap-northeast-2)
  - 쇼핑몰과 단어앱이 **같은 프로젝트/같은 auth.users를 공유** → 로그인 계정은 이미 통합되어 있음.
  - 쇼핑몰 프로필: `public.profiles` (등급/포인트/주소 등)
  - 단어앱 프로필: `public.agri_profiles` (요금제/AI생성횟수), 카드: `public.agri_cards`
  - 둘 다 `id = auth.users.id` FK로 연결되어 있지만, 서로 동기화되진 않음 (통합 회원관리 설계 시 다룰 부분)
- Vercel: 팀 `grow930706-9997's projects`
- GitHub: 쇼핑몰만 연결됨. 단어앱은 아직 별도 저장소/배포 없음.

## 3. 최근 조치 이력 (2026-08-01)
- **보안**: `orders`, `order_items`, `profiles`, `support_messages`, `point_logs`, `product_options`, `site_settings` 7개 테이블에 RLS 비활성화 상태였던 것을 발견, 정책 설계 후 활성화 완료.
- 비회원 주문조회를 클라이언트 직접 조회 → 서버 라우트(`/api/orders/guest-lookup`)로 이전 (RLS와 호환되도록).
- **해결됨 (2026-08-01 재확인)**: `products` 테이블 과다권한 정책 문제. 라이브 DB에는 이미 SELECT(공개)/UPDATE(관리자만) 정책이 적용되어 있었으나 마이그레이션 파일로 기록되어 있지 않아 `supabase/migrations/20260801_products_admin_write_policy.sql`로 코드화함. INSERT/DELETE는 정책 없이 기본 거부 상태이며, 실제 등록/삭제는 `/api/admin/products` 라우트와 `actions/product.ts`에서 관리자 검증 후 service_role로만 수행.
- Gemini CLI로 작업하던 시절 만들어진 Unity 3D 가상오피스·멀티에이전트 오케스트레이션 파일들(unity_server.js, command_center.py, GEMINI.md 등 약 27개)을 정리 대상으로 표시함. 로컬 삭제 권한 문제로 사용자가 직접 PowerShell에서 삭제해야 함(미완료일 수 있음).
- Google OAuth Client Secret 등이 과거 로컬 Gemini 메모리 파일에 평문 저장되어 있었다는 기록 있음 — 실제 노출 여부 확인 및 재발급 검토 필요.

## 4. 목표

**[설계 총괄 확정, 2026-08-01] 회원 통합 아키텍처는 아래 방식으로 확정합니다.** 일복님이 코웍에게 쇼핑몰(클코)/단어앱(단코) 양쪽에 지시할 권한을 위임하셔서, 이 문서를 두 세션 모두의 공통 결정 기준으로 삼습니다.

1. **저장소는 분리, DB(Supabase 프로젝트)는 절대 분리하지 않는다.** 쇼핑몰과 단어앱은 서로 다른 Git 저장소/Vercel 프로젝트로 유지하되, 반드시 지금과 같은 하나의 Supabase 프로젝트(`cfimyvvecsoqeicsjezo`)와 하나의 `auth.users`를 계속 공유합니다. 이래야 한 번 가입으로 두 서비스 다 이용 가능하고(SSO), 회원 데이터를 이중 관리할 필요가 없습니다. 각 서비스는 자기 도메인 테이블만 건드립니다: 쇼핑몰 = `profiles`/`orders`/`point_logs`/`coupons` 등, 단어앱 = `agri_profiles`/`agri_cards`.
2. **통합 회원 조회는 이미 구현되어 있음 — 새로 만들 필요 없음.** `public.unified_members` 뷰(양쪽 프로필을 `auth.users.id` 기준으로 LEFT JOIN)와 관리자 화면 `/admin/unified-members`(쇼핑몰 저장소 안에 있음)가 이미 이 역할을 합니다. 오늘 코웍이 이 뷰의 적립금 계산 버그도 고쳤습니다. 앞으로 단어앱 쪽에 새 지표(예: 이번 달 학습 카드 수 등)를 추가하고 싶으면 이 뷰에 컬럼을 더 추가하는 식으로 확장하면 됩니다(뷰 변경은 코웍이 리드).
3. **적립금/등급처럼 "통합"이 필요해 보이는 것도 지금은 억지로 합치지 않는다.** 쇼핑몰 포인트(`point_logs`)와 단어앱 요금제/AI생성횟수는 도메인이 달라서 하나의 숫자로 합치면 오히려 의미가 흐려집니다. 나중에 "쇼핑몰에서 산 만큼 단어앱 크레딧 지급" 같은 실제 연동 기능이 필요해지면 그때 별도 설계.
4. 개발은 이 환경(Claude/Cowork)에서 진행. Unity/멀티에이전트 같은 부가 오케스트레이션 도구는 다시 만들지 않음 — 반복 작업이 필요하면 Cowork의 예약 작업(scheduled task) 기능을 활용.

### [단코(단어앱 세션)에게 지시]
- 지금 `leitner_app.html`을 별도 저장소로 뺄 때, **Supabase 접속 정보(`cfimyvvecsoqeicsjezo` 프로젝트 URL/anon key)는 그대로 재사용**하세요. 새 Supabase 프로젝트를 만들지 마세요 — 그러면 회원 통합이 깨집니다.
- `agri_profiles`/`agri_cards` 외의 테이블(특히 `profiles`, `orders` 등 쇼핑몰 테이블)은 건드리지 마세요. RLS는 이미 두 테이블 다 켜져 있는 것 확인했습니다.
- 관리자가 두 서비스 회원을 한눈에 보는 화면은 이미 쇼핑몰 저장소의 `/admin/unified-members`에 있으니 단어앱 쪽에 따로 만들 필요 없습니다.
- **[보안, 우선순위 높음]** 아래 3. 최근 조치 이력에 적힌 "Google OAuth Client Secret이 과거 로컬 Gemini 메모리 파일에 평문 저장돼 있었다"는 기록 — 실제로 그 시크릿이 외부(예: GitHub 커밋 이력, 공개된 파일)에 노출된 적 있는지 확인하고, 조금이라도 의심되면 Google Cloud Console에서 즉시 재발급하세요. 이건 단어앱 Google 로그인과 직결된 부분이라 단코가 우선 확인해주세요.
- 저장소 분리 후에는 이 `PROJECT_CONTEXT.md`와 같은 역할을 하는 조율 문서를 새 저장소에도 하나 만들어서 코웍/클코가 참고할 수 있게 남겨주세요.

### [클코(쇼핑몰 세션)에게 지시]
- `unified_members` 뷰/관리자 화면은 그대로 유지·필요시 확장(코웍과 상의). 새로 회원 통합 기능을 따로 만들지 마세요 — 이미 있습니다.
- 쇼핑몰 저장소 안의 단어앱 잔재(`leitner_app.html`, Unity/오케스트레이션 파일 27개 등)는 저장소 분리가 완료되기 전까지는 건드리지 말고, 분리 완료 신호가 오면 코웍이 정리(삭제)를 진행합니다.

### 🚀 [Antigravity 공유 전체 구상 및 진행 가이드 (2026-08-12)]
일복님의 위임에 따라 Antigravity가 프로젝트 전반의 전체 그림과 교대 작업 지침을 정리합니다:

1. **프로덕션 빌드 무결성 유지 (완료)**: `npm run build` (Next.js 16.2.1 Turbopack) 검증을 마쳤으며, API 라우트 환경변수 싱글톤 패턴(`@/lib/supabaseAdmin`)이 적용되어 있습니다. 새로운 API 라우트 작성 시 탑레벨 direct `createClient` 사용을 지양하고 `@/lib/supabaseAdmin`을 공유하세요.
2. **마케팅 자동화(장바구니 이탈 리마인드) 백엔드 구축 요청 (코웍 몫)**: 클코가 `useCartStore.ts`에 `cart_items` 서버 실시간 동기화를 구현 완료했습니다. 코웍은 24시간 이상 미결제 `cart_items` 보유 사용자를 대상으로 한 Resend 리마인드 발송 로직 및 Vercel Cron 연결을 안전하게 이어서 구축해 주세요.
3. **정식 런칭 전 더미값 전수 교체 순서 (공통)**: 노션 체크리스트 DB 항목(`CONTACT_EMAIL`, `CONTACT_PHONE`, PortOne 실 채널키, Resend API키 등)은 일복님의 실 운영 전환 신호에 맞춰 한 번에 안전하게 교체합니다.

## 5. 운영 원칙
- 새 대화를 시작할 때 이 문서를 컨텍스트로 참고하면 처음부터 다시 설명할 필요 없음.
- DB/보안 변경 시 항상 Supabase advisor로 재확인.
- RLS 정책 등 되돌리기 어려운 변경은 적용 전 사용자에게 SQL을 보여주고 확인받을 것(단, 사용자가 "알아서 진행"이라 위임한 경우는 예외).
