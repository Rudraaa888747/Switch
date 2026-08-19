import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isAdminApiAuthorized } from '../../_lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(await isAdminApiAuthorized(req.headers))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { orderId, status, estimatedDeliveryAt, estimatedDeliveryDate, schemaVersion } = req.body || {};

    if (!orderId || !status) {
      return res.status(400).json({ error: 'orderId and status are required' });
    }

    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id, order_id, status')
      .or(`id.eq.${orderId},order_id.eq.${orderId}`)
      .limit(1)
      .maybeSingle<{ id: string; order_id: string | null; status: string | null }>();

    const previousStatus = String(existingOrder?.status || '').toLowerCase();
    const nextStatus = String(status).toLowerCase();
    const updateData: Record<string, unknown> = { status };

    if (schemaVersion === 'modern') {
      updateData.estimated_delivery_at = estimatedDeliveryAt ?? null;
    } else if (estimatedDeliveryDate) {
      updateData.estimated_delivery = estimatedDeliveryDate;
    } else if (estimatedDeliveryAt) {
      updateData.estimated_delivery = String(estimatedDeliveryAt).split('T')[0];
    }

    const updateByColumn = async (column: 'id' | 'order_id') => {
      return supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq(column, orderId)
        .select('*');
    };

    let { data, error } = await updateByColumn('id');

    if ((!data || data.length === 0) && !error) {
      ({ data, error } = await updateByColumn('order_id'));
    }

    if (error) {
      return res.status(500).json({ error: error.message, code: error.code });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Order not found or not updated' });
    }

    const isDispatchTransition =
      previousStatus !== nextStatus &&
      ['shipped', 'dispatched', 'out_for_delivery', 'delivered'].includes(nextStatus);

    if (isDispatchTransition) {
      const updatedOrder = data[0] as { id?: string; order_id?: string };
      await supabaseAdmin
        .from('admin_notifications')
        .insert({
          title: 'Order status updated',
          message: `Order ${updatedOrder.order_id || orderId} moved to ${nextStatus.replaceAll('_', ' ')}.`,
          type: nextStatus === 'delivered' ? 'success' : 'info',
          event_type: 'order_dispatched',
          link: '/admin/orders',
          metadata: {
            orderId: updatedOrder.order_id || orderId,
            status: nextStatus,
            previousStatus,
          },
        })
        .then(() => null)
        .catch(() => null);
    }

    return res.status(200).json({ data });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin order update failed',
    });
  }
}


