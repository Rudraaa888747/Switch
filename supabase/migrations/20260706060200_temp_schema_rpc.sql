CREATE OR REPLACE FUNCTION public.get_table_schema(p_table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text, 
    data_type::text, 
    is_nullable::text, 
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name
  ORDER BY ordinal_position;
$$;
