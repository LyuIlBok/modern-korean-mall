-- [Migration] Update Signup Trigger and Profiles Schema
-- Objective: Add marketing consent and support automatic sync of phone and marketing metadata.

-- 1. Add marketing_consent column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;

-- 2. Update the handle_new_user trigger function to include phone and marketing_consent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, marketing_consent, is_admin, tier, points)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '이름 없음'),
    new.raw_user_meta_data->>'phone',
    COALESCE((new.raw_user_meta_data->>'marketing_consent')::boolean, false),
    CASE 
      WHEN new.email = 'grow930706@gmail.com' THEN true 
      ELSE false 
    END,
    'FAMILY',
    0
  );
  RETURN new;
END;
$$;

-- Commentary:
-- This function extracts 'phone' and 'marketing_consent' from raw_user_meta_data 
-- which is populated via the options.data parameter in supabase.auth.signUp().
