-- Reconcile historical order schema variants (legacy + modern) into a
-- single compatibility shape used by the current frontend/admin code paths.
-- This migration is intentionally additive and idempotent.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_pincode TEXT,
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery DATE;

DO $$
DECLARE
  has_order_number BOOLEAN;
  has_shipping_address_jsonb BOOLEAN;
  has_estimated_delivery_at BOOLEAN;
  has_subtotal_amount BOOLEAN;
  has_tax_amount BOOLEAN;
  has_shipping_amount BOOLEAN;
  has_grand_total_amount BOOLEAN;
  has_order_items BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_number'
  ) INTO has_order_number;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'shipping_address'
      AND udt_name = 'jsonb'
  ) INTO has_shipping_address_jsonb;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'estimated_delivery_at'
  ) INTO has_estimated_delivery_at;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'subtotal_amount'
  ) INTO has_subtotal_amount;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'tax_amount'
  ) INTO has_tax_amount;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'shipping_amount'
  ) INTO has_shipping_amount;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'grand_total_amount'
  ) INTO has_grand_total_amount;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
  ) INTO has_order_items;

  IF has_order_number THEN
    EXECUTE '
      UPDATE public.orders
      SET order_id = COALESCE(order_id, order_number)
      WHERE order_id IS NULL
    ';
  END IF;

  IF has_shipping_address_jsonb THEN
    EXECUTE '
      UPDATE public.orders
      SET
        shipping_city = COALESCE(shipping_city, shipping_address::jsonb ->> ''city''),
        shipping_state = COALESCE(shipping_state, shipping_address::jsonb ->> ''state''),
        shipping_pincode = COALESCE(shipping_pincode, shipping_address::jsonb ->> ''postal_code'')
      WHERE shipping_city IS NULL
         OR shipping_state IS NULL
         OR shipping_pincode IS NULL
    ';
  END IF;

  IF has_estimated_delivery_at THEN
    EXECUTE '
      UPDATE public.orders
      SET estimated_delivery = COALESCE(estimated_delivery, estimated_delivery_at::date)
      WHERE estimated_delivery IS NULL
        AND estimated_delivery_at IS NOT NULL
    ';
  END IF;

  IF has_subtotal_amount THEN
    EXECUTE '
      UPDATE public.orders
      SET subtotal = COALESCE(subtotal, subtotal_amount, 0)
      WHERE subtotal IS NULL OR subtotal = 0
    ';
  END IF;

  IF has_tax_amount THEN
    EXECUTE '
      UPDATE public.orders
      SET tax = COALESCE(tax, tax_amount, 0)
      WHERE tax IS NULL OR tax = 0
    ';
  END IF;

  IF has_shipping_amount THEN
    EXECUTE '
      UPDATE public.orders
      SET shipping = COALESCE(shipping, shipping_amount, 0)
      WHERE shipping IS NULL OR shipping = 0
    ';
  END IF;

  IF has_grand_total_amount THEN
    EXECUTE '
      UPDATE public.orders
      SET total = COALESCE(total, grand_total_amount, subtotal + tax + shipping, 0)
      WHERE total IS NULL OR total = 0
    ';
  END IF;

  IF has_order_items THEN
    EXECUTE '
      UPDATE public.orders o
      SET items = COALESCE(src.items, ''[]''::jsonb)
      FROM (
        SELECT
          oi.order_id,
          jsonb_agg(
            jsonb_build_object(
              ''id'', oi.id,
              ''product_id'', oi.product_id,
              ''product_name'', oi.product_name,
              ''product_image'', oi.product_image,
              ''quantity'', oi.quantity,
              ''total_price'', oi.line_total_amount
            )
            ORDER BY oi.created_at ASC
          ) AS items
        FROM public.order_items oi
        GROUP BY oi.order_id
      ) src
      WHERE o.id = src.order_id
        AND (o.items IS NULL OR jsonb_typeof(o.items) <> ''array'' OR jsonb_array_length(o.items) = 0)
    ';
  END IF;
END
$$;

UPDATE public.orders
SET status = 'processing'
WHERE status IS NULL;

UPDATE public.orders
SET order_id = 'ORD-' || left(replace(id::text, '-', ''), 12)
WHERE order_id IS NULL OR length(trim(order_id)) = 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_id_unique
ON public.orders (order_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc_compat
ON public.orders (created_at DESC);
