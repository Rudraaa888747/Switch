-- 1. Create the products table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
-- Allow anyone to view products
DROP POLICY IF EXISTS "Allow public read access" ON public.products;
CREATE POLICY "Allow public read access" 
ON public.products FOR SELECT 
USING (true);

-- Allow admins (or everyone for this demo) to manage products
DROP POLICY IF EXISTS "Allow all management for now" ON public.products;
CREATE POLICY "Allow all management for now" 
ON public.products FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Seed data removed — products are added manually via admin panel.
-- To re-enable, uncomment the INSERT block below and run the migration.
-- INSERT INTO public.products (id, name, price, ...) VALUES ...;
