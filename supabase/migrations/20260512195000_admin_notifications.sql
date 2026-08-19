CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'new_order',
      'order_dispatched',
      'return_request',
      'refund',
      'product_added',
      'inventory_low',
      'review_added',
      'coupon_created',
      'campaign_launched'
    )
  ),
  link TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read
  ON public.admin_notifications (read, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admin notifications read" ON public.admin_notifications;
CREATE POLICY "Allow admin notifications read"
  ON public.admin_notifications
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow admin notifications insert" ON public.admin_notifications;
CREATE POLICY "Allow admin notifications insert"
  ON public.admin_notifications
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin notifications update" ON public.admin_notifications;
CREATE POLICY "Allow admin notifications update"
  ON public.admin_notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
