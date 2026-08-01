-- chat_messages.is_read 컬럼이 실제로는 존재하지 않는데 프론트(ChatWidget.tsx)와
-- /api/ai/chat 라우트 둘 다 참조하고 있었음(둘 다 PostgREST 400/500으로 조용히 실패).
-- 안전한 추가 컬럼(nullable, default false)만 붙이고 기존 데이터/제약조건은 안 건드림.
alter table public.chat_messages
  add column if not exists is_read boolean default false;

-- 읽음 처리(markAsRead)가 클라이언트(로그인 사용자 role)에서 자기 자신의 채팅 메시지에
-- UPDATE를 시도하는데, UPDATE RLS 정책이 아예 없어서 이것도 별도로 조용히 실패하고 있었음.
-- 본인 소유(user_id) 행만 갱신 허용(SELECT 정책과 동일한 범위).
create policy "Users can update their own messages read status"
  on public.chat_messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
