-- [cowork] 전체 시스템 검토 중 발견한 보안/데이터 무결성 이슈 일괄 수정. 라이브 DB에
-- 이미 apply_migration으로 적용 완료(이 파일은 저장소 문서화 목적).
--
-- 1) 심각: reserve_stock_for_order가 anon/authenticated에게 EXECUTE 권한이 열려있었음.
--    임의의 p_order_id로 아무나(로그인 안 해도) 남의 주문 재고를 미리 차감시킬 수 있는
--    취약점(재고 고갈 공격). 형제 함수 restore_stock_for_order는 이미 service_role
--    전용으로 잠겨있었는데 이것만 빠져있었음 — service_role 전용으로 통일.
revoke execute on function public.reserve_stock_for_order(uuid) from public, anon, authenticated;
grant execute on function public.reserve_stock_for_order(uuid) to service_role;

-- 2) 위생: anon(비로그인)이 관리자 전용/내부 전용 함수를 실행 시도할 수 있는 경로를 차단.
--    is_admin()/get_admin_analytics_summary는 내부적으로 자체 방어(admin 체크)가 있어
--    실질 위험은 낮지만, 불필요하게 열려있던 anon 권한은 정리.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.get_admin_analytics_summary(int) from anon;
revoke execute on function public.claim_study_reward() from anon;

-- 3) point_logs에 order_id 연결 — 어떤 주문 때문에 적립/차감됐는지 추적 가능하게.
--    기존 행은 소급 연결 안 함(null 허용), 앞으로의 적립/취소 반영분부터 채움.
alter table public.point_logs add column if not exists order_id uuid references public.orders(id);
create index if not exists point_logs_order_id_idx on public.point_logs(order_id);

-- 4) process_payment_webhook: PURCHASE_REWARD 적립 시 order_id 같이 기록(그 외 로직 동일).
create or replace function public.process_payment_webhook(p_payment_id text, p_status text, p_raw_payload jsonb, p_verified_amount numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_current_status text;
  v_total_price numeric;
  v_coupon_code text;
  v_reward_points_total numeric := 0;
  v_item record;
  v_new_status text;
  v_expected_subtotal numeric := 0;
  v_expected_shipping numeric := 0;
  v_expected_discount numeric := 0;
  v_expected_total numeric;
  v_coupon record;
  v_has_unmatched_option boolean := false;
  v_has_items boolean := false;
  v_effective_base_price numeric;
begin
  select id, user_id, status, total_price, coupon_code
  into v_order_id, v_user_id, v_current_status, v_total_price, v_coupon_code
  from public.orders
  where id::text = p_payment_id
  for update;

  if v_order_id is null then
    return jsonb_build_object('success', false, 'message', 'Order not found: ' || p_payment_id, 'already_processed', false);
  end if;

  if p_status = 'PAID' then v_new_status := '결제완료';
  elsif p_status = 'FAILED' then v_new_status := '결제실패';
  elsif p_status = 'CANCELLED' then v_new_status := '취소됨';
  elsif p_status = 'VIRTUAL_ACCOUNT_ISSUED' then v_new_status := '입금대기';
  else v_new_status := v_current_status;
  end if;

  if v_current_status = '결제완료' then
    return jsonb_build_object('success', true, 'message', 'Already processed as PAID', 'already_processed', true);
  end if;

  if v_new_status = v_current_status then
    return jsonb_build_object('success', true, 'message', 'Status already at ' || v_new_status, 'already_processed', true);
  end if;

  if p_status = 'PAID' then
    if p_verified_amount is null then
      return jsonb_build_object('success', false, 'message', 'Verified amount missing — cannot confirm payment', 'already_processed', false);
    end if;

    if p_verified_amount <> v_total_price then
      update public.orders set status = '금액불일치_확인필요', updated_at = now() where id = v_order_id;
      return jsonb_build_object(
        'success', false,
        'message', format('Amount mismatch (portone vs order): order=%s verified=%s', v_total_price, p_verified_amount),
        'already_processed', false
      );
    end if;

    for v_item in
      select oi.quantity, oi.option_name, p.price as base_price, p.shipping_fee,
             coalesce(p.discount_rate, 0) as discount_rate,
             po.additional_price as option_addl
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      left join public.product_options po
        on po.product_id = oi.product_id and po.option_name = oi.option_name
      where oi.order_id = v_order_id
    loop
      v_has_items := true;
      if v_item.option_name is not null and v_item.option_addl is null then
        v_has_unmatched_option := true;
      end if;

      v_effective_base_price := floor(v_item.base_price * (1 - v_item.discount_rate / 100));

      v_expected_subtotal := v_expected_subtotal + (v_effective_base_price + coalesce(v_item.option_addl, 0)) * v_item.quantity;
      v_expected_shipping := greatest(v_expected_shipping, coalesce(v_item.shipping_fee, 0));
    end loop;

    if not v_has_items or v_has_unmatched_option then
      update public.orders set status = '금액불일치_확인필요', updated_at = now() where id = v_order_id;
      return jsonb_build_object(
        'success', false,
        'message', 'Order items missing or contain an unrecognized product option — cannot verify price',
        'already_processed', false
      );
    end if;

    v_expected_discount := 0;
    v_coupon := null;
    if v_coupon_code is not null then
      select * into v_coupon from public.coupons
      where code = upper(v_coupon_code) and is_active = true
      limit 1;

      if found
        and (v_coupon.valid_until is null or v_coupon.valid_until >= now())
        and v_expected_subtotal >= coalesce(v_coupon.min_order_amount, 0)
        and (
          v_user_id is null
          or not exists (
            select 1 from public.user_coupons uc
            where uc.user_id = v_user_id and uc.coupon_id = v_coupon.id and uc.is_used = true
          )
        )
      then
        if v_coupon.discount_type in ('amount', 'fixed') then
          v_expected_discount := v_coupon.discount_amount;
        elsif v_coupon.discount_type in ('percent', 'rate') then
          v_expected_discount := floor(v_expected_subtotal * v_coupon.discount_amount / 100);
        end if;
        if v_expected_discount > v_expected_subtotal then
          v_expected_discount := v_expected_subtotal;
        end if;
      end if;
    end if;

    v_expected_total := greatest(0, v_expected_subtotal + v_expected_shipping - v_expected_discount);

    if v_expected_total <> v_total_price then
      update public.orders set status = '금액불일치_확인필요', updated_at = now() where id = v_order_id;
      return jsonb_build_object(
        'success', false,
        'message', format(
          'Amount mismatch (recomputed vs order): expected=%s (subtotal=%s shipping=%s discount=%s) order=%s',
          v_expected_total, v_expected_subtotal, v_expected_shipping, v_expected_discount, v_total_price
        ),
        'already_processed', false
      );
    end if;
  end if;

  update public.orders
  set status = v_new_status, updated_at = now()
  where id = v_order_id;

  if p_status = 'PAID' then
    if v_user_id is not null and v_coupon.id is not null and v_expected_discount > 0 then
      update public.user_coupons
      set is_used = true, used_at = now()
      where user_id = v_user_id and coupon_id = v_coupon.id and is_used = false;
    end if;

    if v_user_id is not null then
      for v_item in
        select oi.quantity, p.reward_points
        from public.order_items oi
        join public.products p on oi.product_id = p.id
        where oi.order_id = v_order_id
      loop
        v_reward_points_total := v_reward_points_total + (coalesce(v_item.reward_points, 0) * v_item.quantity);
      end loop;

      update public.profiles
      set points = points + v_reward_points_total,
          total_spent = total_spent + v_total_price,
          updated_at = now()
      where id = v_user_id;

      if v_reward_points_total > 0 then
        insert into public.point_logs (user_id, amount, reason, order_id)
        values (v_user_id, v_reward_points_total, 'PURCHASE_REWARD', v_order_id);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Order updated to ' || v_new_status,
    'already_processed', false,
    'points_added', v_reward_points_total
  );
end;
$function$;

-- 5) 관리자 주문 상태 변경 전용 RPC — 클코가 리포트한 두 가지 문제를 한 번에 해결:
--    (a) 취소/환불된 주문을 실수로 "배송완료" 등으로 되돌리면 재고가 다시 차감되지
--        않은 채 배송완료 처리되어 오버셀로 이어질 수 있었음 → 취소류 상태에서는
--        다른 그룹으로 못 나가도록 서버에서 차단.
--    (b) 결제 완료 시 적립된 포인트가 취소/환불 시 전혀 회수되지 않았음 → 취소류
--        상태로 전환될 때 해당 주문으로 적립된 PURCHASE_REWARD를 point_logs 대조로
--        찾아 회수(이미 다른 곳에 써서 잔액이 모자라면 있는 만큼만 회수, 마이너스
--        잔액 방지). order_id로 중복 회수 방지(멱등).
--    재고 반영은 기존 restore_stock_for_order/reserve_stock_for_order(둘 다 이미
--    stock_reserved 플래그로 멱등 처리됨) 그대로 재사용.
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_user_id uuid;
  v_paid_group text[] := array['결제완료','배송준비중','배송완료'];
  v_cancelled_group text[] := array['주문취소','취소됨','환불완료','재고부족취소'];
  v_reward_total numeric;
  v_already_reversed boolean;
  v_reverse_amount numeric := 0;
  v_current_points numeric;
begin
  select status, user_id into v_current_status, v_user_id
  from public.orders where id = p_order_id
  for update;

  if v_current_status is null then
    return jsonb_build_object('success', false, 'message', '주문을 찾을 수 없습니다.');
  end if;

  if v_current_status = any(v_cancelled_group) and not (p_new_status = any(v_cancelled_group)) then
    return jsonb_build_object('success', false, 'message', '이미 취소·환불 처리된 주문은 다른 상태로 되돌릴 수 없습니다. 필요하면 재주문으로 안내해주세요.');
  end if;

  if p_new_status = any(v_paid_group) then
    perform public.reserve_stock_for_order(p_order_id);
  end if;

  if p_new_status = any(v_cancelled_group) then
    perform public.restore_stock_for_order(p_order_id);

    if v_user_id is not null then
      select exists(
        select 1 from public.point_logs
        where order_id = p_order_id and reason = 'CANCEL_REWARD_REVERSAL'
      ) into v_already_reversed;

      if not v_already_reversed then
        select coalesce(sum(amount), 0) into v_reward_total
        from public.point_logs
        where order_id = p_order_id and reason = 'PURCHASE_REWARD';

        if v_reward_total > 0 then
          select points into v_current_points from public.profiles where id = v_user_id for update;
          v_reverse_amount := least(v_reward_total, coalesce(v_current_points, 0));

          if v_reverse_amount > 0 then
            update public.profiles set points = points - v_reverse_amount, updated_at = now()
            where id = v_user_id;

            insert into public.point_logs (user_id, amount, reason, order_id)
            values (v_user_id, -v_reverse_amount, 'CANCEL_REWARD_REVERSAL', p_order_id);
          end if;
        end if;
      end if;
    end if;
  end if;

  update public.orders
  set status = p_new_status,
      tracking_number = coalesce(p_tracking_number, tracking_number),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'message', '주문 상태가 ' || p_new_status || '(으)로 변경되었습니다.',
    'points_reversed', v_reverse_amount
  );
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(uuid, text, text) to service_role;
