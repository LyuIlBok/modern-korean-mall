-- [Migration] Create Notices and Global Popup System
-- Objective: Support official announcements and game-patch style update popups.

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'UPDATE' CHECK (category IN ('UPDATE', 'EVENT', 'NOTICE')),
  is_popup BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Initial Patch Note
INSERT INTO public.notices (title, content, category, is_popup) 
VALUES (
  '[업데이트] v1.2 실시간 상담 및 배송 조회 시스템 도입', 
  '1. 1:1 제품 상담하기 기능 고도화 (리치 카드 도입)
2. 마이페이지 배송 추적 및 송장 확인 기능 추가
3. 관리자 주문 관리 시스템(OMS) 최적화
4. 장바구니 할인 쿠폰 및 사진 리뷰 시스템 구축',
  'UPDATE',
  true
) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active notices" ON public.notices;
CREATE POLICY "Anyone can view active notices" ON public.notices
  FOR SELECT USING (is_active = true);

-- Admin can do everything via Service Role or specific checks if needed
