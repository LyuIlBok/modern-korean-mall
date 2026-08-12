-- [cowork] 클코가 실계정으로 라이브 관리자 화면 점검 중 발견한 버그 2건 수정.
-- 라이브 DB에 이미 apply_migration으로 적용 완료(이 파일은 저장소 문서화 목적).

-- 1) 재입고 알림 탭이 항상 빈 목록으로 보이던 문제: restock_alerts.user_id의 FK가
--    profiles(id)가 아니라 auth.users(id)를 가리키고 있었음 — 제약 자체는 있었지만
--    PostgREST는 이 FK로 `profiles(...)` 임베드 관계를 못 찾아
--    AdminDashboard.tsx의 .select('*, products(...), profiles(email, full_name)')
--    쿼리가 스키마 캐시 조회 실패로 에러났음(클코가 "FK가 없다"고 관찰한 게 바로 이
--    증상). auth.users(id)=profiles(id) 1:1이라 profiles로 갈아끼워도 데이터 의미는
--    동일 — 대상 테이블만 profiles로 바꿔서 PostgREST가 임베드를 인식하게 함.
alter table public.restock_alerts drop constraint restock_alerts_user_id_fkey;
alter table public.restock_alerts
  add constraint restock_alerts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- FK를 고쳐도 이 화면은 서비스롤이 아니라 로그인 클라이언트로 직접 조회하는데
-- 기존 RLS 정책("Users can manage own restock alerts")은 본인 것만 보이게 하므로
-- 관리자용 select 정책을 별도로 추가해야 다른 고객 신청도 보임.
create policy "Admins can view all restock alerts" on public.restock_alerts
  for select using (public.is_admin());

-- 2) /admin/analytics가 배포 환경에서도 500이던 문제: get_admin_analytics_summary가
--    서비스롤로 호출되는데 내부 is_admin() 체크가 auth.uid()에 의존 — 서비스롤
--    호출엔 auth.uid()가 없어(null) 항상 'admin only' 예외로 실패했음. 이미 라우트의
--    verifyAdmin(request)가 실제 로그인 사용자를 검증한 뒤에만 이 RPC를 호출하고,
--    이번에 execute 권한을 service_role 전용으로 좁혔으므로 내부 auth.uid() 의존
--    체크는 제거하고 GRANT 자체로만 방어(restore_stock_for_order/
--    admin_update_order_status와 동일 패턴으로 통일).
create or replace function public.get_admin_analytics_summary(p_days int default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_category_sales jsonb;
  v_segments jsonb;
  v_repurchase_rate numeric;
  v_unpaid_statuses text[] := array['결제대기','입금대기','결제실패','주문취소','취소됨','금액불일치_확인필요','환불완료','재고부족취소'];
begin
  select coalesce(jsonb_agg(t order by t.total_sales desc), '[]'::jsonb)
  into v_category_sales
  from (
    select p.category,
           sum(oi.price * oi.quantity) as total_sales,
           count(distinct oi.order_id) as order_count
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.products p on p.id = oi.product_id
    where not (o.status = any(v_unpaid_statuses))
      and o.created_at >= now() - (p_days || ' days')::interval
    group by p.category
  ) t;

  with order_stats as (
    select o.user_id, count(*) as order_count, max(o.created_at) as last_order_at
    from public.orders o
    where not (o.status = any(v_unpaid_statuses)) and o.user_id is not null
    group by o.user_id
  )
  select jsonb_build_object(
    'new_customers', count(*) filter (where order_count = 1),
    'repeat_customers', count(*) filter (where order_count >= 2),
    'dormant_customers', count(*) filter (where last_order_at < now() - interval '90 days'),
    'total_customers_with_orders', count(*)
  )
  into v_segments
  from order_stats;

  select case when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where order_count >= 2) / count(*), 1)
  end
  into v_repurchase_rate
  from (
    select user_id, count(*) as order_count
    from public.orders
    where not (status = any(v_unpaid_statuses)) and user_id is not null
    group by user_id
  ) t;

  return jsonb_build_object(
    'period_days', p_days,
    'category_sales', v_category_sales,
    'customer_segments', v_segments,
    'repurchase_rate_percent', v_repurchase_rate
  );
end;
$$;

revoke execute on function public.get_admin_analytics_summary(int) from public, anon, authenticated;
grant execute on function public.get_admin_analytics_summary(int) to service_role;
