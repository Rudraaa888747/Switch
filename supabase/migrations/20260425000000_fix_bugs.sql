-- Fix payment_mode check constraint to allow combined methods
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_mode_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_mode_check 
  CHECK (payment_mode ~* '^(cod|upi|card|netbanking|wallet|wallet\+.*)$');

-- Create a more robust handle_order_cancellation function
CREATE OR REPLACE FUNCTION handle_order_cancellation(
  p_order_id TEXT,
  p_user_id UUID,
  p_cancelled_by TEXT DEFAULT 'user'
) RETURNS JSON AS $$
DECLARE
  v_payment_method TEXT;
  v_grand_total DECIMAL;
  v_wallet_amount DECIMAL := 0;
  v_order_exists BOOLEAN;
  v_status TEXT;
BEGIN
  -- Check if order exists and get details
  SELECT status, payment_method, total INTO v_status, v_payment_method, v_grand_total
  FROM orders
  WHERE (id = p_order_id OR order_id = p_order_id) AND user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Order is already cancelled');
  END IF;

  -- Determine if wallet was used and how much
  -- Note: This assumes a simple 'wallet+...' or 'wallet' string
  -- In a production app, we would check wallet_transactions table for the debit
  IF v_payment_method ~* '^wallet' THEN
    -- For now, we attempt to find the transaction to get the exact amount
    SELECT amount INTO v_wallet_amount
    FROM wallet_transactions
    WHERE user_id = p_user_id 
      AND reference_id = p_order_id 
      AND type = 'debit'
    LIMIT 1;

    -- Fallback if transaction not found (unlikely but safe)
    IF v_wallet_amount IS NULL AND v_payment_method = 'wallet' THEN
      v_wallet_amount := v_grand_total;
    END IF;
  END IF;

  -- Update order status
  UPDATE orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE (id = p_order_id OR order_id = p_order_id) AND user_id = p_user_id;

  -- Refund wallet if amount > 0
  IF v_wallet_amount > 0 THEN
    PERFORM add_wallet_credit(
      p_user_id,
      v_wallet_amount,
      'refund',
      p_order_id,
      'Refund for cancelled order #' || p_order_id
    );
  END IF;

  RETURN json_build_object(
    'success', true, 
    'refunded_amount', v_wallet_amount,
    'payment_method', v_payment_method
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
