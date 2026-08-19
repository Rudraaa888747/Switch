-- Admin panel in this project is local-session based (not Supabase Auth),
-- so updates happen via anon/authenticated API keys. This policy enables
-- status and delivery-date updates from the admin UI.

DROP POLICY IF EXISTS "orders_update_all_demo" ON public.orders;
CREATE POLICY "orders_update_all_demo"
ON public.orders
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT UPDATE ON public.orders TO anon, authenticated;
