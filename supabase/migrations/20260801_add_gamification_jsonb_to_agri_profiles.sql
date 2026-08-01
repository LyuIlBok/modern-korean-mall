-- 단코(단어앱 세션) 요청: 게임화 상태(XP/스트릭/하트 등) 클라우드 동기화용 컬럼
-- 블라스트 반경 최소화를 위해 단일 nullable JSONB 컬럼으로 승인/적용.
-- 몰 쪽 스키마/RLS/트리거에는 영향 없음. agri_profiles는 단코 도메인.
alter table public.agri_profiles
  add column if not exists gamification jsonb not null default '{}'::jsonb;

comment on column public.agri_profiles.gamification is '단어앱(AgriLeitner) 게임화 상태 클라우드 동기화용 (xp, streak, longestStreak, lastStudyDate, hearts, heartsDate, todayXp, xpDate, dailyGoal, goalCelebratedDate). 단코 세션이 자유롭게 읽고 쓸 수 있는 단어앱 전용 컬럼, 몰 코드는 참조하지 않음.';
