-- 1) 이번에 새로 만든 reserve_stock_for_order()가 재고 검증/차감의 유일한 창구가
--    되어야 하는데, order_items INSERT 시 자동으로 도는 예전 트리거
--    (decrement_inventory_on_order)가 남아있어서 재고 부족 검증도 없이,
--    옵션 재고도 고려하지 않고, 무조건 무제한으로 차감하고 있었습니다.
--    이걸 그대로 두면 주문 하나에 재고가 "두 번" 깎이는 심각한 버그가 생깁니다.
--    -> 트리거와 옛 함수를 제거합니다.
drop trigger if exists tr_on_order_item_added on public.order_items;
drop function if exists public.decrement_inventory_on_order();

-- 2) 사용되지 않는 구버전 process_payment_webhook 오버로드 제거.
--    존재하지도 않는 컬럼(orders.total_amount 등)을 참조하는 죽은 코드였고,
--    금액 검증 로직도 없어 공격 표면만 넓히고 있었습니다.
drop function if exists public.process_payment_webhook(character varying, character varying, character varying, character varying);

-- 3) search_path 고정 (스키마 하이재킹 방지)
alter function public.is_admin() set search_path = public;
alter function public.handle_default_address() set search_path = public;
alter function public.handle_new_agri_user() set search_path = public;

-- 4) 트리거 전용 함수는 anon/authenticated가 직접 RPC로 호출할 이유가 없음.
--    (트리거 실행 자체는 이 grant와 무관하게 정상 동작합니다.)
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_new_agri_user() from anon, authenticated;
revoke execute on function public.handle_default_address() from anon, authenticated;

-- 5) SECURITY DEFINER 뷰 -> SECURITY INVOKER로 전환.
--    (조회자 본인의 RLS 권한으로 point_logs를 읽도록 강제)
alter view public.user_total_points set (security_invoker = true);
