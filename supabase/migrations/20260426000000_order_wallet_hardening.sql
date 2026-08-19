CREATE OR REPLACE FUNCTION public.add_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Wallet credit amount must be greater than zero';
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorized to credit wallet balance';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for wallet credit';
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    source,
    reference_id,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'credit',
    p_source,
    p_reference_id,
    p_description,
    v_new_balance
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Wallet debit amount must be greater than zero';
  END IF;

  IF auth.role() <> 'service_role'
    AND v_actor_id <> p_user_id
    AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Not authorized to debit wallet balance';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount
  WHERE user_id = p_user_id
    AND COALESCE(wallet_balance, 0) >= p_amount
  RETURNING wallet_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    source,
    reference_id,
    description,
    balance_after
  )
  VALUES (
    p_user_id,
    p_amount,
    'debit',
    'payment',
    p_reference_id,
    p_description,
    v_new_balance
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.place_order_with_wallet(
  p_order_id TEXT,
  p_user_id UUID,
  p_status TEXT,
  p_estimated_delivery DATE,
  p_subtotal DECIMAL,
  p_tax DECIMAL,
  p_shipping DECIMAL,
  p_total DECIMAL,
  p_items JSONB,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_pincode TEXT,
  p_payment_method TEXT,
  p_wallet_amount DECIMAL DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_wallet_balance DECIMAL;
BEGIN
  IF v_actor_id IS NULL OR v_actor_id <> p_user_id THEN
    RAISE EXCEPTION 'You must be logged in to place an order';
  END IF;

  IF p_wallet_amount IS NULL THEN
    p_wallet_amount := 0;
  END IF;

  IF p_wallet_amount < 0 OR p_wallet_amount > p_total THEN
    RAISE EXCEPTION 'Invalid wallet amount';
  END IF;

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
      user_id,
      amount,
      type,
      source,
      reference_id,
      description,
      balance_after
    )
    VALUES (
      p_user_id,
      p_wallet_amount,
      'debit',
      'payment',
      p_order_id,
      'Wallet payment for order #' || p_order_id,
      v_wallet_balance
    );
  END IF;

  INSERT INTO public.orders (
    order_id,
    user_id,
    status,
    estimated_delivery,
    subtotal,
    tax,
    shipping,
    total,
    items,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_pincode,
    payment_method
  )
  VALUES (
    p_order_id,
    p_user_id,
    p_status::public.order_status,
    p_estimated_delivery,
    p_subtotal,
    p_tax,
    p_shipping,
    p_total,
    p_items,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address,
    p_shipping_city,
    p_shipping_state,
    p_shipping_pincode,
    p_payment_method
  );

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'wallet_applied', p_wallet_amount
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_order_cancellation(
  p_order_id TEXT,
  p_user_id UUID,
  p_cancelled_by TEXT DEFAULT 'user'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_is_admin BOOLEAN := auth.role() = 'service_role' OR public.is_admin(v_actor_id);
  v_order_row_id UUID;
  v_order_public_id TEXT;
  v_order_owner UUID;
  v_payment_method TEXT;
  v_grand_total DECIMAL;
  v_status TEXT;
  v_wallet_amount DECIMAL := 0;
BEGIN
  IF NOT v_actor_is_admin AND (v_actor_id IS NULL OR v_actor_id <> p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id, order_id, user_id, status, payment_method, total
  INTO v_order_row_id, v_order_public_id, v_order_owner, v_status, v_payment_method, v_grand_total
  FROM public.orders
  WHERE id::TEXT = p_order_id OR order_id = p_order_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF NOT v_actor_is_admin AND v_order_owner <> v_actor_id THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Order is already cancelled');
  END IF;

  IF COALESCE(v_payment_method, '') ~* '^wallet' THEN
    SELECT amount
    INTO v_wallet_amount
    FROM public.wallet_transactions
    WHERE user_id = v_order_owner
      AND type = 'debit'
      AND reference_id IN (v_order_public_id, v_order_row_id::TEXT)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_wallet_amount IS NULL AND v_payment_method = 'wallet' THEN
      v_wallet_amount := v_grand_total;
    END IF;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = v_order_row_id;

  IF COALESCE(v_wallet_amount, 0) > 0 THEN
    PERFORM public.add_wallet_credit(
      v_order_owner,
      v_wallet_amount,
      'refund',
      v_order_public_id,
      'Refund for cancelled order #' || v_order_public_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'refunded_amount', COALESCE(v_wallet_amount, 0),
    'payment_method', v_payment_method
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.add_wallet_credit(UUID, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_order_with_wallet(TEXT, UUID, TEXT, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_order_cancellation(TEXT, UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.add_wallet_credit(UUID, DECIMAL, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_order_with_wallet(TEXT, UUID, TEXT, DATE, DECIMAL, DECIMAL, DECIMAL, DECIMAL, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_order_cancellation(TEXT, UUID, TEXT) TO authenticated, service_role;
