CREATE TABLE IF NOT EXISTS public.checkout_idempotency (
  idempotency_key UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.place_order_idempotent(
  p_idempotency_key UUID,
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_shipping_address TEXT DEFAULT NULL,
  p_shipping_city TEXT DEFAULT NULL,
  p_shipping_state TEXT DEFAULT NULL,
  p_shipping_pincode TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cod',
  p_use_wallet BOOLEAN DEFAULT false,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_inserted BOOLEAN := false;
  v_result JSON;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to place an order';
  END IF;

  INSERT INTO public.checkout_idempotency (idempotency_key, user_id)
  VALUES (p_idempotency_key, v_user_id)
  ON CONFLICT (idempotency_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    SELECT result INTO v_result
    FROM public.checkout_idempotency
    WHERE idempotency_key = p_idempotency_key
      AND user_id = v_user_id;

    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Order placement is still processing';
    END IF;

    RETURN v_result;
  END IF;

  v_result := public.place_order_secure(
    p_items,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address,
    p_shipping_city,
    p_shipping_state,
    p_shipping_pincode,
    p_payment_method,
    p_use_wallet,
    p_coupon_code
  );

  UPDATE public.checkout_idempotency
  SET result = v_result::JSONB
  WHERE idempotency_key = p_idempotency_key
    AND user_id = v_user_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_checkout_idempotency_result(p_idempotency_key UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT result::JSON
  FROM public.checkout_idempotency
  WHERE idempotency_key = p_idempotency_key
    AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.place_order_idempotent FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order_idempotent TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_checkout_idempotency_result FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_idempotency_result TO authenticated, service_role;
