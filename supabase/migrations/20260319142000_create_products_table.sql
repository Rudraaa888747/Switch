-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY, -- Using TEXT to maintain 'men-1' etc. legacy IDs
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  discount NUMERIC,
  category TEXT NOT NULL,
  subcategory TEXT,
  colors TEXT[],
  sizes TEXT[],
  fabric TEXT,
  occasion TEXT[],
  description TEXT,
  is_new BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  variants JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public products viewable by everyone" 
ON public.products FOR SELECT 
USING (true);

-- For simplicity in this demo, we'll allow all modifications for now, 
-- but in production we should check for admin status
CREATE POLICY "Admin can insert products" 
ON public.products FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update products" 
ON public.products FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete products" 
ON public.products FOR DELETE 
USING (true);

-- Function to handle initial seeding (can be run manually)
/*
INSERT INTO public.products (id, name, price, original_price, discount, category, subcategory, colors, sizes, fabric, occasion, description, is_new, is_trending, rating, reviews_count, variants, stock_quantity)
VALUES 
  ('men-1', 'Black Slim-Fit Cotton Shirt', 1299, 1799, 28, 'men', 'shirts', ARRAY['Black', 'Navy'], ARRAY['S', 'M', 'L', 'XL', 'XXL'], '100% Premium Cotton', ARRAY['Casual', 'Office', 'Party'], 'Premium slim-fit cotton shirt with a modern cut.', true, true, 4.5, 128, '[{"color": "Black", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//BLACK.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//BLACK 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//BLACK 3.jpeg"]}, {"color": "Navy", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//NAVY 1.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//NAVY 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//NAVY 3.jpg"]}]'::jsonb, 45),
  ('men-2', 'White Formal Shirt', 1499, 1999, 25, 'men', 'shirts', ARRAY['White', 'Cream'], ARRAY['S', 'M', 'L', 'XL', 'XXL'], 'Egyptian Cotton Blend', ARRAY['Formal', 'Office', 'Wedding'], 'Classic white formal shirt crafted from premium Egyptian cotton blend.', false, false, 4.7, 256, '[{"color": "White", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//WHITE.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//WHITE 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//WHITE 3.jpg"]}, {"color": "Cream", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//CREAM.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//CREAM 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/tshirt//CREAM 3.jpg"]}]'::jsonb, 12),
  ('women-3', 'Elegant Cotton Kurti', 1299, 1799, 28, 'women', 'kurta', ARRAY['White', 'Navy'], ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'], 'Pure Cotton', ARRAY['Casual', 'Office', 'Festival'], 'Elegant pure cotton kurti with beautiful embroidery.', false, false, 4.7, 445, '[{"color": "White", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//white kurti.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//white kurti 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//white kurti 3.jpg"]}, {"color": "Navy", "images": ["https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//Navy kurti.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//Navy kurti 2.jpg", "https://pinbdhfnkdzwvmazbtrj.supabase.co/storage/v1/object/public/womendress//Navy kurti 3.jpg"]}]'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;
*/
