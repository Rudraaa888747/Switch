CREATE OR REPLACE FUNCTION public.handle_order_cancellation(p_order_id TEXT, p_user_id UUID, p_cancelled_by TEXT DEFAULT 'user')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id UUID := auth.uid(); v_admin BOOLEAN := auth.role() = 'service_role' OR public.is_admin(auth.uid());
  v_order public.orders%ROWTYPE; v_wallet_amount DECIMAL := 0; v_balance DECIMAL; v_item RECORD;
BEGIN
  IF NOT v_admin AND (v_actor_id IS NULL OR v_actor_id <> p_user_id) THEN RETURN json_build_object('success', false, 'error', 'Not authorized'); END IF;
  SELECT * INTO v_order FROM public.orders WHERE id::TEXT = p_order_id OR order_id = p_order_id LIMIT 1;
  IF NOT FOUND OR (NOT v_admin AND v_order.user_id <> v_actor_id) THEN RETURN json_build_object('success', false, 'error', 'Order not found or not authorized'); END IF;
  IF v_order.status = 'cancelled' THEN RETURN json_build_object('success', false, 'error', 'Order is already cancelled'); END IF;
  SELECT amount INTO v_wallet_amount FROM public.wallet_transactions
    WHERE user_id = v_order.user_id AND type = 'debit' AND reference_id IN (v_order.order_id, v_order.id::TEXT)
    ORDER BY created_at DESC LIMIT 1;
  FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = v_order.id LOOP
    UPDATE public.products SET stock_quantity = stock_quantity + v_item.quantity WHERE id = v_item.product_id;
  END LOOP;
  UPDATE public.orders SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = v_order.id;
  IF COALESCE(v_wallet_amount, 0) > 0 THEN
    SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = v_order.user_id FOR UPDATE;
    UPDATE public.profiles SET wallet_balance = COALESCE(v_balance, 0) + v_wallet_amount WHERE user_id = v_order.user_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type, source, reference_id, description, balance_after)
    VALUES (v_order.user_id, v_wallet_amount, 'credit', 'refund', v_order.order_id, 'Refund for cancelled order #' || v_order.order_id, COALESCE(v_balance, 0) + v_wallet_amount)
    ON CONFLICT (source, reference_id) WHERE source = 'refund' AND reference_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN json_build_object('success', true, 'refunded_amount', COALESCE(v_wallet_amount, 0), 'payment_method', v_order.payment_method);
END; $$;
