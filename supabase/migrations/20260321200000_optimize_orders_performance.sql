-- Optimize orders table performance and RLS policies
-- This migration fixes slow order placement issues

-- Drop conflicting RLS policies (keeping only essential ones)
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update_all" ON public.orders;
DROP POLICY IF EXISTS "orders_anon_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders by order_id" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can view orders by order_id" ON public.orders;

-- Create optimized RLS policies
CREATE POLICY "orders_select_policy" ON public.orders
FOR SELECT USING (
  auth.uid() = user_id OR
  auth.role() = 'service_role' OR
  (auth.role() = 'anon' AND order_id IS NOT NULL)
);

CREATE POLICY "orders_insert_policy" ON public.orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_update_policy" ON public.orders
FOR UPDATE USING (
  auth.uid() = user_id OR
  auth.role() = 'service_role'
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON public.orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders (status, created_at DESC);

-- Optimize the orders table with better constraints
ALTER TABLE public.orders
ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);

-- Add comments for better performance monitoring
COMMENT ON TABLE public.orders IS 'E-commerce orders with optimized RLS policies for fast checkout';
COMMENT ON INDEX idx_orders_user_id_status IS 'Index for user order queries with status filtering';
COMMENT ON INDEX idx_orders_order_id IS 'Index for order tracking by order_id';