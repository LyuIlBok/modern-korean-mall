-- [cowork] 장바구니 이탈 리마인드 발송 중복 방지용 테이블. 클코가 cart_items 실시간
-- 동기화를 완료해 선행 조건이 해소됐고(안티가 확인), 안티가 코웍에게 백엔드 구축을
-- 요청해 바로 이어서 만듭니다. service_role만 쓰므로 RLS는 기본 거부로 충분(정책 없음).
-- 라이브 DB에 이미 apply_migration으로 적용 완료(이 파일은 저장소 문서화 목적).
create table if not exists public.cart_abandonment_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_sent_at timestamptz not null default now()
);

alter table public.cart_abandonment_reminders enable row level security;
