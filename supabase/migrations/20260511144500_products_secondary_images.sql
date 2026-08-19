-- Add secondary_images column to products table for multiple product images
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS secondary_images TEXT[] DEFAULT '{}'::TEXT[];

-- Update existing products to have empty array instead of NULL
UPDATE public.products
SET secondary_images = '{}'::TEXT[]
WHERE secondary_images IS NULL;
