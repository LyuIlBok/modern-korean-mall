-- ==========================================================
-- AGRILEITNER PRO: SaaS Cloud Migration Schema
-- ==========================================================
-- 이 스크립트를 Supabase SQL Editor에 복사하여 실행하십시오.
-- 기존 쇼핑몰 데이터와 겹치지 않도록 'agri_' 접두사를 부착했습니다.

-- 1. 프로필 테이블 생성 (구독 등급 및 AI 잔여 사용량 관리)
create table if not exists public.agri_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  tier text default 'Free' check (tier in ('Free', 'Pro')),
  ai_generations_count integer default 0,
  last_reset_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 단어 카드 테이블 생성
create table if not exists public.agri_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  term text not null,
  meaning text not null,
  morphology jsonb default '{"prefix": "", "root": "", "suffix": ""}'::jsonb,
  context_sentence text,
  stage integer default 1,
  last_reviewed_at date,
  next_review_at date not null,
  is_graduated boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (RLS) 보안 정책 활성화
alter table public.agri_profiles enable row level security;
alter table public.agri_cards enable row level security;

-- 4. RLS 보안 규칙 세우기 (자신의 데이터에만 접근 가능)
drop policy if exists "Users can view and edit their own agri profile" on public.agri_profiles;
create policy "Users can view and edit their own agri profile"
  on public.agri_profiles for all
  using (auth.uid() = id);

drop policy if exists "Users can perform all actions on their own agri cards" on public.agri_cards;
create policy "Users can perform all actions on their own agri cards"
  on public.agri_cards for all
  using (auth.uid() = user_id);

-- 5. 신규 회원가입 시 프로필 자동 생성을 위한 Trigger 함수 설정
create or replace function public.handle_new_agri_user()
returns trigger as $$
begin
  insert into public.agri_profiles (id, email, tier, ai_generations_count)
  values (new.id, new.email, 'Free', 0)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 6. 트리거 결합
drop trigger if exists on_auth_user_created_agri on auth.users;
create trigger on_auth_user_created_agri
  after insert on auth.users
  for each row execute procedure public.handle_new_agri_user();

-- 7. 기존에 이미 가입된 사용자가 있다면 프로필을 채워주는 일회성 쿼리
insert into public.agri_profiles (id, email, tier, ai_generations_count)
select id, email, 'Free', 0 
from auth.users
on conflict (id) do nothing;
