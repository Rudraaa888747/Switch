-- Migration: Add RLS for returns and enable realtime
-- STEP 3: Habilitate Realtime and RLS Policies

-- 1. Enable Realtime
-- Use DO block to handle errors if already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'return_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.return_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'return_request_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.return_request_items;
  END IF;
END $$;

-- 2. Add RLS Policies for return_requests
DROP POLICY IF EXISTS "return_requests_admin_all" ON public.return_requests;
CREATE POLICY "return_requests_admin_all"
ON public.return_requests
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "return_requests_user_select" ON public.return_requests;
CREATE POLICY "return_requests_user_select"
ON public.return_requests
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "return_requests_user_insert" ON public.return_requests;
CREATE POLICY "return_requests_user_insert"
ON public.return_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Add RLS Policies for return_request_items
DROP POLICY IF EXISTS "return_request_items_admin_all" ON public.return_request_items;
CREATE POLICY "return_request_items_admin_all"
ON public.return_request_items
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "return_request_items_user_select" ON public.return_request_items;
CREATE POLICY "return_request_items_user_select"
ON public.return_request_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_request_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "return_request_items_user_insert" ON public.return_request_items;
CREATE POLICY "return_request_items_user_insert"
ON public.return_request_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_request_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);
