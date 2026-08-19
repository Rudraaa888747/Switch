-- Premium Return & Refund Management System DB Update
-- Run this in your Supabase SQL Editor

-- 1. Update return_status enum to add new requested statuses
ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'picked_up';

-- 2. Add estimated_refund_date and update status default
ALTER TABLE public.return_requests 
  ADD COLUMN IF NOT EXISTS estimated_refund_date TIMESTAMPTZ,
  ALTER COLUMN status SET DEFAULT 'requested';

-- 3. Update any existing 'pending' to 'requested' for consistency
UPDATE public.return_requests SET status = 'requested' WHERE status = 'pending';

-- 4. Ensure RLS allows realtime (it already should if SELECT is enabled, but good to double check)
-- No changes needed if SELECT/ALL are already enabled for user_id = auth.uid()
