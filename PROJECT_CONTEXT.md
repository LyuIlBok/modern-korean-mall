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
1. 쇼핑몰·단어앱 저장소는 분리 유지, 회원(로그인 계정)만 통합 관리.
2. 통합 회원 관리 설계: profiles/agri_profiles 연동 방식 확정, 필요시 통합 대시보드.
3. 개발은 이 환경(Claude/Cowork)에서 진행. Unity/멀티에이전트 같은 부가 오케스트레이션 도구는 다시 만들지 않음 — 반복 작업이 필요하면 Cowork의 예약 작업(scheduled task) 기능을 활용.

## 5. 운영 원칙
- 새 대화를 시작할 때 이 문서를 컨텍스트로 참고하면 처음부터 다시 설명할 필요 없음.
- DB/보안 변경 시 항상 Supabase advisor로 재확인.
- RLS 정책 등 되돌리기 어려운 변경은 적용 전 사용자에게 SQL을 보여주고 확인받을 것(단, 사용자가 "알아서 진행"이라 위임한 경우는 예외).
