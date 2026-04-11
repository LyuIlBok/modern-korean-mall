-- Upgrade product_options table to support per-option stock management
ALTER TABLE public.product_options ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 100;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
