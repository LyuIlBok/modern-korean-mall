-- [Migration] Add Phone Column to Profiles
-- Objective: Support storing user phone numbers for order processing and CRM.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
