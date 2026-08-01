-- [AI 고도화 Phase 0 준비] chat_messages가 지금은 is_admin(boolean)만 있어서
-- 관리자/일반회원 구분만 가능하고 AI가 보낸 메시지를 구분할 방법이 없음.
-- sender 컬럼을 추가해서('user'|'admin'|'ai') 향후 AI 상담 기능에서 발신자를
-- 명확히 구분할 수 있게 함. 기존 데이터는 is_admin 값 기준으로 채워 넣고,
-- 이후 애플리케이션 코드가 is_admin 대신 sender를 쓰도록 전환할 수 있음
-- (is_admin 컬럼은 하위 호환을 위해 당장은 그대로 둠, 제거는 별도 작업).

alter table public.chat_messages add column if not exists sender text
  check (sender in ('user', 'admin', 'ai'));

update public.chat_messages
set sender = case when is_admin then 'admin' else 'user' end
where sender is null;

alter table public.chat_messages alter column sender set default 'user';
