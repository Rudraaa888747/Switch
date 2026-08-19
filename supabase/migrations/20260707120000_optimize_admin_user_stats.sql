-- Migration to optimize the get_admin_user_stats RPC function by removing the N+1 queries.
-- We use LEFT JOINs with grouped CTEs/subqueries to aggregate the counts in a single pass.

CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'user_id', p.user_id,
      'display_name', p.display_name,
      'created_at', p.created_at,
      'orderCount', COALESCE(o.order_count, 0),
      'reviewCount', COALESCE(r.review_count, 0)
    )
  ) INTO result
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, count(id)::integer as order_count
    FROM orders
    GROUP BY user_id
  ) o ON o.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, count(id)::integer as review_count
    FROM reviews
    GROUP BY user_id
  ) r ON r.user_id = p.user_id;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
