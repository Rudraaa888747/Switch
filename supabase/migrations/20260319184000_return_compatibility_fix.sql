-- Fix for Return System compatibility with legacy and modern orders
-- Run this in your Supabase SQL Editor

-- 1. Drop existing items table to change column type
DROP TABLE IF EXISTS public.return_request_items;

-- 2. Re-create items table with TEXT for order_item_id
-- We use TEXT to support both UUIDs (modern) and composite strings (legacy like "uuid-0")
CREATE TABLE public.return_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL, -- Changed from UUID to TEXT
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Re-enable RLS
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Security Policies
DROP POLICY IF EXISTS "return_items_select_own" ON public.return_request_items;
CREATE POLICY "return_items_select_own"
ON public.return_request_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_request_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "return_items_insert_own" ON public.return_request_items;
CREATE POLICY "return_items_insert_own"
ON public.return_request_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_request_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "return_items_admin_all" ON public.return_request_items;
CREATE POLICY "return_items_admin_all"
ON public.return_request_items FOR ALL
USING (public.is_admin(auth.uid()));

-- 5. Re-create trigger
CREATE TRIGGER update_return_request_items_updated_at
BEFORE UPDATE ON public.return_request_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
