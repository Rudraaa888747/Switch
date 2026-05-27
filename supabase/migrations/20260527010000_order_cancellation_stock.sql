-- Production Hardening: Fix Order Cancellation Stock Restoration
-- This migration updates handle_order_cancellation to atomically restore stock to products.

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
  v_item RECORD;
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

  -- 1. Restore wallet deductions if applicable
  IF COALESCE(v_payment_method, '') ~* '^wallet' OR EXISTS(
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = v_order_owner
      AND type = 'debit'
      AND reference_id IN (v_order_public_id, v_order_row_id::TEXT)
  ) THEN
    SELECT amount
    INTO v_wallet_amount
    FROM public.wallet_transactions
    WHERE user_id = v_order_owner
      AND type = 'debit'
      AND reference_id IN (v_order_public_id, v_order_row_id::TEXT)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_wallet_amount IS NULL THEN
      v_wallet_amount := v_grand_total;
    END IF;
  END IF;

  -- 2. ATOMICALLY RESTORE PRODUCT STOCK FOR ALL ITEMS IN ORDER
  FOR v_item IN (
    SELECT product_id, quantity FROM public.order_items
    WHERE order_id = v_order_row_id
  ) LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 3. Update order status to cancelled
  UPDATE public.orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = v_order_row_id;

  -- 4. Credit wallet if refund was processed
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
