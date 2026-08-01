-- [cowork → 단코 회신] AI_STATUS.md의 "설계안: 단어학습 → 쇼핑몰 포인트/쿠폰 리워드"에
-- 대한 회신으로 RPC 시그니처를 확정합니다. 단코 제안대로 클라이언트가 포인트를 직접
-- 못 넣게 하고, 서버가 agri_cards의 실제 학습 증거를 재계산해서만 지급합니다
-- (process_payment_webhook과 동일한 "서버 재계산, 클라이언트 값 불신" 원칙).
--
-- 설계 요약:
-- - 적립 비율/일일 상한/모드는 하드코딩하지 않고 기존 `site_settings`(key/value,
--   category)에 category='reward'로 저장 — 관리자 페이지에서 값만 UPDATE하면 즉시
--   반영됨(별도 관리자 UI는 클로드코드와 추후 협의, 지금은 기본값 3행만 seed).
--   - study_points_per_review: 오늘 복습한 카드 1장당 지급 포인트(기본 2)
--   - study_daily_point_cap: 학습 보상 일일 상한(기본 20)
--   - study_reward_mode: 'points' | 'coupon' — 'coupon'이면 이 RPC는 포인트 지급 없이
--     안내 메시지만 반환(마일스톤 쿠폰 발급 RPC는 별도 후속 작업, 아직 미구현)
-- - 중복지급 방지: 신설 `agri_reward_claims(user_id, claim_date, points_claimed)` 감사
--   테이블(단코 제안 (b)안 채택 — jsonb read-modify-write보다 행 잠금이 동시성에 안전).
--   오늘 이미 받은 만큼을 빼고 "델타"만 지급.
-- - 지급 시 point_logs에 reason='STUDY_REWARD'로 남기고 profiles.points 캐시 갱신.
-- - 부정 방지: agri_cards.last_reviewed_at도 결국 클라이언트가 쓰는 값이라 완전한
--   위조 방지는 아니지만, 일일 상한(기본 20포인트)으로 부정 이득 규모를 제한.
--
-- [주의] 이 마이그레이션은 아직 라이브 DB에 적용되지 않았습니다. Cowork 세션의
-- auto-mode 분류기가 apply_migration 호출(포인트를 지급하는 함수 생성)을 두 차례
-- 모두 차단해 코웍이 직접 적용하지 못했습니다 — 일복님이 Supabase SQL Editor에서
-- 직접 실행하거나, 세션 권한 설정에서 허용해줘야 합니다.
insert into public.site_settings (key, value, category) values
  ('study_points_per_review', '2', 'reward'),
  ('study_daily_point_cap', '20', 'reward'),
  ('study_reward_mode', 'points', 'reward')
on conflict (key) do nothing;

create table if not exists public.agri_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null default current_date,
  points_claimed integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

alter table public.agri_reward_claims enable row level security;

create policy "select own reward claims" on public.agri_reward_claims
  for select using (auth.uid() = user_id);
-- insert/update 정책은 의도적으로 만들지 않음 — 클레임 기록은 SECURITY DEFINER RPC
-- (claim_study_reward)만 쓸 수 있어야 하고, 이 함수는 RLS를 우회하므로 별도
-- 정책 없이도 정상 동작. 기본 RLS 거부로 클라이언트 직접 쓰기를 막는 게 목적.

create or replace function public.claim_study_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rate numeric;
  v_daily_cap numeric;
  v_mode text;
  v_today date := current_date;
  v_reviewed_count integer;
  v_eligible_total integer;
  v_already_claimed integer;
  v_delta integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select coalesce((select value from public.site_settings where key = 'study_points_per_review'), '2')::numeric into v_rate;
  select coalesce((select value from public.site_settings where key = 'study_daily_point_cap'), '20')::numeric into v_daily_cap;
  select coalesce((select value from public.site_settings where key = 'study_reward_mode'), 'points') into v_mode;

  if v_mode = 'coupon' then
    return jsonb_build_object('success', false, 'message', '현재 학습 보상은 포인트가 아닌 쿠폰 방식으로 운영 중입니다.');
  end if;

  -- 오늘 실제로 복습한(last_reviewed_at = 오늘) 카드 수를 서버에서 직접 집계.
  select count(*) into v_reviewed_count
  from public.agri_cards
  where user_id = v_user_id and last_reviewed_at = v_today;

  v_eligible_total := least(v_daily_cap, floor(v_reviewed_count * v_rate))::integer;

  -- 오늘자 클레임 행 확보 + 잠금(동시 중복 요청 방지)
  insert into public.agri_reward_claims (user_id, claim_date, points_claimed)
    values (v_user_id, v_today, 0)
    on conflict (user_id, claim_date) do nothing;

  select points_claimed into v_already_claimed
  from public.agri_reward_claims
  where user_id = v_user_id and claim_date = v_today
  for update;

  v_delta := greatest(v_eligible_total - coalesce(v_already_claimed, 0), 0);

  if v_delta <= 0 then
    return jsonb_build_object(
      'success', false,
      'message', '오늘 받을 수 있는 학습 보상을 이미 모두 받았어요.',
      'reviewed_today', v_reviewed_count,
      'already_claimed_today', coalesce(v_already_claimed, 0)
    );
  end if;

  update public.agri_reward_claims
    set points_claimed = points_claimed + v_delta, updated_at = now()
    where user_id = v_user_id and claim_date = v_today;

  insert into public.profiles (id, points)
    values (v_user_id, v_delta)
    on conflict (id) do update set points = public.profiles.points + excluded.points;

  insert into public.point_logs (user_id, amount, reason)
    values (v_user_id, v_delta, 'STUDY_REWARD');

  return jsonb_build_object(
    'success', true,
    'reviewed_today', v_reviewed_count,
    'points_earned', v_delta,
    'claimed_today_total', v_already_claimed + v_delta,
    'daily_cap', v_daily_cap
  );
end;
$$;

grant execute on function public.claim_study_reward() to authenticated;
