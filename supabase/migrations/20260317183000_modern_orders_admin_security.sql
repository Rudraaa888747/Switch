-- Modernize order storage and add production-grade admin security primitives.
-- This migration is written to be idempotent where practical and to preserve
-- legacy data by renaming the previous orders table before creating the new schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_status'
  ) THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'payment_status'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'partially_refunded'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'admin_role'
  ) THEN
    CREATE TYPE public.admin_role AS ENUM (
      'support',
      'ops',
      'manager',
      'super_admin'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'support',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active_role
ON public.admin_users (is_active, role);

CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = check_user
      AND is_active = true
  );
$$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_self_or_admin" ON public.admin_users;
CREATE POLICY "admin_users_select_self_or_admin"
ON public.admin_users
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "admin_users_admin_manage" ON public.admin_users;
CREATE POLICY "admin_users_admin_manage"
ON public.admin_users
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DO $$
DECLARE
  has_orders_table BOOLEAN;
  has_order_number_column BOOLEAN;
  has_items_column BOOLEAN;
  has_product_id_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  )
  INTO has_orders_table;

  IF NOT has_orders_table THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_number'
  )
  INTO has_order_number_column;

  IF has_order_number_column THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'items'
  )
  INTO has_items_column;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'product_id'
  )
  INTO has_product_id_column;

  IF has_items_column AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_order_json'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_order_json;
  ELSIF has_product_id_column AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_line_items'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_line_items;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_backup'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_backup;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount INTEGER NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  grand_total_amount INTEGER NOT NULL DEFAULT 0 CHECK (grand_total_amount >= 0),
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_method TEXT,
  order_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  sku TEXT,
  variant JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total_amount INTEGER NOT NULL DEFAULT 0 CHECK (line_total_amount >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
ON public.orders (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_order_number
ON public.orders (order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON public.order_items (product_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_orders_updated_at_modern'
  ) THEN
    CREATE TRIGGER update_orders_updated_at_modern
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_order_items_updated_at'
  ) THEN
    CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_order_json'
  ) THEN
    INSERT INTO public.orders (
      id,
      order_number,
      user_id,
      status,
      payment_status,
      currency_code,
      subtotal_amount,
      discount_amount,
      tax_amount,
      shipping_amount,
      grand_total_amount,
      item_count,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      payment_method,
      metadata,
      placed_at,
      estimated_delivery_at,
      cancelled_at,
      created_at,
      updated_at
    )
    SELECT
      legacy.id,
      COALESCE(NULLIF(legacy.order_id, ''), 'LEGACY-' || left(legacy.id::text, 8)),
      legacy.user_id,
      CASE lower(COALESCE(legacy.status, ''))
        WHEN 'confirmed' THEN 'pending'::public.order_status
        WHEN 'processing' THEN 'processing'::public.order_status
        WHEN 'shipped' THEN 'shipped'::public.order_status
        WHEN 'out_for_delivery' THEN 'out_for_delivery'::public.order_status
        WHEN 'delivered' THEN 'delivered'::public.order_status
        WHEN 'cancelled' THEN 'cancelled'::public.order_status
        ELSE 'pending'::public.order_status
      END,
      CASE
        WHEN lower(COALESCE(legacy.payment_method, '')) = 'cod' THEN 'pending'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      'INR',
      COALESCE(legacy.subtotal, 0),
      GREATEST(COALESCE(legacy.subtotal, 0) + COALESCE(legacy.tax, 0) + COALESCE(legacy.shipping, 0) - COALESCE(legacy.total, 0), 0),
      COALESCE(legacy.tax, 0),
      COALESCE(legacy.shipping, 0),
      COALESCE(legacy.total, 0),
      COALESCE(jsonb_array_length(COALESCE(legacy.items, '[]'::jsonb)), 0),
      COALESCE(NULLIF(legacy.customer_name, ''), 'Guest Customer'),
      NULLIF(legacy.customer_email, ''),
      NULLIF(legacy.customer_phone, ''),
      jsonb_strip_nulls(
        jsonb_build_object(
          'line1', NULLIF(legacy.shipping_address, ''),
          'city', NULLIF(legacy.shipping_city, ''),
          'state', NULLIF(legacy.shipping_state, ''),
          'postal_code', NULLIF(legacy.shipping_pincode, ''),
          'country', 'IN'
        )
      ),
      jsonb_strip_nulls(
        jsonb_build_object(
          'line1', NULLIF(legacy.shipping_address, ''),
          'city', NULLIF(legacy.shipping_city, ''),
          'state', NULLIF(legacy.shipping_state, ''),
          'postal_code', NULLIF(legacy.shipping_pincode, ''),
          'country', 'IN'
        )
      ),
      NULLIF(legacy.payment_method, ''),
      jsonb_build_object('migrated_from', 'orders_legacy_order_json'),
      COALESCE(legacy.created_at, now()),
      CASE
        WHEN legacy.estimated_delivery IS NOT NULL THEN legacy.estimated_delivery::timestamptz
        ELSE NULL
      END,
      NULL,
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_order_json AS legacy
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      discount_amount,
      line_total_amount,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      legacy.id,
      COALESCE(item.value->>'product_id', item.value->>'id', md5(legacy.id::text || COALESCE(item.value->>'name', 'item'))),
      COALESCE(item.value->>'product_name', item.value->>'name', 'Order item'),
      COALESCE(item.value->>'product_image', item.value->>'image'),
      GREATEST(COALESCE((item.value->>'quantity')::INTEGER, 1), 1),
      CASE
        WHEN COALESCE((item.value->>'quantity')::INTEGER, 1) > 0 THEN
          COALESCE((item.value->>'price')::INTEGER, (item.value->>'total_price')::INTEGER, 0)
          / GREATEST(COALESCE((item.value->>'quantity')::INTEGER, 1), 1)
        ELSE 0
      END,
      0,
      COALESCE((item.value->>'total_price')::INTEGER, (item.value->>'price')::INTEGER, 0),
      jsonb_build_object('legacy_payload', item.value),
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_order_json AS legacy
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(legacy.items, '[]'::jsonb)) AS item(value)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_line_items'
  ) THEN
    INSERT INTO public.orders (
      id,
      order_number,
      user_id,
      status,
      payment_status,
      currency_code,
      subtotal_amount,
      discount_amount,
      tax_amount,
      shipping_amount,
      grand_total_amount,
      item_count,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      payment_method,
      metadata,
      placed_at,
      estimated_delivery_at,
      cancelled_at,
      created_at,
      updated_at
    )
    SELECT
      MIN(legacy.id::text)::uuid,
      COALESCE('LEGACY-' || left(MIN(legacy.id::text), 8)),
      legacy.user_id,
      CASE lower(COALESCE(MAX(legacy.status), ''))
        WHEN 'order placed' THEN 'pending'::public.order_status
        WHEN 'processing' THEN 'processing'::public.order_status
        WHEN 'shipped' THEN 'shipped'::public.order_status
        WHEN 'out for delivery' THEN 'out_for_delivery'::public.order_status
        WHEN 'delivered' THEN 'delivered'::public.order_status
        WHEN 'cancelled' THEN 'cancelled'::public.order_status
        ELSE 'pending'::public.order_status
      END,
      'paid'::public.payment_status,
      'INR',
      SUM(COALESCE(legacy.total_price, 0)),
      0,
      0,
      0,
      SUM(COALESCE(legacy.total_price, 0)),
      SUM(COALESCE(legacy.quantity, 1)),
      'Guest Customer',
      NULL,
      NULL,
      '{}'::jsonb,
      '{}'::jsonb,
      'manual',
      jsonb_build_object('migrated_from', 'orders_legacy_line_items'),
      COALESCE(MIN(legacy.order_date), MIN(legacy.created_at), now()),
      CASE
        WHEN MAX(legacy.estimated_delivery_date) IS NOT NULL THEN MAX(legacy.estimated_delivery_date)::timestamptz
        ELSE NULL
      END,
      MAX(legacy.cancelled_at),
      COALESCE(MIN(legacy.created_at), now()),
      COALESCE(MAX(legacy.updated_at), MAX(legacy.created_at), now())
    FROM public.orders_legacy_line_items AS legacy
    GROUP BY legacy.id, legacy.user_id
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      discount_amount,
      line_total_amount,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      orders_new.id,
      COALESCE(NULLIF(legacy.product_id, ''), md5(orders_new.id::text || COALESCE(legacy.product_name, 'item'))),
      COALESCE(NULLIF(legacy.product_name, ''), 'Order item'),
      NULL,
      GREATEST(COALESCE(legacy.quantity, 1), 1),
      CASE
        WHEN COALESCE(legacy.quantity, 1) > 0 THEN COALESCE(legacy.total_price, 0) / GREATEST(legacy.quantity, 1)
        ELSE 0
      END,
      0,
      COALESCE(legacy.total_price, 0),
      jsonb_build_object('migrated_from', 'orders_legacy_line_items'),
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_line_items AS legacy
    JOIN public.orders AS orders_new
      ON orders_new.order_number = 'LEGACY-' || left(legacy.id::text, 8)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "orders_admin_select_all" ON public.orders;
CREATE POLICY "orders_admin_select_all"
ON public.orders
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "orders_admin_update_all" ON public.orders;
CREATE POLICY "orders_admin_update_all"
ON public.orders
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_admin_select_all" ON public.order_items;
CREATE POLICY "order_items_admin_select_all"
ON public.order_items
FOR SELECT
USING (public.is_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_fetch_orders(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status public.order_status DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  user_id UUID,
  status public.order_status,
  payment_status public.payment_status,
  currency_code TEXT,
  subtotal_amount INTEGER,
  discount_amount INTEGER,
  tax_amount INTEGER,
  shipping_amount INTEGER,
  grand_total_amount INTEGER,
  item_count INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  payment_method TEXT,
  order_notes TEXT,
  metadata JSONB,
  placed_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    orders.id,
    orders.order_number,
    orders.user_id,
    orders.status,
    orders.payment_status,
    orders.currency_code,
    orders.subtotal_amount,
    orders.discount_amount,
    orders.tax_amount,
    orders.shipping_amount,
    orders.grand_total_amount,
    orders.item_count,
    orders.customer_name,
    orders.customer_email,
    orders.customer_phone,
    orders.shipping_address,
    orders.billing_address,
    orders.payment_method,
    orders.order_notes,
    orders.metadata,
    orders.placed_at,
    orders.estimated_delivery_at,
    orders.delivered_at,
    orders.cancelled_at,
    orders.created_at,
    orders.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', order_items.id,
          'product_id', order_items.product_id,
          'product_name', order_items.product_name,
          'product_image', order_items.product_image,
          'sku', order_items.sku,
          'variant', order_items.variant,
          'quantity', order_items.quantity,
          'unit_price', order_items.unit_price,
          'discount_amount', order_items.discount_amount,
          'line_total_amount', order_items.line_total_amount
        )
        ORDER BY order_items.created_at ASC
      ) FILTER (WHERE order_items.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM public.orders
  LEFT JOIN public.order_items
    ON order_items.order_id = orders.id
  WHERE
    (p_status IS NULL OR orders.status = p_status)
    AND (
      p_search IS NULL
      OR orders.order_number ILIKE '%' || p_search || '%'
      OR COALESCE(orders.customer_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(orders.customer_email, '') ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1
        FROM public.order_items AS search_items
        WHERE search_items.order_id = orders.id
          AND search_items.product_name ILIKE '%' || p_search || '%'
      )
    )
  GROUP BY orders.id
  ORDER BY orders.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status public.order_status,
  p_estimated_delivery_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_order public.orders;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    estimated_delivery_at = COALESCE(p_estimated_delivery_at, estimated_delivery_at),
    delivered_at = CASE
      WHEN p_status = 'delivered' THEN now()
      ELSE delivered_at
    END,
    cancelled_at = CASE
      WHEN p_status = 'cancelled' THEN COALESCE(cancelled_at, now())
      ELSE cancelled_at
    END
  WHERE id = p_order_id
  RETURNING * INTO updated_order;

  IF updated_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN updated_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_fetch_orders(INTEGER, INTEGER, public.order_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, public.order_status, TIMESTAMPTZ) TO authenticated, service_role;
