-- 이전 REVOKE가 anon/authenticated 역할에서만 걷어냈는데, 기본적으로 PUBLIC
-- 의사 역할에 EXECUTE가 부여돼 있으면 그걸 통해 여전히 실행 가능합니다.
-- PUBLIC에서도 명시적으로 회수합니다.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_agri_user() from public;
revoke execute on function public.handle_default_address() from public;
