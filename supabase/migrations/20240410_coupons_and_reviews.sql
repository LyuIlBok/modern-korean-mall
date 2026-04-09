-- [Migration] Discount Coupon and Product Review System
-- Objective: Implement coupon validation and product reviews.

-- 1. Update/Create Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('amount', 'rate', 'fixed', 'percent')),
  discount_value NUMERIC NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0, -- Backward compatibility/Simplicity
  min_order_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert Test Welcome Coupon
INSERT INTO public.coupons (code, name, discount_type, discount_value, discount_amount) 
VALUES ('WELCOME3000', '신규 가입 환영 쿠폰', 'amount', 3000, 3000)
ON CONFLICT (code) DO UPDATE SET discount_amount = 3000, is_active = true;

-- 2. Create Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. Storage Bucket for Review Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reviews', 'reviews', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Reviews" ON storage.objects;
CREATE POLICY "Public Access Reviews" ON storage.objects FOR SELECT USING (bucket_id = 'reviews');

DROP POLICY IF EXISTS "Authenticated users can upload reviews" ON storage.objects;
CREATE POLICY "Authenticated users can upload reviews" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reviews');
