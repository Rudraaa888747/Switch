-- ============================================================
-- Migration: Fix Guest Checkout
-- - Allows anon role to execute place_order_secure
-- - Removes strict login requirement for guests
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_order_secure(
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
  v_actor_id UUID := auth.uid();
  v_item JSONB;
  v_product_id TEXT;
  v_quantity INTEGER;
  v_size TEXT;
  v_color TEXT;

  -- Product info cache
  v_db_price DECIMAL;
  v_db_name TEXT;
  v_db_image TEXT;
  v_db_stock INTEGER;
  v_new_stock INTEGER;

  -- Order financials
  v_subtotal DECIMAL := 0;
  v_estimated_tax DECIMAL := 0;
  v_tax DECIMAL;
  v_total DECIMAL;
  v_wallet_balance DECIMAL := 0;
  v_wallet_deducted DECIMAL := 0;

  -- Coupon
  v_coupon_discount DECIMAL := 0;
  v_coupon_type TEXT;
  v_coupon_value DECIMAL;
  v_coupon_min_order DECIMAL;

  -- Order
  v_order_id TEXT;
  v_order_uuid UUID;
  v_estimated_delivery DATE;

  -- Item data for order_items insert
  v_item_rows JSONB := '[]'::JSONB;
  v_item_rec RECORD;
BEGIN
  -- ── Auth check ──────────────────────────────────────────
  -- Guest checkout is allowed. v_actor_id can be NULL.
  -- The frontend handles email validation.

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- ── Generate order ID ────────────────────────────────────
  v_order_id := 'ORD-' || upper(substring(gen_random_uuid()::TEXT, 1, 8));
  v_estimated_delivery := CURRENT_DATE + INTERVAL '5 days';

  -- ── Phase 1: Validate items + ATOMIC stock decrement ────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := v_item->>'product_id';
    v_quantity   := (v_item->>'quantity')::INTEGER;
    v_size       := COALESCE(v_item->>'size', 'OS');
    v_color      := COALESCE(v_item->>'color', 'Default');

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_product_id;
    END IF;

    -- Fetch product data for price validation
    SELECT price, name, image_url, stock_quantity
    INTO v_db_price, v_db_name, v_db_image, v_db_stock
    FROM public.products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;

    IF v_db_price IS NULL OR v_db_price <= 0 THEN
      RAISE EXCEPTION 'Invalid price for product: %', v_db_name;
    END IF;

    -- ATOMIC conditional decrement — prevents race conditions
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_quantity
    WHERE id = v_product_id
      AND stock_quantity >= v_quantity
    RETURNING stock_quantity INTO v_new_stock;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Please reduce quantity.', v_db_name;
    END IF;

    -- Accumulate subtotal using DB price (not client price)
    v_subtotal := v_subtotal + (v_db_price * v_quantity);

    -- Standard Indian Apparel GST: 5% for price <= 1000, 12% for price > 1000
    IF v_db_price <= 1000 THEN
      v_estimated_tax := v_estimated_tax + (v_db_price * v_quantity * 0.05);
    ELSE
      v_estimated_tax := v_estimated_tax + (v_db_price * v_quantity * 0.12);
    END IF;

    -- Cache item data for order_items insert
    v_item_rows := v_item_rows || jsonb_build_object(
      'product_id', v_product_id,
      'quantity', v_quantity,
      'size', v_size,
      'color', v_color,
      'price', v_db_price,
      'name', v_db_name,
      'image_url', v_db_image
    );
  END LOOP;

  -- ── Phase 2: Coupon validation (server-side, strict) ────
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT discount_type, discount_value, min_order_amount
    INTO v_coupon_type, v_coupon_value, v_coupon_min_order
    FROM public.coupons
    WHERE code = upper(trim(p_coupon_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR current_uses < max_uses);

    IF FOUND THEN
      IF v_coupon_min_order IS NOT NULL AND v_subtotal < v_coupon_min_order THEN
        RAISE EXCEPTION 'Minimum order amount for this coupon is ₹%', v_coupon_min_order;
      END IF;

      IF v_coupon_type = 'percentage' THEN
        v_coupon_discount := ROUND((v_subtotal * v_coupon_value / 100)::NUMERIC, 2);
      ELSE
        v_coupon_discount := LEAST(v_coupon_value, v_subtotal);
      END IF;

      -- Increment coupon usage counter
      UPDATE public.coupons SET current_uses = COALESCE(current_uses, 0) + 1
      WHERE code = upper(trim(p_coupon_code));
    END IF;
  END IF;

  -- ── Phase 3: Calculate totals ────────────────────────────
  IF v_subtotal > 0 THEN
    v_tax := ROUND((v_estimated_tax * ((v_subtotal - v_coupon_discount) / v_subtotal))::NUMERIC, 2);
  ELSE
    v_tax := 0;
  END IF;
  
  v_total := ROUND((v_subtotal - v_coupon_discount + v_tax)::NUMERIC, 2);

  -- ── Phase 4: Wallet deduction (if requested) ─────────────
  IF p_use_wallet AND v_total > 0 THEN
    IF v_actor_id IS NULL THEN
      RAISE EXCEPTION 'You must be logged in to use wallet balance';
    END IF;

    SELECT COALESCE(wallet_balance, 0) INTO v_wallet_balance
    FROM public.profiles
    WHERE user_id = v_actor_id;

    IF v_wallet_balance > 0 THEN
      v_wallet_deducted := LEAST(v_wallet_balance, v_total);

      UPDATE public.profiles
      SET wallet_balance = wallet_balance - v_wallet_deducted
      WHERE user_id = v_actor_id
        AND COALESCE(wallet_balance, 0) >= v_wallet_deducted
      RETURNING wallet_balance INTO v_wallet_balance;

      IF NOT FOUND THEN
        v_wallet_deducted := 0; -- Wallet changed between check and update — skip
      ELSE
        INSERT INTO public.wallet_transactions (
          user_id, amount, type, source, reference_id, description, balance_after
        ) VALUES (
          v_actor_id,
          v_wallet_deducted,
          'debit',
          'payment',
          v_order_id,
          'Wallet payment for order #' || v_order_id,
          v_wallet_balance
        );
      END IF;
    END IF;
  END IF;

  -- ── Phase 5: Insert order ─────────────────────────────────
  INSERT INTO public.orders (
    order_id,
    user_id,
    status,
    estimated_delivery,
    subtotal,
    tax,
    shipping,
    total,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    payment_method,
    coupon_code,
    discount,
    wallet_amount
  ) VALUES (
    v_order_id,
    v_actor_id,
    'pending',
    v_estimated_delivery,
    v_subtotal,
    v_tax,
    0,
    v_total,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    jsonb_build_object('line1', p_shipping_address, 'city', p_shipping_city, 'state', p_shipping_state, 'pincode', p_shipping_pincode),
    p_shipping_city,
    p_shipping_state,
    p_shipping_pincode,
    p_payment_method,
    NULLIF(p_coupon_code, ''),
    v_coupon_discount,
    v_wallet_deducted
  )
  RETURNING id INTO v_order_uuid;

  -- ── Phase 6: Insert order_items (reuse cached item data) ─
  FOR v_item_rec IN SELECT * FROM jsonb_array_elements(v_item_rows) LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      size,
      color,
      price,
      name,
      image_url
    ) VALUES (
      v_order_uuid,
      v_item_rec.value->>'product_id',
      (v_item_rec.value->>'quantity')::INTEGER,
      v_item_rec.value->>'size',
      v_item_rec.value->>'color',
      (v_item_rec.value->>'price')::DECIMAL,
      v_item_rec.value->>'name',
      v_item_rec.value->>'image_url'
    );
  END LOOP;

  -- ── Phase 7: Clear cart ───────────────────────────────────
  IF v_actor_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE user_id = v_actor_id;
  END IF;

  -- ── Phase 8: Create admin notification (server-side) ─────
  INSERT INTO public.admin_notifications (
    title,
    message,
    type,
    event_type,
    link,
    metadata
  ) VALUES (
    'New order received',
    p_customer_name || ' placed ' || v_order_id || ' for ₹' || v_total::TEXT,
    'info',
    'new_order',
    '/admin/orders',
    jsonb_build_object(
      'orderId', v_order_id,
      'total', v_total,
      'paymentMethod', p_payment_method
    )
  );

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'grand_total', v_total,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'discount', v_coupon_discount,
    'wallet_applied', v_wallet_deducted
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with clean message (stock decrements already rolled back by transaction)
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- ── Grant execute to anon and authenticated ──
-- Revoke all first to reset permissions
REVOKE ALL ON FUNCTION public.place_order_secure FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_order_secure TO authenticated, service_role, anon;
