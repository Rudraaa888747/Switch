-- Optimized order placement function to handle everything in a single transaction
-- This reduces latency by eliminating multiple round-trips from the frontend

CREATE OR REPLACE FUNCTION public.place_order_v2(
  p_order_id TEXT,
  p_user_id UUID,
  p_status TEXT,
  p_estimated_delivery DATE,
  p_subtotal DECIMAL,
  p_tax DECIMAL,
  p_shipping DECIMAL,
  p_total DECIMAL,
  p_items JSONB, -- Array of items with product_id, name, quantity, price, size, color, image
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_pincode TEXT,
  p_payment_method TEXT,
  p_wallet_amount DECIMAL DEFAULT 0,
  p_coupon_code TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_wallet_balance DECIMAL;
  v_new_order_uuid UUID;
  v_item RECORD;
  v_coupon_uses INTEGER;
BEGIN
  -- 1. Authorization check
  IF v_actor_id IS NULL OR v_actor_id <> p_user_id THEN
    RAISE EXCEPTION 'You must be logged in to place an order';
  END IF;

  -- 2. Wallet Handling (if applicable)
  IF p_wallet_amount > 0 THEN
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) - p_wallet_amount
    WHERE user_id = p_user_id
      AND COALESCE(wallet_balance, 0) >= p_wallet_amount
    RETURNING wallet_balance INTO v_wallet_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    INSERT INTO public.wallet_transactions (
      user_id, amount, type, source, reference_id, description, balance_after
    )
    VALUES (
      p_user_id, p_wallet_amount, 'debit', 'payment', p_order_id, 
      'Wallet payment for order #' || p_order_id, v_wallet_balance
    );
  END IF;

  -- 3. Create Main Order Record
  INSERT INTO public.orders (
    order_id, user_id, status, estimated_delivery, subtotal, tax, shipping, total, 
    items, customer_name, customer_email, customer_phone, shipping_address, 
    shipping_city, shipping_state, shipping_pincode, payment_method
  )
  VALUES (
    p_order_id, p_user_id, p_status::public.order_status, p_estimated_delivery, 
    p_subtotal, p_tax, p_shipping, p_total, p_items, p_customer_name, 
    p_customer_email, p_customer_phone, p_shipping_address, p_shipping_city, 
    p_shipping_state, p_shipping_pincode, p_payment_method
  )
  RETURNING id INTO v_new_order_uuid;

  -- 4. Create Individual Order Items (for modern normalized schema)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image, quantity, 
      unit_price, line_total_amount, variant
    )
    VALUES (
      v_new_order_uuid,
      v_item.value->>'product_id',
      v_item.value->>'product_name',
      v_item.value->>'product_image',
      (v_item.value->>'quantity')::INTEGER,
      (v_item.value->>'price')::INTEGER,
      (v_item.value->>'total_price')::INTEGER,
      jsonb_build_object('size', v_item.value->>'size', 'color', v_item.value->>'color')
    );
  END LOOP;

  -- 5. Update Coupon Usage
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    UPDATE public.coupons
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE code = p_coupon_code
    RETURNING current_uses INTO v_coupon_uses;
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_uuid', v_new_order_uuid,
    'order_id', p_order_id
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.place_order_v2(TEXT, UUID, TEXT, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
