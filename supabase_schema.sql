-- Supabase Schema for Modern Korean Mall (자연의 결)

-- 1. Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL, -- '농산물', '농자재' 등
  imageUrl TEXT,
  images TEXT[] DEFAULT '{}', -- 추가 이미지 배열
  is_sold_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT '결제완료', -- '결제완료', '배송중', '배송완료'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) 설정 예시

-- Products: 누구나 조회 가능, 관리자만 수정 가능
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON products FOR SELECT USING (true);
-- 관리자 정책은 서비스 역할(service_role)이나 특정 이메일 체크로 구현 권장

-- Orders: 본인의 주문만 조회 가능
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow public insert (or authenticated)" ON orders FOR INSERT WITH CHECK (true);

-- Order Items: 주문 조회 권한에 따름
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Allow public insert" ON order_items FOR INSERT WITH CHECK (true);

-- 4. Storage Bucket Setup
-- Supabase Dashboard의 Storage 메뉴에서 'product-images'라는 이름의 public 버킷을 생성해야 합니다.
-- 생성 후 아래와 같은 정책을 추가하여 누구나 이미지를 볼 수 있게 설정하세요.
/*
  CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
  CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
*/
