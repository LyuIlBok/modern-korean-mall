-- [cowork] 개인화 추천 트랙 1단계: "최근 본 상품" 기록용 테이블.
-- 로그인 사용자만 대상으로 함(비로그인 세션 트래킹은 범위 밖). 같은 상품을 여러 번 보면
-- 새 행을 계속 쌓지 않고 viewed_at만 갱신하도록 (user_id, product_id) unique + upsert.
--
-- 참고: apply_migration으로 이미 라이브 적용된 내용을 저장소에 문서화한 것입니다.
create table if not exists public.product_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_product_views_user_viewed
  on public.product_views (user_id, viewed_at desc);

alter table public.product_views enable row level security;

drop policy if exists "Users can view own product views" on public.product_views;
create policy "Users can view own product views"
  on public.product_views for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own product views" on public.product_views;
create policy "Users can insert own product views"
  on public.product_views for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own product views" on public.product_views;
create policy "Users can update own product views"
  on public.product_views for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 관련 상품(함께 구매한 상품) 추천용 RPC. 결제완료류 주문들에서 같은 주문에 함께 담긴
-- 상품을 빈도순으로 집계 — 별도 추천 테이블 없이 order_items만으로 계산.
create or replace function public.get_frequently_bought_together(p_product_id uuid, p_limit int default 6)
returns table (product_id uuid, co_purchase_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select oi2.product_id, count(distinct oi2.order_id) as co_purchase_count
  from public.order_items oi1
  join public.orders o on o.id = oi1.order_id and o.status = '결제완료'
  join public.order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
  where oi1.product_id = p_product_id
  group by oi2.product_id
  order by co_purchase_count desc
  limit p_limit;
$$;

grant execute on function public.get_frequently_bought_together(uuid, int) to anon, authenticated;
