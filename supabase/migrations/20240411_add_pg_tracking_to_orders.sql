-- Add columns to store the PG transaction ID and receipt URL
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pg_tid VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(1024);

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
