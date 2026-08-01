-- [클로드 코드 발견 → 코웍 조치] unified_members 뷰의 mall_points가 profiles.points
-- (죽은 컬럼: process_payment_webhook이 갱신은 하지만 실제 사용자 화면(마이페이지)은
-- point_logs 합산 뷰(user_total_points)를 우선 사용하므로 실제 잔액과 어긋남)를 그대로
-- 쓰고 있어서 관리자 화면(/admin/unified-members)에 표시되는 적립금이 실제와 달랐음.
-- point_logs 실시간 합계로 교체. 적용 후 라이브 데이터로 mall_points가
-- user_total_points(실제 마이페이지 표시값)와 일치하는지 확인함.

create or replace view public.unified_members as
select
  u.id,
  u.email,
  u.created_at as signed_up_at,
  u.last_sign_in_at,
  p.full_name,
  p.phone,
  coalesce(p.is_admin, false) as is_admin,
  p.id is not null as uses_mall,
  p.tier as mall_tier,
  (select coalesce(sum(pl.amount), 0) from public.point_logs pl where pl.user_id = u.id)::numeric as mall_points,
  p.total_spent as mall_total_spent,
  (select count(*) from public.orders o where o.user_id = u.id) as mall_order_count,
  ap.id is not null as uses_word_app,
  ap.tier as word_app_tier,
  ap.ai_generations_count as word_app_ai_generations,
  (select count(*) from public.agri_cards c where c.user_id = u.id) as word_app_card_count
from auth.users u
left join public.profiles p on p.id = u.id
left join public.agri_profiles ap on ap.id = u.id;
