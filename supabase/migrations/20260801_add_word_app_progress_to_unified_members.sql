-- unified_members 뷰에 단어앱(AgriLeitner) 학습 진척도 컬럼 추가
-- (졸업 카드 수, 평균 라이트너 단계, 오늘 복습 대기 카드 수, 최근 복습일)
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
  (select coalesce(sum(pl.amount), 0::bigint) from point_logs pl where pl.user_id = u.id)::numeric as mall_points,
  p.total_spent as mall_total_spent,
  (select count(*) from orders o where o.user_id = u.id) as mall_order_count,
  ap.id is not null as uses_word_app,
  ap.tier as word_app_tier,
  ap.ai_generations_count as word_app_ai_generations,
  (select count(*) from agri_cards c where c.user_id = u.id) as word_app_card_count,
  (select count(*) from agri_cards c where c.user_id = u.id and c.is_graduated = true) as word_app_graduated_count,
  (select round(avg(c.stage), 1) from agri_cards c where c.user_id = u.id and c.is_graduated = false) as word_app_avg_stage,
  (select count(*) from agri_cards c where c.user_id = u.id and c.is_graduated = false and c.next_review_at <= current_date) as word_app_due_today,
  (select max(c.last_reviewed_at) from agri_cards c where c.user_id = u.id) as word_app_last_reviewed_at
from auth.users u
left join profiles p on p.id = u.id
left join agri_profiles ap on ap.id = u.id;
