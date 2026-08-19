create index if not exists idx_orders_user_id
on public.orders (user_id);

create index if not exists idx_orders_created_at
on public.orders (created_at desc);

create index if not exists idx_orders_status
on public.orders (status);

create or replace function public.admin_fetch_orders(
  p_limit integer default 20,
  p_offset integer default 0,
  p_status text default null,
  p_search text default null
)
returns table (
  id uuid,
  order_number text,
  user_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  shipping_address jsonb,
  subtotal_amount integer,
  discount_amount integer,
  tax_amount integer,
  shipping_amount integer,
  grand_total_amount integer,
  item_count integer,
  payment_method text,
  order_notes text,
  status text,
  estimated_delivery_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  cancelled_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  select
    o.id,
    o.order_number,
    o.user_id,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.shipping_address,
    o.subtotal_amount,
    o.discount_amount,
    o.tax_amount,
    o.shipping_amount,
    o.grand_total_amount,
    o.item_count,
    o.payment_method,
    o.order_notes,
    o.status,
    o.estimated_delivery_at,
    o.created_at,
    o.updated_at,
    o.cancelled_at
  from public.orders o
  where
    (p_status is null or o.status::text = p_status)
    and (
      p_search is null
      or o.order_number ilike '%' || p_search || '%'
      or o.customer_name ilike '%' || p_search || '%'
    )
  order by o.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.admin_fetch_orders(integer, integer, text, text) to authenticated;
