-- [Migration] Create User Profile Sync Trigger
-- Objective: Automatically create a profile in public.profiles when a new user signs up via Supabase Auth.

-- 1. Function to handle new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin, tier, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '이름 없음'),
    CASE 
      -- 특정 이메일 소유자에게 최초 가입 시 최고 관리자 권한 부여
      WHEN NEW.email = 'grow930706@gmail.com' THEN true 
      ELSE false 
    END,
    'FAMILY', -- 기본 등급
    0         -- 기본 적립금
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger execution after INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Commentary:
-- SECURITY DEFINER is required because auth.users is in a protected schema.
-- This trigger ensures that the CRM (profiles table) always has up-to-date user data.
