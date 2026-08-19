-- STEP 1: Update Enum Values
-- Run this command ALONE first and click "Run"
ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'picked_up';
