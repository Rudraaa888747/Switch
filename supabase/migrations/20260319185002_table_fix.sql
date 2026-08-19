-- STEP 2: Finalize Tables and Triggers
-- Run this AFTER running Step 1 alone.

-- 1. Create return_requests table (if not exists)
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_details TEXT,
  status public.return_status NOT NULL DEFAULT 'requested',
  refund_amount INTEGER NOT NULL DEFAULT 0,
  refund_method TEXT,
  admin_notes TEXT,
  images TEXT[] DEFAULT '{}',
  estimated_refund_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create return_request_items table (if not exists)
CREATE TABLE IF NOT EXISTS public.return_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Update existing columns if table already existed
ALTER TABLE public.return_requests ADD COLUMN IF NOT EXISTS estimated_refund_date TIMESTAMPTZ;
ALTER TABLE public.return_requests ALTER COLUMN status SET DEFAULT 'requested';

-- 4. Enable RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;

-- 5. Force drop and recreate triggers to avoid "already exists" errors
DROP TRIGGER IF EXISTS update_return_requests_updated_at ON public.return_requests;
CREATE TRIGGER update_return_requests_updated_at
BEFORE UPDATE ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_return_request_items_updated_at ON public.return_request_items;
CREATE TRIGGER update_return_request_items_updated_at
BEFORE UPDATE ON public.return_request_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indices
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
