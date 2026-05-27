-- Production-Grade RLS Hardening for SWITCH Platform
-- This migration ensures strict access controls across all essential tables

-- 1. Helper Function to check if user is an active admin (if not already defined)
CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user AND is_active = true
  );
$$;

-- 2. Products Table Hardening
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" 
ON public.products FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Coupons Table Hardening
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons" 
ON public.coupons FOR SELECT 
USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" 
ON public.coupons FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Admin Users Hardening
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_self_or_admin" ON public.admin_users;
CREATE POLICY "admin_users_select_self_or_admin"
ON public.admin_users FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_users_admin_manage" ON public.admin_users;
CREATE POLICY "admin_users_admin_manage"
ON public.admin_users FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5. Profiles & Wallets Hardening
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
WITH CHECK (
  -- Prevent users from modifying their own wallet balance directly
  (auth.uid() = user_id AND (
    (wallet_balance IS NOT DISTINCT FROM (SELECT wallet_balance FROM public.profiles WHERE user_id = auth.uid()))
  ))
  OR public.is_admin(auth.uid())
);

-- Note: We assume wallet_balance is modified ONLY via secure RPCs (like place_order_secure) which bypass RLS via SECURITY DEFINER.

-- 6. Orders Table Hardening
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
-- Removed insert policy because orders should ONLY be created via secure RPCs (place_order_secure)
-- The RPC is SECURITY DEFINER and bypasses RLS. So frontend should NOT be able to insert directly!
-- We allow admins just in case.
CREATE POLICY "Admins can insert orders"
ON public.orders FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders (Cancellation only)"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
WITH CHECK (
  -- Allow users to only change status to 'cancelled' or allow admins full control
  (auth.uid() = user_id AND status = 'cancelled'::public.order_status)
  OR public.is_admin(auth.uid())
);

-- 7. Order Items Table Hardening
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- 8. Storage Buckets Hardening (Requires Supabase Storage schema, typically handled via API but here's SQL)
-- Assuming 'products' and 'avatars' buckets exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    -- Make avatars public to read, but only owner/admin can upload/delete
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    
    DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
    
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE 
    USING (bucket_id = 'avatars' AND auth.uid() = owner);
    
    -- Make products public to read, but only admin can manage
    DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
    CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'products');
    
    DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
    CREATE POLICY "Admins can manage product images" ON storage.objects FOR ALL 
    USING (bucket_id = 'products' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'products' AND public.is_admin(auth.uid()));
  END IF;
END $$;
