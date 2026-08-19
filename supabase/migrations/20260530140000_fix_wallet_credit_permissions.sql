-- Fix permissions for add_wallet_credit
-- The function already contains a robust auth.uid() and is_admin() check internally:
-- IF auth.role() <> 'service_role' AND NOT public.is_admin(v_actor_id) THEN RAISE EXCEPTION ...
-- Therefore, it is safe to allow authenticated users to call it (it will reject non-admins).

GRANT EXECUTE ON FUNCTION public.add_wallet_credit(UUID, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
