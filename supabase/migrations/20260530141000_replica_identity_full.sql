-- Set REPLICA IDENTITY FULL for tables that are filtered by non-PK columns in Realtime subscriptions.
-- This ensures that UPDATE events include the full row data in the WAL,
-- allowing Realtime to match filters like 'user_id=eq.123' when only 'status' was updated.

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.return_requests REPLICA IDENTITY FULL;
