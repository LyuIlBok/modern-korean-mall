-- 재고 예약/차감/복구 시스템
-- 지금까지는 products.stock, product_options.stock 컬럼만 있고 실제로 주문 시
-- 차감/검증하는 로직이 전혀 없어 오버셀(재고보다 많이 팔리는 상황)이 가능했습니다.
-- 이 마이그레이션은 주문 생성 직후 재고를 원자적으로(락 사용) 검증/차감하고,
-- 주문 취소 시 복구하는 RPC 두 개를 추가합니다.

alter table public.orders
  add column if not exists stock_reserved boolean not null default false;

create or replace function public.reserve_stock_for_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_available int;
  v_insufficient jsonb := '[]'::jsonb;
  v_already_reserved boolean;
begin
  select stock_reserved into v_already_reserved
  from orders where id = p_order_id
  for update;

  if v_already_reserved is null then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;

  if v_already_reserved then
    -- 이미 재고 차감이 끝난 주문이면 그대로 성공 처리 (중복 호출 방지)
    return jsonb_build_object('success', true, 'already_reserved', true);
  end if;

  -- 1단계: 모든 아이템의 재고를 잠그고(FOR UPDATE) 충분한지 검사만 함
  for v_item in
    select oi.product_id, oi.quantity, oi.option_name, oi.product_name
    from order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.option_name is not null then
      select po.stock into v_available
      from product_options po
      where po.product_id = v_item.product_id and po.option_name = v_item.option_name
      for update;
    else
      select p.stock into v_available
      from products p
      where p.id = v_item.product_id
      for update;
    end if;

    if v_available is null or v_available < v_item.quantity then
      v_insufficient := v_insufficient || jsonb_build_object(
        'product_name', v_item.product_name,
        'option_name', v_item.option_name,
        'available', coalesce(v_available, 0),
        'requested', v_item.quantity
      );
    end if;
  end loop;

  if jsonb_array_length(v_insufficient) > 0 then
    return jsonb_build_object('success', false, 'insufficient_items', v_insufficient);
  end if;

  -- 2단계: 전부 충분하므로 실제 차감
  for v_item in
    select oi.product_id, oi.quantity, oi.option_name
    from order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.option_name is not null then
      update product_options set stock = stock - v_item.quantity
      where product_id = v_item.product_id and option_name = v_item.option_name;
    else
      update products set stock = stock - v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  update products set is_sold_out = true
  where is_sold_out = false
    and stock <= 0
    and id in (select product_id from order_items where order_id = p_order_id);

  update orders set stock_reserved = true where id = p_order_id;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.restore_stock_for_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_was_reserved boolean;
begin
  select stock_reserved into v_was_reserved
  from orders where id = p_order_id
  for update;

  if v_was_reserved is null or v_was_reserved = false then
    -- 애초에 차감된 적 없으면 복구할 것도 없음
    return jsonb_build_object('success', true, 'restored', false);
  end if;

  for v_item in
    select oi.product_id, oi.quantity, oi.option_name
    from order_items oi
    where oi.order_id = p_order_id
  loop
    if v_item.option_name is not null then
      update product_options set stock = stock + v_item.quantity
      where product_id = v_item.product_id and option_name = v_item.option_name;
    else
      update products set stock = stock + v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  -- 재고가 다시 생겼으니 품절 표시 해제
  update products set is_sold_out = false
  where is_sold_out = true
    and stock > 0
    and id in (select product_id from order_items where order_id = p_order_id);

  update orders set stock_reserved = false where id = p_order_id;

  return jsonb_build_object('success', true, 'restored', true);
end;
$$;

revoke all on function public.reserve_stock_for_order(uuid) from public;
grant execute on function public.reserve_stock_for_order(uuid) to authenticated, anon;

revoke all on function public.restore_stock_for_order(uuid) from public;
grant execute on function public.restore_stock_for_order(uuid) to authenticated, anon;
