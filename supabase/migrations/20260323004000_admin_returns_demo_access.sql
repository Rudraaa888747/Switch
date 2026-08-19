-- Demo/admin compatibility for returns in environments where admin
-- auth is local-session based and requests are made with anon/authenticated
-- Supabase keys from the browser.

DROP POLICY IF EXISTS "return_requests_demo_select_all" ON public.return_requests;
CREATE POLICY "return_requests_demo_select_all"
ON public.return_requests
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "return_requests_demo_update_all" ON public.return_requests;
CREATE POLICY "return_requests_demo_update_all"
ON public.return_requests
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "return_request_items_demo_select_all" ON public.return_request_items;
CREATE POLICY "return_request_items_demo_select_all"
ON public.return_request_items
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT, UPDATE ON public.return_requests TO anon, authenticated;
GRANT SELECT ON public.return_request_items TO anon, authenticated;
