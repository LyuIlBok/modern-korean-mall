-- [클로드 코드 발견 → 코웍 조치] "실시간 인기 검색어" 기능(src/app/api/search/trending/route.ts)이
-- search_logs 테이블 자체가 없어서 사이트 개설 이후 한 번도 작동하지 않고 있었음.
-- 라우트가 이미 GET(최근 7일 집계)/POST(검색어 기록)를 완성된 형태로 갖고 있어서
-- 테이블만 만들면 바로 동작함. 라우트가 SUPABASE_SERVICE_ROLE_KEY를 우선 쓰고
-- 없으면 anon key로 폴백하므로, 두 경우 모두 동작하도록 anon/authenticated에게도
-- 최소한의 select/insert를 허용함(검색어 자체는 민감정보 아님).

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_logs_created_at on public.search_logs (created_at);

alter table public.search_logs enable row level security;

drop policy if exists "Anyone can log a search" on public.search_logs;
create policy "Anyone can log a search" on public.search_logs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can read search logs for trending" on public.search_logs;
create policy "Anyone can read search logs for trending" on public.search_logs
  for select
  to anon, authenticated
  using (true);
