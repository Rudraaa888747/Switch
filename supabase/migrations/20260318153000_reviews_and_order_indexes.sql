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
