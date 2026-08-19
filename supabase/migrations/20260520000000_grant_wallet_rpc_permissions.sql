-- Grant EXECUTE on wallet RPC functions to anon and authenticated roles
-- This allows admin users to process refunds from the frontend

GRANT EXECUTE ON FUNCTION public.add_wallet_credit TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO anon, authenticated;
