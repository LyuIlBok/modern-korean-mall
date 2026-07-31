-- products 테이블 쓰기 권한을 관리자로 제한.
-- (기존에는 "로그인한 회원 누구나 상품 전체 CRUD 가능"한 과다권한 정책이 있었음)
--
-- 이 정책은 이미 라이브 DB에는 적용되어 있었으나 마이그레이션 파일로
-- 기록되어 있지 않았음. DB를 재구축하거나 새 환경을 만들 때 이 보안
-- 설정이 누락되지 않도록 코드로 남긴다.
--
-- 조회(SELECT)는 비로그인 방문자도 상품 목록/상세를 봐야 하므로 계속 공개.
-- 등록(INSERT)/삭제(DELETE)는 별도 정책 없이 기본 거부 상태로 두고,
-- 실제 등록/삭제는 서버 라우트(src/app/api/admin/products/route.ts,
-- src/app/actions/product.ts)에서 관리자 검증 후 service_role로 수행한다.

drop policy if exists "Allow public read access" on public.products;
create policy "Allow public read access" on public.products
  for select
  using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
