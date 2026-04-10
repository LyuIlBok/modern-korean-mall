-- 1. 포인트 입출금 내역을 안전하게 기록할 장부(Ledger) 테이블 생성
CREATE TABLE IF NOT EXISTS public.point_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason VARCHAR(255) NOT NULL, -- 예: 'WELCOME_POINT', 'PURCHASE_REWARD'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own point logs" ON public.point_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 2. 유저별 총 보유 포인트를 빠르게 계산해주는 뷰(View) 생성
CREATE OR REPLACE VIEW public.user_total_points AS
SELECT user_id, COALESCE(SUM(amount), 0) as total_points
FROM public.point_logs
GROUP BY user_id;

-- 3. 기존에 가입한 모든 회원(사장님 포함)에게 '가입 축하금' 3,000 포인트 일괄 지급 (중복 지급 방지)
INSERT INTO public.point_logs (user_id, amount, reason)
SELECT id, 3000, 'WELCOME_POINT' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.point_logs WHERE reason = 'WELCOME_POINT');

-- 4. PostgREST 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';
