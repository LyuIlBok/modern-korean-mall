-- [클로드 코드 발견 → 코웍 조치] review-images / shop_assets 버킷에 업로드 정책이 전혀
-- 없어서(RLS 기본 거부) 사진 첨부 리뷰가 스토리지 업로드 단계에서 항상 실패하고 있었음.
-- 리뷰 사진 업로드 코드가 실제로 쓰는 두 경로를 확인:
--   1) mypage/page.tsx: bucket='review-images', 경로='review-images/{auth.uid()}_{timestamp}.ext'
--   2) ProductTabs.tsx : bucket='shop_assets',   경로='reviews/{timestamp}_{random}.ext' (uid 없음)
-- 두 경로 모두 로그인한 사용자의 업로드만 허용합니다. review-images는 파일명에 본인
-- uid가 들어가므로 본인 파일만 올릴 수 있도록 제한하고, shop_assets는 uid가 경로에
-- 없어 reviews/ 폴더로 범위만 제한합니다.

drop policy if exists "Authenticated users can upload review images" on storage.objects;
create policy "Authenticated users can upload review images" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'review-images'
    and name like 'review-images/' || auth.uid()::text || '_%'
  );

drop policy if exists "Authenticated users can upload shop_assets reviews" on storage.objects;
create policy "Authenticated users can upload shop_assets reviews" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shop_assets'
    and name like 'reviews/%'
  );
