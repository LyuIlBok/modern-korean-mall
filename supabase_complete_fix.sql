-- Modern Korean Mall (자연의 결) - 통합 데이터베이스 설정 및 수정 스크립트

-- 1. 기존 테이블 확장 및 컬럼 추가 (안전한 실행을 위해 DO 블록 사용)
DO $$ 
BEGIN
  -- Products 테이블 확장
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='shipping_fee') THEN
    ALTER TABLE public.products ADD COLUMN shipping_fee NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='specs') THEN
    ALTER TABLE public.products ADD COLUMN specs JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='detail_content_images') THEN
    ALTER TABLE public.products ADD COLUMN detail_content_images TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reward_points') THEN
    ALTER TABLE public.products ADD COLUMN reward_points NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='discount_rate') THEN
    ALTER TABLE public.products ADD COLUMN discount_rate NUMERIC DEFAULT 0;
  END IF;

  -- Orders 테이블 확장
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
    ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='memo') THEN
    ALTER TABLE public.orders ADD COLUMN memo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

EXCEPTION
  WHEN others THEN null;
END $$;

-- 2. 신규 테이블 생성

-- 배송지 관리 (Addresses)
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address_name TEXT, -- '집', '회사' 등
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  postcode TEXT NOT NULL,
  address TEXT NOT NULL,
  detail_address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 쿠폰 관리 (Coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percent', 'amount', 'rate')),
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 유저별 쿠폰 (User Coupons)
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 재입고 알림 (Restock Alerts)
CREATE TABLE IF NOT EXISTS public.restock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- 3. RLS (Row Level Security) 설정 강화

-- Addresses RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Coupons RLS
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own coupons" ON public.user_coupons;
CREATE POLICY "Users can view own coupons" ON public.user_coupons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Restock Alerts RLS
ALTER TABLE public.restock_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own restock alerts" ON public.restock_alerts;
CREATE POLICY "Users can manage own restock alerts" ON public.restock_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. 유틸리티 함수 및 트리거

-- 기본 배송지 설정 시 다른 배송지의 기본 설정을 해제하는 함수
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_address_default ON public.addresses;
CREATE TRIGGER tr_on_address_default
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_default_address();

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_restock_alerts_product_id ON restock_alerts(product_id);

-- 6. Storage Bucket 및 Policy 초기화
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Public Read 정책 (누구나 가능)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Storage Admin Write 정책 (Service Role 권한)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin Write Access' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admin Write Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');
  END IF;
END $$;

-- 7. 웹훅 처리를 위한 RPC 함수 (Idempotency & Atomic Transaction)
CREATE OR REPLACE FUNCTION public.process_payment_webhook(
  p_payment_id TEXT,
  p_status TEXT,
  p_raw_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_user_id UUID;
  v_current_status TEXT;
  v_total_price NUMERIC;
  v_reward_points_total NUMERIC := 0;
  v_item RECORD;
  v_new_status TEXT;
BEGIN
  -- 주문 데이터 조회 (p_payment_id를 UUID로 변환 시도)
  SELECT id, user_id, status, total_price 
  INTO v_order_id, v_user_id, v_current_status, v_total_price
  FROM public.orders 
  WHERE id::TEXT = p_payment_id;

  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found: ' || p_payment_id, 'already_processed', false);
  END IF;

  -- 상태 매핑 (PortOne V2 -> DB Status)
  IF p_status = 'PAID' THEN v_new_status := '결제완료';
  ELSIF p_status = 'FAILED' THEN v_new_status := '결제실패';
  ELSIF p_status = 'CANCELLED' THEN v_new_status := '취소됨';
  ELSIF p_status = 'VIRTUAL_ACCOUNT_ISSUED' THEN v_new_status := '입금대기';
  ELSE v_new_status := v_current_status;
  END IF;

  -- 멱등성 체크: 이미 처리된 최종 상태면 중복 처리 방지
  IF v_current_status = '결제완료' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already processed as PAID', 'already_processed', true);
  END IF;

  IF v_new_status = v_current_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Status already at ' || v_new_status, 'already_processed', true);
  END IF;

  -- 트랜잭션 시작: 주문 상태 업데이트
  UPDATE public.orders 
  SET status = v_new_status, 
      updated_at = now() 
  WHERE id = v_order_id;

  -- 결제 성공 시 추가 로직 (재고 확정 및 포인트 적립)
  IF p_status = 'PAID' THEN
    -- 포인트 적립 (회원일 경우)
    IF v_user_id IS NOT NULL THEN
      -- 각 주문 상품의 적립금 합산
      FOR v_item IN 
        SELECT oi.quantity, p.reward_points 
        FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        WHERE oi.order_id = v_order_id
      LOOP
        v_reward_points_total := v_reward_points_total + (COALESCE(v_item.reward_points, 0) * v_item.quantity);
      END LOOP;

      -- 유저 프로필 업데이트
      UPDATE public.profiles
      SET points = points + v_reward_points_total,
          total_spent = total_spent + v_total_price,
          updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Order updated to ' || v_new_status, 
    'already_processed', false,
    'points_added', v_reward_points_total
  );
END;
$$;
