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
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_number);
  END IF;
END;
$$

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);
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
