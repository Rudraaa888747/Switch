-- Migration to create an RPC function for counting user stats efficiently
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Perform a fast JSON aggregation over the joined data
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'display_name', p.display_name,
      'created_at', p.created_at,
      'orderCount', (SELECT count(id) FROM orders o WHERE o.user_id = p.user_id),
      'reviewCount', (SELECT count(id) FROM reviews r WHERE r.user_id = p.user_id)
    )
  ) INTO result
  FROM (
    SELECT id, user_id, display_name, created_at
    FROM profiles
    ORDER BY created_at DESC
  ) p;
  
  -- Return an empty array if there are no profiles
  RETURN COALESCE(result, '[]'::json);
END;
$$;
