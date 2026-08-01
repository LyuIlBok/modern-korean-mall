-- [cowork] 개인 발급 쿠폰(user_coupons)이 무제한 재사용 가능했던 버그 수정
--
-- 문제: user_coupons.is_used는 쿠폰 발급 시점에만 기록되고 결제 시점에 갱신되지
-- 않았으며, 쿠폰 검증/적용 로직(/api/coupons/verify, process_payment_webhook)이
-- user_coupons를 아예 조회하지 않아 동일 개인 쿠폰을 여러 번 결제에 사용할 수 있는
-- 취약점이 있었음.
--
-- 수정 내용 (process_payment_webhook):
--   1) 로그인 사용자(v_user_id not null)가 쿠폰을 사용하려는 경우, 해당
--      user_coupons 행이 이미 is_used = true라면 쿠폰을 무효 처리(할인 미적용).
--   2) 결제가 정상 완료되고 쿠폰 할인이 실제로 적용된 경우, 해당 user_coupons
--      행을 is_used = true, used_at = now() 로 갱신.
--
-- 참고: 이 파일은 apply_migration으로 이미 라이브 적용된 내용을 저장소에 문서화한
-- 것입니다(재실행해도 안전하도록 create or replace function 사용).

create or replace function public.process_payment_webhook(p_payment_id text, p_status text, p_raw_payload jsonb, p_verified_amount numeric DEFAULT NULL::numeric)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

      v_expected_subtotal := v_expected_subtotal + (v_item.base_price + coalesce(v_item.option_addl, 0)) * v_item.quantity;
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

      -- [수정] 개인 발급 쿠폰(user_coupons)이 이미 사용 처리된 상태라면 무효 처리
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
    -- [수정] 실제로 할인이 적용된 개인 쿠폰은 사용 완료로 표시(재사용 방지)
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
        insert into public.point_logs (user_id, amount, reason)
        values (v_user_id, v_reward_points_total, 'PURCHASE_REWARD');
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
