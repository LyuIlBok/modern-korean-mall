-- [cowork] 로드맵 트랙 1(정기구독) 1단계 — 데이터 모델 초안. PortOne PG(KG이니시스)
-- 등록이 아직 대기 중이라 실제 빌링키 발급/스케줄 결제 API 연동은 이번에 포함하지
-- 않았습니다(등록 완료 후 이어서). 클코가 이 스키마 기준으로 프론트(구독 옵션
-- 선택 UI, 관리자 구독 현황 대시보드)를 먼저 설계해볼 수 있도록 테이블만 먼저 만듭니다.
-- 라이브 DB에 이미 apply_migration으로 적용 완료(이 파일은 저장소 문서화 목적).
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  option_id uuid references public.product_options(id),
  quantity int not null default 1 check (quantity > 0),
  interval_days int not null check (interval_days > 0),
  discount_rate numeric not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  billing_key text,
  next_billing_date date not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index subscriptions_next_billing_idx on public.subscriptions (next_billing_date) where status = 'active';
create index subscriptions_user_id_idx on public.subscriptions (user_id);

create table public.subscription_billing_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  order_id uuid references public.orders(id),
  status text not null check (status in ('success', 'failed')),
  error_message text,
  attempted_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.subscription_billing_logs enable row level security;

-- 본인 구독은 조회만 가능(수정/취소는 billing_key 등 민감정보가 얽혀있어 서비스롤
-- API 라우트를 통해서만 — process_payment_webhook 등 기존 결제 패턴과 동일 원칙).
create policy "select own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "select own subscription billing logs" on public.subscription_billing_logs
  for select using (
    exists (select 1 from public.subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
  );
