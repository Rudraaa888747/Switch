-- 20260319183000_order_returns.sql
-- Migration to support product return system

-- 1. Create return_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'return_status'
  ) THEN
    CREATE TYPE public.return_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'item_received',
      'processing_refund',
      'refunded',
      'cancelled'
    );
  END IF;
END
$$;

-- 2. Create return_requests table
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_details TEXT,
  status public.return_status NOT NULL DEFAULT 'pending',
  refund_amount INTEGER NOT NULL DEFAULT 0, -- Stored in cents/paisa
  refund_method TEXT,
  admin_notes TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create return_request_items table
CREATE TABLE IF NOT EXISTS public.return_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;

-- 5. Create Security Policies
-- Allow users to view their own return requests
DROP POLICY IF EXISTS "return_requests_select_own" ON public.return_requests;
CREATE POLICY "return_requests_select_own"
ON public.return_requests FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to create their own return requests
DROP POLICY IF EXISTS "return_requests_insert_own" ON public.return_requests;
CREATE POLICY "return_requests_insert_own"
ON public.return_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all return requests
DROP POLICY IF EXISTS "return_requests_admin_select" ON public.return_requests;
CREATE POLICY "return_requests_admin_select"
ON public.return_requests FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow admins to update return requests
DROP POLICY IF EXISTS "return_requests_admin_update" ON public.return_requests;
CREATE POLICY "return_requests_admin_update"
ON public.return_requests FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policies for return_request_items
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

-- 6. Indices for performance
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_request_items_request_id ON public.return_request_items(return_request_id);

-- 7. Automated timestamp update trigger
CREATE TRIGGER update_return_requests_updated_at
BEFORE UPDATE ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_request_items_updated_at
BEFORE UPDATE ON public.return_request_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
