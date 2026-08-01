-- [클로드 코드 발견 → 코웍 조치] 결제 금액 서버 검증 강화 + 적립금 이중/조기지급 버그 수정
--
-- 문제 1 (가격 위조): orders.total_price는 체크아웃 화면(CheckoutInternal.tsx)에서 클라이언트가
-- 계산해 그대로 insert하는 값이었고, 결제 웹훅(process_payment_webhook)은 "PortOne이 실제
-- 승인한 금액"과 "orders.total_price"가 서로 일치하는지만 확인했습니다. 즉 브라우저에서
-- 두 값을 함께 조작하면(장바구니 금액 조작 → 조작된 금액으로 주문 생성 → 그 금액으로만 결제)
-- 자기 일관성 검사를 통과해버려서, 실제 상품가보다 적게 내고 결제완료 처리를 받을 수
-- 있었습니다. order_items를 products/product_options의 실시간 가격으로 서버가 재계산해서
-- orders.total_price와 대조하는 검증을 추가합니다.
--
-- 문제 2 (적립금 조기/이중 지급): CheckoutInternal.tsx가 주문 생성 직후(결제 성공 여부와
-- 무관하게, 재고 확인보다도 전에) total_price의 1%를 point_logs에 즉시 적립하고 있었습니다.
-- 반면 process_payment_webhook은 결제완료 시점에 상품별 reward_points × 수량을
-- profiles.points 컬럼에만 더하고 point_logs에는 기록하지 않았습니다. 그런데 마이페이지가
-- 보여주는 잔액은 profiles.points가 아니라 point_logs를 합산하는 user_total_points 뷰를
-- 우선 사용하므로, 실제 사용자에게 보이는 적립금은 전부 "결제 여부와 무관하게 주문만 생성해도
-- 즉시 지급되는" 잘못된 경로로만 쌓이고 있었고, 결제완료 시 지급되어야 할 정상 적립금은
-- 화면에 반영되지 않고 있었습니다(주문취소해도 되돌아가지 않는 것도 확인). 결제완료
-- 웹훅에서만 point_logs에 적립하도록 통일합니다(클라이언트 측 즉시 적립 코드는 별도로
-- CheckoutInternal.tsx에서 제거).

-- 1. 쿠폰 사용 내역을 주문에 감사용으로 저장 (없으면 서버가 사후에 검증할 방법이 없음)
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;

comment on column public.orders.coupon_code is '체크아웃 시 적용한 쿠폰 코드(감사/검증용). process_payment_webhook이 결제완료 처리 시 이 코드로 쿠폰을 다시 조회해 할인액을 독립적으로 재계산하고, 클라이언트가 보낸 discount_amount 자체는 신뢰하지 않습니다.';

-- 2. process_payment_webhook 재작성
create or replace function public.process_payment_webhook(
  p_payment_id text,
  p_status text,
  p_raw_payload jsonb,
  p_verified_amount numeric default null
)
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

  -- [순서 변경] 이미 결제완료 처리된 주문이면 재검증 없이 즉시 반환합니다.
  -- (기존 코드는 이 idempotency 체크보다 금액 검증이 먼저 실행돼서, PortOne이 같은
  -- 웹훅을 재전송하면 이미 정상 완료된 과거 주문도 매번 다시 금액 검증을 통과해야 했습니다.
  -- 아래에서 검증 로직을 더 엄격하게 만들면서, 과거 주문을 재검증하다가 실수로
  -- '금액불일치_확인필요'로 뒤집는 일이 없도록 idempotency 체크를 먼저 수행하게 바꿨습니다.)
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

    -- (a) [기존] PortOne이 실제로 승인한 금액과 주문에 저장된 금액이 일치하는지 검증
    if p_verified_amount <> v_total_price then
      update public.orders set status = '금액불일치_확인필요', updated_at = now() where id = v_order_id;
      return jsonb_build_object(
        'success', false,
        'message', format('Amount mismatch (portone vs order): order=%s verified=%s', v_total_price, p_verified_amount),
        'already_processed', false
      );
    end if;

    -- (b) [신규] order_items를 products/product_options의 "지금 이 순간" 실시간 가격으로
    --     서버가 독립적으로 재계산해서 orders.total_price가 실제로 정당한 금액인지 검증.
    --     이 부분이 없으면 (a)만으로는 "결제요청 금액"과 "주문 기록 금액"을 함께 조작한
    --     경우를 잡아낼 수 없습니다.
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
      -- 옵션명이 있는데 실제 product_options에 매칭되는 행이 없으면(삭제/조작 등) 정당한
      -- 가격을 계산할 수 없으므로 "옵션 추가금 0원"으로 넘기지 않고 검증 실패로 처리합니다.
      -- (그렇게 하지 않으면 존재하지 않는 옵션명을 지어내서 옵션 추가금을 회피할 수 있음)
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

    -- 쿠폰 할인은 클라이언트가 보낸 discount_amount를 신뢰하지 않고, coupon_code로
    -- 쿠폰을 다시 조회해서 /api/coupons/verify와 동일한 규칙으로 독립 재계산합니다.
    v_expected_discount := 0;
    if v_coupon_code is not null then
      select * into v_coupon from public.coupons
      where code = upper(v_coupon_code) and is_active = true
      limit 1;

      if found
        and (v_coupon.valid_until is null or v_coupon.valid_until >= now())
        and v_expected_subtotal >= coalesce(v_coupon.min_order_amount, 0)
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

      -- [신규] point_logs에도 기록합니다. 마이페이지가 보여주는 실제 적립금 잔액은
      -- profiles.points가 아니라 point_logs를 합산하는 user_total_points 뷰를 우선
      -- 사용하는데, 기존 코드는 여기서 point_logs에 아무것도 남기지 않아서 결제완료로
      -- 정상 적립된 포인트가 화면에 전혀 반영되지 않고 있었습니다.
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
