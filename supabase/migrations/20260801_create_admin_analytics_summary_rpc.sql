-- [cowork] 관리자 분석 고도화 트랙: 카테고리별 매출 / 고객 세그먼트 / 재구매율을
-- 한 번에 반환하는 관리자 전용 RPC. SECURITY DEFINER + is_admin() 체크로 관리자만
-- 실행 가능(관리자 API 라우트의 verifyAdmin과 이중 방어).
--
-- "결제된 적 없거나 취소/실패한" 상태만 제외하는 방식으로 필터링합니다 — 결제완료류만
-- 화이트리스트하면 나중에 새 상태값이 추가됐을 때 조용히 매출이 누락될 위험이 있어서,
-- 반대로(불리스트) 접근이 더 안전하다고 판단했습니다.
--
-- 참고: apply_migration으로 이미 라이브 적용된 내용을 저장소에 문서화한 것입니다.
create or replace function public.get_admin_analytics_summary(p_days int default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_category_sales jsonb;
  v_segments jsonb;
  v_repurchase_rate numeric;
  v_unpaid_statuses text[] := array['결제대기','입금대기','결제실패','주문취소','취소됨','금액불일치_확인필요','환불완료','재고부족취소'];
begin
  select coalesce(public.is_admin(), false) into v_is_admin;
  if not v_is_admin then
    raise exception 'admin only';
  end if;

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

grant execute on function public.get_admin_analytics_summary(int) to authenticated;
