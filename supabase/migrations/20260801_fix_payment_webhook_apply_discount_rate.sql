-- [cowork] 결제 금액 서버 재검증에 상품 할인율(discount_rate) 미반영 버그 수정
--
-- 배경: 클코가 리포트한 버그 — 상품상세/장바구니 화면은 discount_rate를 반영한
-- 할인가를 보여주고 프론트도 할인가로 장바구니에 담도록 이미 수정했는데
-- (ProductDetailClient.tsx, ProductCard.tsx), process_payment_webhook의 서버측
-- 금액 재계산은 여전히 상품 정가(products.price)만 보고 있었음. 이 상태로 배포되면
-- 할인 상품 결제 시 항상 "금액불일치_확인필요"로 막혀 체크아웃이 깨짐.
--
-- 수정: 라인아이템 금액 재계산을
--   floor(products.price * (1 - coalesce(products.discount_rate,0)/100)) + 옵션추가금
-- 공식으로 통일 — 화면에 쓰이는 공식(Math.floor(price * (1 - discount_rate/100)))과
-- 동일. 옵션 추가금(additional_price)은 화면과 동일하게 할인 대상에서 제외.
--
-- 참고: apply_migration으로 이미 라이브 적용된 내용을 저장소에 문서화한 것입니다
-- (create or replace function이라 재실행해도 안전).

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

      -- [수정] 화면과 동일한 공식으로 할인율 반영. 옵션 추가금은 할인 대상 아님.
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
