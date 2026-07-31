-- [확인 필요 - 아직 DB에 적용 안 됨] Claude 자동모드 분류기가 실행을 막아서
-- 이 파일은 검토/승인용으로만 작성했습니다. 일복님이 Supabase 대시보드
-- SQL Editor에서 직접 실행해주셔야 적용됩니다.
--
-- 1. search_path 누락된 함수 고정 (search_path hijacking 방지)
alter function public.handle_new_agri_user() set search_path = public;

-- 2. [중요] 결제완료 처리(process_payment_webhook)와 재고복원(restore_stock_for_order)은
--    반드시 서버(supabaseAdmin/service_role)에서만 호출되어야 합니다.
--    지금은 anon/authenticated 롤도 PostgREST(/rest/v1/rpc/...)를 통해 직접 호출할 수 있어서,
--    누구나 브라우저 콘솔에서 anon key로 이 함수를 직접 호출해
--    "결제완료"를 위조하거나(무료로 주문을 결제완료 처리) 재고를 임의로 복원시킬 수 있는
--    취약점이었습니다. (reserve_stock_for_order는 체크아웃 화면에서 브라우저가 직접
--    호출하는 정상 흐름이라 authenticated/anon 실행 권한을 유지합니다.)
revoke execute on function public.process_payment_webhook(text, text, jsonb, numeric) from public, anon, authenticated;
revoke execute on function public.restore_stock_for_order(uuid) from public, anon, authenticated;

-- 3. product-images 버킷 스토리지 정책 정비
--    기존 Admin Upload/Update/Delete 정책은 "로그인만 했으면"(authenticated) 통과였습니다.
--    즉 일반 회원도 상품 이미지를 임의로 업로드/수정/삭제할 수 있었습니다.
--    실제 관리자(is_admin())만 허용하도록 좁힙니다.
drop policy if exists "Admin Upload" on storage.objects;
drop policy if exists "Admin Update" on storage.objects;
drop policy if exists "Admin Delete" on storage.objects;

create policy "Admin Upload" on storage.objects
  for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "Admin Update" on storage.objects
  for update
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Admin Delete" on storage.objects
  for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- 4. "Public Access" SELECT 정책은 공개 버킷의 목록조회(list)까지 허용해서 파일 전체
--    목록이 노출되고 있었습니다. 공개 버킷은 URL을 아는 파일을 받아오는 데는 이 정책이
--    필요 없고(스토리지 CDN이 별도로 처리), 코드베이스 어디에서도 이 버킷을 list()하지
--    않는 걸 확인했으므로 목록조회 정책 자체를 제거합니다.
drop policy if exists "Public Access" on storage.objects;
