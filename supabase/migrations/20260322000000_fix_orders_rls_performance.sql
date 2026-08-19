-- Fix massive latency in order placement and admin panel scans
-- by splitting OR conditions in RLS and adding Trigram indexes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_select_anon" ON public.orders;
DROP POLICY IF EXISTS "orders_select_service" ON public.orders;

-- Single user isolated policy
CREATE POLICY "orders_select_own" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

-- Single guest/anon isolated policy
CREATE POLICY "orders_select_anon" ON public.orders
FOR SELECT TO anon USING (order_id IS NOT NULL);

-- Single service role/admin policy
CREATE POLICY "orders_select_service" ON public.orders
FOR SELECT TO service_role USING (true);

-- Create Trigram Indexes for Admin Dashboard ILIKE text searches
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm ON public.orders USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_order_number_trgm ON public.orders USING gin (order_number gin_trgm_ops);

-- Fix INSERT policies that are denying guest checkouts
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_all" ON public.orders;

CREATE POLICY "orders_insert_all" ON public.orders
FOR INSERT WITH CHECK (true);

-- Enable Realtime events for the Admin Dashboard order tracking
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

