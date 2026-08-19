-- Fix for Admin Orders View
-- Run this in the Supabase SQL Editor to allow the Admin panel to view orders

-- Drop the broken Admin policy
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Create an RPC to safely fetch all orders for authenticated admins without exposing to anon RLS
CREATE OR REPLACE FUNCTION public.get_all_orders(p_username text, p_password text)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  -- Verify admin credentials
  SELECT * INTO v_admin 
  FROM public.admin_credentials 
  WHERE username = p_username 
    AND password_hash = p_password 
    AND is_active = true;
  
  -- If valid, return all orders
  IF v_admin.id IS NOT NULL THEN
    RETURN QUERY SELECT * FROM public.orders ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;
END;
$$;
