-- 1. 상품 옵션 테이블 생성 (무게, 포장 방식 등에 따른 추가 금액 설정용)
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  option_name VARCHAR(255) NOT NULL, -- 예: '고구마 5kg', '특상급 포장'
  additional_price INTEGER DEFAULT 0, -- 예: 5000 (기본가에 추가되는 금액)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
CREATE POLICY "Allow public read access on product_options" 
ON public.product_options FOR SELECT USING (true);

-- 관리자만 수정 가능 (기존 products와 유사한 정책)
CREATE POLICY "Allow admin to manage product_options" 
ON public.product_options FOR ALL 
USING (auth.uid() IN (SELECT id FROM profiles WHERE email = ANY(ARRAY['lyuilbok@gmail.com', 'admin@nature.com']))); -- CONFIG.ADMIN_EMAILS 기반

-- 캐시 갱신
NOTIFY pgrst, 'reload schema';
