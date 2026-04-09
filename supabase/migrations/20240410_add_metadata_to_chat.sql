-- [Migration] Add Metadata to Support Messages
-- Objective: Support rich UI (Product Cards) in chat by storing structured data.

ALTER TABLE public.support_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Commentary:
-- JSONB allows us to store arbitrary metadata like productId, productName, imageUrl, etc.
-- without changing the table schema for every new UI requirement.
