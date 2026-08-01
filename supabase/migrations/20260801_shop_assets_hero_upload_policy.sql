-- [클로드 코드 발견 → 코웍 조치] /admin/settings의 히어로 배경 이미지 업로드가
-- shop_assets 버킷의 hero/ 경로를 쓰는데, 기존에 추가한 shop_assets 정책은
-- reviews/ 경로만 허용해서 히어로 이미지 업로드가 막혀 있었음. hero/ 경로는
-- 관리자 전용 기능이므로 is_admin() 기반으로 제한.

drop policy if exists "Admin can upload hero images" on storage.objects;
create policy "Admin can upload hero images" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shop_assets'
    and name like 'hero/%'
    and public.is_admin()
  );

drop policy if exists "Admin can update hero images" on storage.objects;
create policy "Admin can update hero images" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'shop_assets'
    and name like 'hero/%'
    and public.is_admin()
  );
