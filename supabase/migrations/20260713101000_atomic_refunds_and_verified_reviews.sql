CREATE UNIQUE INDEX IF NOT EXISTS wallet_refund_reference_unique
ON public.wallet_transactions (source, reference_id)
WHERE source = 'refund' AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_return_refund(
  p_user_id UUID, p_amount DECIMAL, p_reference_id TEXT, p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance DECIMAL; v_transaction_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Refund amount must be positive'; END IF;
  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, type, source, reference_id, description, balance_after)
  VALUES (p_user_id, p_amount, 'credit', 'refund', p_reference_id, p_description, v_balance + p_amount)
  ON CONFLICT (source, reference_id) WHERE source = 'refund' AND reference_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_transaction_id;
  IF v_transaction_id IS NULL THEN RETURN false; END IF;
  UPDATE public.profiles SET wallet_balance = v_balance + p_amount WHERE user_id = p_user_id;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.credit_return_refund(UUID, DECIMAL, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_review_verified_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.is_verified_purchase := EXISTS (
    SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = NEW.user_id AND oi.product_id = NEW.product_id AND o.status = 'delivered'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS reviews_set_verified_purchase ON public.reviews;
CREATE TRIGGER reviews_set_verified_purchase BEFORE INSERT OR UPDATE OF user_id, product_id
ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_review_verified_purchase();
