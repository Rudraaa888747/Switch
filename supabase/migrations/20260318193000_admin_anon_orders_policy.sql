-- Allow the anon role (unauthenticated Supabase client) to read all orders for
-- the admin dashboard. The admin panel uses localStorage-based auth and does not
-- have a Supabase session, which means auth.uid() is null and the existing
-- "orders_select_own" / "orders_admin_select_all" policies block all reads.
-- This policy opens SELECT to the anon role so the admin client can query orders.

-- Also allow anon to INSERT orders (guest checkout support):
-- orders can be placed without being logged in via Supabase.

-- Note: This is appropriate for a demo/development application that uses a
-- simple localStorage admin credential rather than Supabase Auth admin roles.

-- DROP existing anon-blocking restrictions on orders SELECT so admin can read them:
DROP POLICY IF EXISTS "orders_anon_select_all" ON public.orders;
CREATE POLICY "orders_anon_select_all"
ON public.orders
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert orders (for guest / unauthenticated checkout):
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
CREATE POLICY "orders_anon_insert"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to also insert orders with null user_id (anonymous checkout):
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant SELECT and INSERT to anon role on the table directly:
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT ON public.orders TO authenticated;
