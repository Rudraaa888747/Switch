import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isAdminApiAuthorized } from '../../_lib/supabase-admin';

type RawOrderRow = Record<string, unknown> & { id: string; items?: Record<string, unknown>[] };
type RawOrderItemRow = Record<string, unknown> & { order_id: string };

const sanitizeSearch = (value: string) => value.replace(/[(),]/g, ' ').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await isAdminApiAuthorized(req.headers))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize ?? 20)));
    const rawSearch = typeof req.query.search === 'string' ? req.query.search : '';
    const rawStatus = typeof req.query.status === 'string' ? req.query.status : 'all';
    const search = sanitizeSearch(rawSearch);
    const offset = (page - 1) * pageSize;

    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('*', { count: 'estimated' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (rawStatus && rawStatus !== 'all') {
      ordersQuery = ordersQuery.eq('status', rawStatus);
    }

    if (search) {
      ordersQuery = ordersQuery.or(`order_id.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    const { data, error, count } = await ordersQuery;
    if (error) {
      return res.status(500).json({ error: error.message, code: error.code });
    }

    const orders = (data || []) as RawOrderRow[];
    const modernOrderIds = orders
      .filter((order) => !order.items || (Array.isArray(order.items) && order.items.length === 0))
      .map((order) => order.id);

    let allItems: RawOrderItemRow[] = [];
    if (modernOrderIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .in('order_id', modernOrderIds);

      if (itemError) {
        return res.status(500).json({ error: itemError.message, code: itemError.code });
      }

      allItems = (itemRows || []) as RawOrderItemRow[];
    }

    const mergedOrders = orders.map((order) => {
      if (!modernOrderIds.includes(order.id)) {
        return order;
      }

      return {
        ...order,
        items: allItems.filter((item) => item.order_id === order.id),
      };
    });

    return res.status(200).json({
      data: {
        orders: mergedOrders,
        totalCount: count ?? mergedOrders.length,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin orders request failed',
    });
  }
}
