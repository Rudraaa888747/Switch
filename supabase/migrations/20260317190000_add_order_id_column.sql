-- Add order_id column to orders table for frontend compatibility
-- The modern orders schema uses order_number as the canonical column,
-- but the frontend and many subsequent migrations expect order_id.
-- This must run BEFORE migrations 20260318133000, 20260321200000, 20260322000000.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Initialise order_id from order_number for existing rows
UPDATE public.orders SET order_id = order_number WHERE order_id IS NULL;
