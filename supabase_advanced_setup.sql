-- Supabase Advanced Server-side SQL (Modern Korean Mall)

-- 1. Profiles Table for Admin Management & CRM
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  total_spent NUMERIC DEFAULT 0, -- 누적 구매액
  tier TEXT DEFAULT 'FAMILY', -- 회원 등급 ('FAMILY', 'VIP', 'VVIP')
  points NUMERIC DEFAULT 0, -- 보유 적립금
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 기존 테이블에 컬럼이 없을 경우를 대비한 추가 로직 (에러 무시 가능)
DO $$ 
BEGIN
  ALTER TABLE public.profiles ADD COLUMN total_spent NUMERIC DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN tier TEXT DEFAULT 'FAMILY';
  ALTER TABLE public.profiles ADD COLUMN points NUMERIC DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;


-- 유저가 가입할 때 자동으로 프로필 생성 및 관리자 부여 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email = 'grow930706@gmail.com' -- 관리자 이메일 설정
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 가입 트리거 등록 (이미 존재하면 무시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Inventory Management Trigger
-- 주문이 발생하면 제품 재고를 자동으로 차감하는 함수
CREATE OR REPLACE FUNCTION public.decrement_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity,
      is_sold_out = CASE WHEN (stock - NEW.quantity) <= 0 THEN true ELSE false END
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주문 항목(order_items)이 추가될 때 재고 차감 트리거 등록
DROP TRIGGER IF EXISTS tr_on_order_item_added ON public.order_items;
CREATE TRIGGER tr_on_order_item_added
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE PROCEDURE public.decrement_inventory_on_order();

-- 3. Advanced RLS Policies (Security)
-- 관리자만 Products, Orders를 전체 수정 가능하도록 강화
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
$$ LANGUAGE sql SECURITY DEFINER;

-- Products Policies
DROP POLICY IF EXISTS "Admin full access" ON products;
CREATE POLICY "Admin full access" ON products 
  FOR ALL TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

-- Orders Policies
DROP POLICY IF EXISTS "Admin full access" ON orders;
CREATE POLICY "Admin full access" ON orders 
  FOR ALL TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
