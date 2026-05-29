-- Secure order placement that acts as the single source of truth.
-- Validates stock, calculates prices from the products table, applies discounts, and processes wallet payments safely.
-- Secure order placement that acts as the single source of truth.
-- Validates stock, calculates prices from the products table, applies discounts, and processes wallet payments safely.

DROP FUNCTION IF EXISTS public.place_order_secure(
  JSONB,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT
);

CREATE OR REPLACE FUNCTION public.place_order_secure(
  p_items JSONB, -- Array of objects: { product_id: text, quantity: int, size: text, color: text }
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_pincode TEXT,
  p_payment_method TEXT,
  p_use_wallet BOOLEAN DEFAULT false,
  p_coupon_code TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet_balance DECIMAL := 0;
  v_order_id TEXT;
  v_new_order_uuid UUID;
  v_item RECORD;
  
  v_subtotal DECIMAL := 0;
  v_tax DECIMAL := 0;
  v_shipping DECIMAL := 0;
  v_grand_total DECIMAL := 0;
  v_wallet_applied DECIMAL := 0;
  v_remaining_total DECIMAL := 0;
  v_coupon_discount DECIMAL := 0;
  
  v_db_price DECIMAL;
  v_db_name TEXT;
  v_db_image TEXT;
  v_db_stock INTEGER;
  
  v_item_total DECIMAL;
  v_item_tax DECIMAL;
  v_random_str TEXT;
  v_timestamp TEXT;
BEGIN
  -- 1. Authentication Check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to place an order';
  END IF;

  -- 2. Fetch User Wallet Balance
  SELECT COALESCE(wallet_balance, 0) INTO v_wallet_balance FROM public.profiles WHERE user_id = v_user_id;

  -- 3. Calculate Item Prices & Validate Stock
  -- Note: We do this by creating a temporary table or variables, but let's calculate directly.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Fetch product details from DB (Single source of truth)
    SELECT price, name, image_url, stock_quantity 
    INTO v_db_price, v_db_name, v_db_image, v_db_stock
    FROM public.products 
    WHERE id = v_item.value->>'product_id';
    
    IF v_db_price IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item.value->>'product_id';
    END IF;
    
    IF v_db_stock < (v_item.value->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for product: %', v_db_name;
    END IF;
    
    -- Calculate line total
    v_item_total := v_db_price * (v_item.value->>'quantity')::INTEGER;
    v_subtotal := v_subtotal + v_item_total;
    
    -- GST calculation (India standard: <= 2500 is 5%, > 2500 is 18%)
    IF v_db_price <= 2500 THEN
      v_tax := v_tax + (v_item_total * 0.05);
    ELSE
      v_tax := v_tax + (v_item_total * 0.18);
    END IF;
    
    -- Decrement Stock Atomically
    UPDATE public.products 
    SET stock_quantity = stock_quantity - (v_item.value->>'quantity')::INTEGER
    WHERE id = v_item.value->>'product_id';
  END LOOP;

  -- 4. Apply Coupon (If any)
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    DECLARE
      v_coupon_discount_type TEXT;
      v_coupon_discount_value DECIMAL;
      v_coupon_min_order DECIMAL;
      v_coupon_valid BOOLEAN;
    BEGIN
      SELECT discount_type, discount_value, min_order_amount, is_active
      INTO v_coupon_discount_type, v_coupon_discount_value, v_coupon_min_order, v_coupon_valid
      FROM public.coupons
      WHERE code = p_coupon_code AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR current_uses < max_uses);
      
      IF v_coupon_valid = true THEN
        IF v_subtotal >= COALESCE(v_coupon_min_order, 0) THEN
          IF v_coupon_discount_type = 'percentage' THEN
            v_coupon_discount := (v_subtotal * (v_coupon_discount_value / 100.0));
          ELSE
            v_coupon_discount := v_coupon_discount_value;
          END IF;
          
          -- Proportional Tax adjustment after discount
          IF v_subtotal > 0 THEN
            v_tax := v_tax * ((v_subtotal - v_coupon_discount) / v_subtotal);
          END IF;
          
          -- Increment coupon usage
          UPDATE public.coupons SET current_uses = COALESCE(current_uses, 0) + 1 WHERE code = p_coupon_code;
        END IF;
      END IF;
    END;
  END IF;

  v_tax := ROUND(v_tax);
  v_grand_total := v_subtotal - v_coupon_discount + v_tax + v_shipping;
  
  -- 5. Handle Wallet Payment
  IF p_use_wallet = true AND v_wallet_balance > 0 THEN
    v_wallet_applied := LEAST(v_wallet_balance, v_grand_total);
    v_remaining_total := v_grand_total - v_wallet_applied;
    
    -- Deduct from wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - v_wallet_applied
    WHERE user_id = v_user_id;
  ELSE
    v_remaining_total := v_grand_total;
  END IF;
  
  -- 6. Generate Order ID
  v_random_str := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  v_timestamp := RIGHT((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT, 6);
  v_order_id := 'ORD-' || v_timestamp || '-' || v_random_str;

  -- 7. Insert Order
  INSERT INTO public.orders (
    order_id, user_id, status, estimated_delivery, subtotal, tax, shipping, total, 
    items, customer_name, customer_email, customer_phone, shipping_address, 
    shipping_city, shipping_state, shipping_pincode, payment_method
  )
  VALUES (
    v_order_id, v_user_id, 'processing', NOW() + INTERVAL '7 days', 
    v_subtotal, v_tax, v_shipping, v_grand_total, p_items, p_customer_name, 
    p_customer_email, p_customer_phone, p_shipping_address, p_shipping_city, 
    p_shipping_state, p_shipping_pincode, 
    CASE WHEN v_remaining_total = 0 THEN 'wallet' ELSE p_payment_method END
  )
  RETURNING id INTO v_new_order_uuid;

  -- 8. Insert Order Items using DB prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price, name, image_url INTO v_db_price, v_db_name, v_db_image
    FROM public.products WHERE id = v_item.value->>'product_id';
    
    INSERT INTO public.order_items (
      order_id, product_id, product_name, product_image, quantity, 
      unit_price, line_total_amount, variant
    )
    VALUES (
      v_new_order_uuid,
      v_item.value->>'product_id',
      v_db_name,
      v_db_image,
      (v_item.value->>'quantity')::INTEGER,
      v_db_price,
      v_db_price * (v_item.value->>'quantity')::INTEGER,
      jsonb_build_object('size', v_item.value->>'size', 'color', v_item.value->>'color')
    );
  END LOOP;
  
  -- 9. Wallet Transaction record if used
  IF v_wallet_applied > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, amount, type, source, reference_id, description, balance_after
    )
    VALUES (
      v_user_id, v_wallet_applied, 'debit', 'payment', v_order_id, 
      'Wallet payment for order #' || v_order_id, v_wallet_balance - v_wallet_applied
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_uuid', v_new_order_uuid,
    'order_id', v_order_id,
    'grand_total', v_grand_total,
    'remaining_total', v_remaining_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order_secure(JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
