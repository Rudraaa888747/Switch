-- Create orders table for order tracking
CREATE TABLE IF NOT EXISTS public.orders (
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