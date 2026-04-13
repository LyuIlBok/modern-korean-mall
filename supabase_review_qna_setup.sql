-- 1. 관리자 여부 확인 함수 (성능 최적화용)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT, -- 작성자 이름 캐싱 (조인 감소)
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Q&A 테이블 생성
CREATE TABLE IF NOT EXISTS public.qna (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    question_type TEXT CHECK (question_type IN ('상품', '배송', '반품/환불', '기타')),
    content TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    answer TEXT,
    answered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS 활성화
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qna ENABLE ROW LEVEL SECURITY;

-- 5. 리뷰(reviews) 정책 설정
-- 조회: 누구나 가능
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT USING (true);

-- 생성: 로그인한 사용자만 본인 명의로 가능
CREATE POLICY "Users can create their own reviews" 
ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 수정/삭제: 본인 또는 관리자만 가능
CREATE POLICY "Owners or admins can update/delete reviews" 
ON public.reviews FOR ALL USING (auth.uid() = user_id OR is_admin());

-- 6. Q&A(qna) 정책 설정
-- 조회: 비밀글이 아니거나, 본인이거나, 관리자인 경우만 가능
CREATE POLICY "QnA viewable by owner, admin or if not secret" 
ON public.qna FOR SELECT USING (
    NOT is_secret OR auth.uid() = user_id OR is_admin()
);

-- 생성: 로그인한 사용자만 가능
CREATE POLICY "Users can create their own QnA" 
ON public.qna FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 수정: 작성자(내용 수정) 또는 관리자(답변 작성)
CREATE POLICY "Owners or admins can update QnA" 
ON public.qna FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- 삭제: 본인 또는 관리자만 가능
CREATE POLICY "Owners or admins can delete QnA" 
ON public.qna FOR DELETE USING (auth.uid() = user_id OR is_admin());
