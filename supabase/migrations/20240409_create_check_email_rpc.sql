-- [Migration] Create Email Duplication Check RPC
-- Objective: Safely check if an email already exists in profiles to prevent signup conflicts.

CREATE OR REPLACE FUNCTION public.check_email_exists(lookup_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE email = lookup_email);
END;
$$;

-- Commentary:
-- SECURITY DEFINER allows the function to run with the privileges of the creator (postgres),
-- bypassing RLS to check for email existence without exposing private data.
