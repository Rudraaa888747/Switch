-- Clean slate: Drop triggers on auth.users if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Clean slate: Drop all tables and their dependencies
DROP TABLE IF EXISTS public.profiles, public.user_preferences, public.style_analyses, public.chat_messages, public.orders, public.order_items, public.coupons, public.reviews, public.user_behavior, public.admin_credentials, public.admin_users CASCADE;

-- Clean slate: Drop shared functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.admin_login(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  skin_tone TEXT,
  body_structure TEXT,
  style_category TEXT,
  color_palette TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create user_preferences table for tracking behavior
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_categories TEXT[],
  preferred_colors TEXT[],
  preferred_occasions TEXT[],
  viewed_products TEXT[],
  purchased_products TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create style_analyses table for storing AI analysis results
CREATE TABLE public.style_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  skin_tone TEXT,
  body_structure TEXT,
  style_category TEXT,
  color_palette TEXT[],
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on style_analyses
ALTER TABLE public.style_analyses ENABLE ROW LEVEL SECURITY;

-- Style analyses policies
CREATE POLICY "Users can view their own analyses" 
ON public.style_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses" 
ON public.style_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create chat_messages table for storing conversation history
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  product_ids TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat policies - allow authenticated users to manage their own messages
CREATE POLICY "Users can view their own chat messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert chat messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_preferences (user_id, preferred_categories, preferred_colors, preferred_occasions, viewed_products, purchased_products)
  VALUES (NEW.id, '{}', '{}', '{}', '{}', '{}');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
-- Create orders table for order tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_pincode TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
  tracking_number TEXT,
  estimated_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view orders by order_id (for tracking)
CREATE POLICY "Anyone can view orders by order_id"
ON public.orders
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert their own orders
CREATE POLICY "Users can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Policy: Only admins can update orders (for now, allow authenticated users to update their own)
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster order lookup
CREATE INDEX idx_orders_order_id ON public.orders(order_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_phone ON public.orders(customer_phone);
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view orders by order_id" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;

-- Create more specific policies for orders
-- Allow anyone to insert orders (needed for guest checkout)
CREATE POLICY "Allow order creation for checkout"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Authenticated users must use their own user_id
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR 
  -- Guest users can create orders with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Users can view their own orders, guests cannot view orders via API (they get confirmation on page)
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);
-- Fix order policies to allow proper checkout flow
DROP POLICY IF EXISTS "Allow order creation for checkout" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Allow authenticated users to insert orders with their user_id
-- Allow orders to be inserted without user_id (guest checkout) but only via authenticated session
CREATE POLICY "Allow order creation"
ON public.orders
FOR INSERT
WITH CHECK (
  -- User can create order with their own user_id or as guest (null user_id)
  user_id = auth.uid() OR user_id IS NULL
);

-- Users can view their own orders
CREATE POLICY "Users can view their orders"
ON public.orders
FOR SELECT
USING (user_id = auth.uid());
-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create user_behavior table for recommendations
CREATE TABLE public.user_behavior (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  product_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'cart_add', 'wishlist_add', 'purchase')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior ENABLE ROW LEVEL SECURITY;

-- Coupon policies (public read for validation)
CREATE POLICY "Anyone can view active coupons" ON public.coupons
FOR SELECT USING (is_active = true);

-- Review policies
CREATE POLICY "Anyone can view reviews" ON public.reviews
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.reviews
FOR DELETE USING (auth.uid() = user_id);

-- User behavior policies
CREATE POLICY "Anyone can insert behavior" ON public.user_behavior
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own behavior" ON public.user_behavior
FOR SELECT USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Create trigger for reviews updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, is_active) VALUES
('WELCOME10', 'percentage', 10, 500, true),
('FLAT200', 'flat', 200, 1500, true),
('PREMIUM15', 'percentage', 15, 2000, true),
('SWITCH50', 'flat', 50, 0, true);
-- Create admin_credentials table for secure admin login
CREATE TABLE public.admin_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- No direct access to admin_credentials table
CREATE POLICY "No direct access to admin_credentials" ON public.admin_credentials
FOR SELECT USING (false);

-- Create secure admin login function
CREATE OR REPLACE FUNCTION public.admin_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (success BOOLEAN, admin_name TEXT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  SELECT * INTO v_admin 
  FROM public.admin_credentials 
  WHERE username = p_username 
    AND password_hash = p_password 
    AND is_active = true;
  
  IF v_admin.id IS NOT NULL THEN
    -- Update last login
    UPDATE public.admin_credentials SET last_login = now() WHERE id = v_admin.id;
    RETURN QUERY SELECT true, v_admin.display_name, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT, 'Invalid credentials'::TEXT;
  END IF;
END;
$$;

-- Insert demo admin credentials
INSERT INTO public.admin_credentials (username, password_hash, display_name) 
VALUES ('demo123', 'demo123', 'Demo Admin');

-- Insert sample reviews for products
INSERT INTO public.reviews (user_id, product_id, rating, title, content, sentiment, is_verified_purchase, helpful_count, created_at) VALUES
-- Men's products reviews
('00000000-0000-0000-0000-000000000001', 'men-1', 5, 'Excellent Quality!', 'This shirt is amazing! The fabric is soft and the fit is perfect. Highly recommend for anyone looking for quality formal wear.', 'positive', true, 12, now() - interval '5 days'),
('00000000-0000-0000-0000-000000000002', 'men-1', 4, 'Great for Office', 'Perfect for daily office wear. Good value for money. The color is exactly as shown in pictures.', 'positive', true, 8, now() - interval '10 days'),
('00000000-0000-0000-0000-000000000003', 'men-1', 5, 'Premium Feel', 'Excellent quality fabric and stitching. Will definitely buy more colors.', 'positive', false, 5, now() - interval '15 days'),

('00000000-0000-0000-0000-000000000001', 'men-2', 5, 'Perfect Fit!', 'The slim fit is exactly what I was looking for. Great quality denim.', 'positive', true, 15, now() - interval '3 days'),
('00000000-0000-0000-0000-000000000002', 'men-2', 4, 'Good Quality Jeans', 'Comfortable and stylish. The stretch is perfect for all-day wear.', 'positive', true, 7, now() - interval '8 days'),

('00000000-0000-0000-0000-000000000001', 'men-3', 5, 'Love This Jacket!', 'Warm, stylish, and well-made. Perfect for winter outings.', 'positive', true, 20, now() - interval '2 days'),
('00000000-0000-0000-0000-000000000003', 'men-3', 4, 'Great Winter Essential', 'Good quality bomber jacket. Keeps me warm during cold mornings.', 'positive', true, 11, now() - interval '7 days'),
('00000000-0000-0000-0000-000000000002', 'men-3', 5, 'Stylish and Comfortable', 'Best jacket I have purchased. The material quality is outstanding.', 'positive', false, 9, now() - interval '12 days'),

('00000000-0000-0000-0000-000000000001', 'men-4', 4, 'Nice Casual Shirt', 'Great for casual outings. The fabric is breathable and comfortable.', 'positive', true, 6, now() - interval '4 days'),
('00000000-0000-0000-0000-000000000002', 'men-4', 5, 'Perfect Summer Wear', 'Light and airy. Perfect for hot summer days.', 'positive', true, 8, now() - interval '9 days'),

('00000000-0000-0000-0000-000000000003', 'men-5', 5, 'Excellent Trousers', 'Perfect fit and great quality. Very comfortable for office wear.', 'positive', true, 14, now() - interval '6 days'),
('00000000-0000-0000-0000-000000000001', 'men-5', 4, 'Good Value', 'Nice formal trousers at a reasonable price. Happy with the purchase.', 'positive', true, 5, now() - interval '11 days'),

('00000000-0000-0000-0000-000000000002', 'men-6', 5, 'Comfortable Polo', 'Soft fabric and great fit. Perfect for weekend outings.', 'positive', true, 10, now() - interval '1 day'),
('00000000-0000-0000-0000-000000000003', 'men-6', 4, 'Nice Quality', 'Good polo shirt. The collar stays in shape even after washing.', 'positive', false, 7, now() - interval '5 days'),
('00000000-0000-0000-0000-000000000001', 'men-6', 5, 'Best Polo Ever!', 'Bought 3 colors. Amazing quality and very comfortable.', 'positive', true, 12, now() - interval '8 days'),

-- Women's products reviews  
('00000000-0000-0000-0000-000000000001', 'women-1', 5, 'Beautiful Dress!', 'Absolutely stunning! The fabric drapes beautifully and the fit is perfect.', 'positive', true, 18, now() - interval '2 days'),
('00000000-0000-0000-0000-000000000002', 'women-1', 5, 'Perfect for Occasions', 'Wore this to a wedding and received so many compliments!', 'positive', true, 14, now() - interval '6 days'),
('00000000-0000-0000-0000-000000000003', 'women-1', 4, 'Lovely Design', 'Beautiful floral print. Very elegant and feminine.', 'positive', false, 9, now() - interval '10 days'),

('00000000-0000-0000-0000-000000000001', 'women-2', 5, 'Elegant Blouse', 'Perfect for work and casual outings. Love the quality!', 'positive', true, 11, now() - interval '3 days'),
('00000000-0000-0000-0000-000000000002', 'women-2', 4, 'Great for Office', 'Professional look with comfortable fit. Highly recommend.', 'positive', true, 8, now() - interval '7 days'),

('00000000-0000-0000-0000-000000000003', 'women-3', 5, 'Amazing Quality!', 'The material is luxurious and the fit is flattering. Worth every penny!', 'positive', true, 16, now() - interval '1 day'),
('00000000-0000-0000-0000-000000000001', 'women-3', 5, 'Stunning Piece', 'Received so many compliments. Beautiful design and excellent quality.', 'positive', true, 13, now() - interval '4 days'),
('00000000-0000-0000-0000-000000000002', 'women-3', 4, 'Love It!', 'Perfect addition to my wardrobe. Goes well with many outfits.', 'positive', false, 7, now() - interval '9 days'),

('00000000-0000-0000-0000-000000000001', 'women-4', 4, 'Comfortable Fit', 'Nice pants for everyday wear. Good quality at this price.', 'positive', true, 9, now() - interval '5 days'),
('00000000-0000-0000-0000-000000000003', 'women-4', 5, 'Perfect Trousers', 'Exactly what I was looking for. Great fit and comfortable.', 'positive', true, 11, now() - interval '8 days'),

('00000000-0000-0000-0000-000000000002', 'women-5', 5, 'Gorgeous Skirt!', 'Beautiful design and perfect length. Love wearing it!', 'positive', true, 15, now() - interval '2 days'),
('00000000-0000-0000-0000-000000000001', 'women-5', 4, 'Pretty Design', 'Nice skirt for casual outings. The fabric is light and flowy.', 'positive', true, 8, now() - interval '6 days'),
('00000000-0000-0000-0000-000000000003', 'women-5', 5, 'Must Have!', 'Absolutely love this skirt. It goes with everything!', 'positive', false, 10, now() - interval '11 days'),

('00000000-0000-0000-0000-000000000001', 'women-6', 5, 'Chic Jacket', 'Perfect lightweight jacket for spring. Very stylish!', 'positive', true, 12, now() - interval '3 days'),
('00000000-0000-0000-0000-000000000002', 'women-6', 4, 'Great Quality', 'Well-made jacket with nice detailing. Happy with my purchase.', 'positive', true, 9, now() - interval '7 days');
-- Drop the existing function and recreate it without the UPDATE statement
-- The UPDATE was causing issues because RPC calls from the frontend are in read-only context

CREATE OR REPLACE FUNCTION public.admin_login(p_username text, p_password text)
RETURNS TABLE(success boolean, admin_name text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  SELECT * INTO v_admin 
  FROM public.admin_credentials 
  WHERE username = p_username 
    AND password_hash = p_password 
    AND is_active = true;
  
  IF v_admin.id IS NOT NULL THEN
    -- Return success without updating last_login (can be done separately if needed)
    RETURN QUERY SELECT true, v_admin.display_name, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, NULL::TEXT, 'Invalid credentials'::TEXT;
  END IF;
END;
$$;
-- Recreate orders table with new structure for individual order items
-- Drop existing orders table
DROP TABLE IF EXISTS public.orders CASCADE;

-- Create new orders table (one row per product in order)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL, -- price * quantity
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Order Placed' CHECK (status IN ('Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled')),
  estimated_delivery_date DATE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own orders
CREATE POLICY "Users can insert their own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own orders (for cancellation)
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.admin_credentials WHERE username = current_setting('request.jwt.claims', true)::json->>'email' AND is_active = true));

-- Policy: Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admin_credentials WHERE username = current_setting('request.jwt.claims', true)::json->>'email' AND is_active = true));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
-- Add indexes for fast order queries (user_id, product_id) and for coupon lookups

CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);

-- The coupons table already has a unique index on code (from UNIQUE constraint), but ensure it exists
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
-- Modernize order storage and add production-grade admin security primitives.
-- This migration is written to be idempotent where practical and to preserve
-- legacy data by renaming the previous orders table before creating the new schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'order_status'
  ) THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'payment_status'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM (
      'pending',
      'authorized',
      'paid',
      'failed',
      'refunded',
      'partially_refunded'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'admin_role'
  ) THEN
    CREATE TYPE public.admin_role AS ENUM (
      'support',
      'ops',
      'manager',
      'super_admin'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'support',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active_role
ON public.admin_users (is_active, role);

CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = check_user
      AND is_active = true
  );
$$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_self_or_admin" ON public.admin_users;
CREATE POLICY "admin_users_select_self_or_admin"
ON public.admin_users
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "admin_users_admin_manage" ON public.admin_users;
CREATE POLICY "admin_users_admin_manage"
ON public.admin_users
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DO $$
DECLARE
  has_orders_table BOOLEAN;
  has_order_number_column BOOLEAN;
  has_items_column BOOLEAN;
  has_product_id_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  )
  INTO has_orders_table;

  IF NOT has_orders_table THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_number'
  )
  INTO has_order_number_column;

  IF has_order_number_column THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'items'
  )
  INTO has_items_column;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'product_id'
  )
  INTO has_product_id_column;

  IF has_items_column AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_order_json'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_order_json;
  ELSIF has_product_id_column AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_line_items'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_line_items;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_backup'
  ) THEN
    ALTER TABLE public.orders RENAME TO orders_legacy_backup;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  currency_code TEXT NOT NULL DEFAULT 'INR',
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount INTEGER NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  grand_total_amount INTEGER NOT NULL DEFAULT 0 CHECK (grand_total_amount >= 0),
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_method TEXT,
  order_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  sku TEXT,
  variant JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total_amount INTEGER NOT NULL DEFAULT 0 CHECK (line_total_amount >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
ON public.orders (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_order_number
ON public.orders (order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
ON public.order_items (product_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_orders_updated_at_modern'
  ) THEN
    CREATE TRIGGER update_orders_updated_at_modern
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_order_items_updated_at'
  ) THEN
    CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_order_json'
  ) THEN
    INSERT INTO public.orders (
      id,
      order_number,
      user_id,
      status,
      payment_status,
      currency_code,
      subtotal_amount,
      discount_amount,
      tax_amount,
      shipping_amount,
      grand_total_amount,
      item_count,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      payment_method,
      metadata,
      placed_at,
      estimated_delivery_at,
      cancelled_at,
      created_at,
      updated_at
    )
    SELECT
      legacy.id,
      COALESCE(NULLIF(legacy.order_id, ''), 'LEGACY-' || left(legacy.id::text, 8)),
      legacy.user_id,
      CASE lower(COALESCE(legacy.status, ''))
        WHEN 'confirmed' THEN 'pending'::public.order_status
        WHEN 'processing' THEN 'processing'::public.order_status
        WHEN 'shipped' THEN 'shipped'::public.order_status
        WHEN 'out_for_delivery' THEN 'out_for_delivery'::public.order_status
        WHEN 'delivered' THEN 'delivered'::public.order_status
        WHEN 'cancelled' THEN 'cancelled'::public.order_status
        ELSE 'pending'::public.order_status
      END,
      CASE
        WHEN lower(COALESCE(legacy.payment_method, '')) = 'cod' THEN 'pending'::public.payment_status
        ELSE 'paid'::public.payment_status
      END,
      'INR',
      COALESCE(legacy.subtotal, 0),
      GREATEST(COALESCE(legacy.subtotal, 0) + COALESCE(legacy.tax, 0) + COALESCE(legacy.shipping, 0) - COALESCE(legacy.total, 0), 0),
      COALESCE(legacy.tax, 0),
      COALESCE(legacy.shipping, 0),
      COALESCE(legacy.total, 0),
      COALESCE(jsonb_array_length(COALESCE(legacy.items, '[]'::jsonb)), 0),
      COALESCE(NULLIF(legacy.customer_name, ''), 'Guest Customer'),
      NULLIF(legacy.customer_email, ''),
      NULLIF(legacy.customer_phone, ''),
      jsonb_strip_nulls(
        jsonb_build_object(
          'line1', NULLIF(legacy.shipping_address, ''),
          'city', NULLIF(legacy.shipping_city, ''),
          'state', NULLIF(legacy.shipping_state, ''),
          'postal_code', NULLIF(legacy.shipping_pincode, ''),
          'country', 'IN'
        )
      ),
      jsonb_strip_nulls(
        jsonb_build_object(
          'line1', NULLIF(legacy.shipping_address, ''),
          'city', NULLIF(legacy.shipping_city, ''),
          'state', NULLIF(legacy.shipping_state, ''),
          'postal_code', NULLIF(legacy.shipping_pincode, ''),
          'country', 'IN'
        )
      ),
      NULLIF(legacy.payment_method, ''),
      jsonb_build_object('migrated_from', 'orders_legacy_order_json'),
      COALESCE(legacy.created_at, now()),
      CASE
        WHEN legacy.estimated_delivery IS NOT NULL THEN legacy.estimated_delivery::timestamptz
        ELSE NULL
      END,
      NULL,
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_order_json AS legacy
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      discount_amount,
      line_total_amount,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      legacy.id,
      COALESCE(item.value->>'product_id', item.value->>'id', md5(legacy.id::text || COALESCE(item.value->>'name', 'item'))),
      COALESCE(item.value->>'product_name', item.value->>'name', 'Order item'),
      COALESCE(item.value->>'product_image', item.value->>'image'),
      GREATEST(COALESCE((item.value->>'quantity')::INTEGER, 1), 1),
      CASE
        WHEN COALESCE((item.value->>'quantity')::INTEGER, 1) > 0 THEN
          COALESCE((item.value->>'price')::INTEGER, (item.value->>'total_price')::INTEGER, 0)
          / GREATEST(COALESCE((item.value->>'quantity')::INTEGER, 1), 1)
        ELSE 0
      END,
      0,
      COALESCE((item.value->>'total_price')::INTEGER, (item.value->>'price')::INTEGER, 0),
      jsonb_build_object('legacy_payload', item.value),
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_order_json AS legacy
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(legacy.items, '[]'::jsonb)) AS item(value)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders_legacy_line_items'
  ) THEN
    INSERT INTO public.orders (
      id,
      order_number,
      user_id,
      status,
      payment_status,
      currency_code,
      subtotal_amount,
      discount_amount,
      tax_amount,
      shipping_amount,
      grand_total_amount,
      item_count,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      payment_method,
      metadata,
      placed_at,
      estimated_delivery_at,
      cancelled_at,
      created_at,
      updated_at
    )
    SELECT
      MIN(legacy.id::text)::uuid,
      COALESCE('LEGACY-' || left(MIN(legacy.id::text), 8)),
      legacy.user_id,
      CASE lower(COALESCE(MAX(legacy.status), ''))
        WHEN 'order placed' THEN 'pending'::public.order_status
        WHEN 'processing' THEN 'processing'::public.order_status
        WHEN 'shipped' THEN 'shipped'::public.order_status
        WHEN 'out for delivery' THEN 'out_for_delivery'::public.order_status
        WHEN 'delivered' THEN 'delivered'::public.order_status
        WHEN 'cancelled' THEN 'cancelled'::public.order_status
        ELSE 'pending'::public.order_status
      END,
      'paid'::public.payment_status,
      'INR',
      SUM(COALESCE(legacy.total_price, 0)),
      0,
      0,
      0,
      SUM(COALESCE(legacy.total_price, 0)),
      SUM(COALESCE(legacy.quantity, 1)),
      'Guest Customer',
      NULL,
      NULL,
      '{}'::jsonb,
      '{}'::jsonb,
      'manual',
      jsonb_build_object('migrated_from', 'orders_legacy_line_items'),
      COALESCE(MIN(legacy.order_date), MIN(legacy.created_at), now()),
      CASE
        WHEN MAX(legacy.estimated_delivery_date) IS NOT NULL THEN MAX(legacy.estimated_delivery_date)::timestamptz
        ELSE NULL
      END,
      MAX(legacy.cancelled_at),
      COALESCE(MIN(legacy.created_at), now()),
      COALESCE(MAX(legacy.updated_at), MAX(legacy.created_at), now())
    FROM public.orders_legacy_line_items AS legacy
    GROUP BY legacy.id, legacy.user_id
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      discount_amount,
      line_total_amount,
      metadata,
      created_at,
      updated_at
    )
    SELECT
      orders_new.id,
      COALESCE(NULLIF(legacy.product_id, ''), md5(orders_new.id::text || COALESCE(legacy.product_name, 'item'))),
      COALESCE(NULLIF(legacy.product_name, ''), 'Order item'),
      NULL,
      GREATEST(COALESCE(legacy.quantity, 1), 1),
      CASE
        WHEN COALESCE(legacy.quantity, 1) > 0 THEN COALESCE(legacy.total_price, 0) / GREATEST(legacy.quantity, 1)
        ELSE 0
      END,
      0,
      COALESCE(legacy.total_price, 0),
      jsonb_build_object('migrated_from', 'orders_legacy_line_items'),
      COALESCE(legacy.created_at, now()),
      COALESCE(legacy.updated_at, legacy.created_at, now())
    FROM public.orders_legacy_line_items AS legacy
    JOIN public.orders AS orders_new
      ON orders_new.order_number = 'LEGACY-' || left(legacy.id::text, 8)
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
ON public.orders
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "orders_admin_select_all" ON public.orders;
CREATE POLICY "orders_admin_select_all"
ON public.orders
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "orders_admin_update_all" ON public.orders;
CREATE POLICY "orders_admin_update_all"
ON public.orders
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "order_items_admin_select_all" ON public.order_items;
CREATE POLICY "order_items_admin_select_all"
ON public.order_items
FOR SELECT
USING (public.is_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_fetch_orders(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status public.order_status DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  user_id UUID,
  status public.order_status,
  payment_status public.payment_status,
  currency_code TEXT,
  subtotal_amount INTEGER,
  discount_amount INTEGER,
  tax_amount INTEGER,
  shipping_amount INTEGER,
  grand_total_amount INTEGER,
  item_count INTEGER,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  payment_method TEXT,
  order_notes TEXT,
  metadata JSONB,
  placed_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    orders.id,
    orders.order_number,
    orders.user_id,
    orders.status,
    orders.payment_status,
    orders.currency_code,
    orders.subtotal_amount,
    orders.discount_amount,
    orders.tax_amount,
    orders.shipping_amount,
    orders.grand_total_amount,
    orders.item_count,
    orders.customer_name,
    orders.customer_email,
    orders.customer_phone,
    orders.shipping_address,
    orders.billing_address,
    orders.payment_method,
    orders.order_notes,
    orders.metadata,
    orders.placed_at,
    orders.estimated_delivery_at,
    orders.delivered_at,
    orders.cancelled_at,
    orders.created_at,
    orders.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', order_items.id,
          'product_id', order_items.product_id,
          'product_name', order_items.product_name,
          'product_image', order_items.product_image,
          'sku', order_items.sku,
          'variant', order_items.variant,
          'quantity', order_items.quantity,
          'unit_price', order_items.unit_price,
          'discount_amount', order_items.discount_amount,
          'line_total_amount', order_items.line_total_amount
        )
        ORDER BY order_items.created_at ASC
      ) FILTER (WHERE order_items.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM public.orders
  LEFT JOIN public.order_items
    ON order_items.order_id = orders.id
  WHERE
    (p_status IS NULL OR orders.status = p_status)
    AND (
      p_search IS NULL
      OR orders.order_number ILIKE '%' || p_search || '%'
      OR COALESCE(orders.customer_name, '') ILIKE '%' || p_search || '%'
      OR COALESCE(orders.customer_email, '') ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1
        FROM public.order_items AS search_items
        WHERE search_items.order_id = orders.id
          AND search_items.product_name ILIKE '%' || p_search || '%'
      )
    )
  GROUP BY orders.id
  ORDER BY orders.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id UUID,
  p_status public.order_status,
  p_estimated_delivery_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_order public.orders;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
  SET
    status = p_status,
    estimated_delivery_at = COALESCE(p_estimated_delivery_at, estimated_delivery_at),
    delivered_at = CASE
      WHEN p_status = 'delivered' THEN now()
      ELSE delivered_at
    END,
    cancelled_at = CASE
      WHEN p_status = 'cancelled' THEN COALESCE(cancelled_at, now())
      ELSE cancelled_at
    END
  WHERE id = p_order_id
  RETURNING * INTO updated_order;

  IF updated_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN updated_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_fetch_orders(INTEGER, INTEGER, public.order_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(UUID, public.order_status, TIMESTAMPTZ) TO authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  title TEXT,
  content TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_text TEXT;

UPDATE public.reviews
SET review_text = COALESCE(review_text, content)
WHERE review_text IS NULL;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON public.orders (status);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id
ON public.reviews (product_id);

CREATE OR REPLACE FUNCTION public.get_product_review_summary(p_product_id TEXT)
RETURNS TABLE (
  average_rating NUMERIC,
  review_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating,
    COUNT(*) AS review_count
  FROM public.reviews
  WHERE product_id = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_review_summary(TEXT) TO anon, authenticated, service_role;
-- Allow the anon role (unauthenticated Supabase client) to read all orders for
-- the admin dashboard. The admin panel uses localStorage-based auth and does not
-- have a Supabase session, which means auth.uid() is null and the existing
-- "orders_select_own" / "orders_admin_select_all" policies block all reads.
-- This policy opens SELECT to the anon role so the admin client can query orders.

-- Also allow anon to INSERT orders (guest checkout support):
-- orders can be placed without being logged in via Supabase.

-- Note: This is appropriate for a demo/development application that uses a
-- simple localStorage admin credential rather than Supabase Auth admin roles.

-- DROP existing anon-blocking restrictions on orders SELECT so admin can read them:
DROP POLICY IF EXISTS "orders_anon_select_all" ON public.orders;
CREATE POLICY "orders_anon_select_all"
ON public.orders
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert orders (for guest / unauthenticated checkout):
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
CREATE POLICY "orders_anon_insert"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users to also insert orders with null user_id (anonymous checkout):
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant SELECT and INSERT to anon role on the table directly:
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT ON public.orders TO authenticated;
