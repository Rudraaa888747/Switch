-- Fix Product Reviews RLS and add purchase verification helper

-- 1. Enable deletion for admins via public.is_admin()
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
FOR DELETE USING (
  auth.uid() = user_id 
  OR public.is_admin(auth.uid())
);

-- 2. Ensure Anyone can view reviews (Select policy)
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
FOR SELECT USING (true);

-- 3. Ensure Users can insert their own reviews
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Add helper function to check if a user purchased a product
-- This helps the frontend or database trigger set is_verified_purchase
CREATE OR REPLACE FUNCTION public.check_user_purchased_product(p_user_id UUID, p_product_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
      AND oi.product_id = p_product_id
      AND o.status = 'delivered'
  );
END;
$$;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_user_purchased_product(UUID, TEXT) TO authenticated, service_role;
