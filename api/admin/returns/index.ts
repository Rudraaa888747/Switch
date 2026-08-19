import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isAdminApiAuthorized } from '../../_lib/supabase-admin';

interface ReturnRequestRow {
  id: string;
  order_id: string;
  user_id: string;
  status: string;
  refund_amount: number;
  created_at: string;
  updated_at?: string;
  admin_note?: string;
}

interface UpdateReturnPayload {
  id: string;
  status?: string;
  refund_amount?: number;
  estimated_refund_date?: string;
  admin_note?: string;
  process_wallet_refund?: boolean;
  wallet_user_id?: string;
  wallet_reference_id?: string;
  wallet_description?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await isAdminApiAuthorized(req.headers))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('return_requests')
        .select('*,profiles(display_name),orders(order_number)')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message, code: error.code });
      }

      return res.status(200).json({ data });
    }

    if (req.method === 'POST') {
      const {
        id,
        status,
        refund_amount,
        estimated_refund_date,
        admin_note,
        process_wallet_refund,
        wallet_user_id,
        wallet_reference_id,
        wallet_description,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      console.log(`[AdminReturns] Updating return ${id} to ${status}`, { refund_amount, process_wallet_refund });

      const { data: existingReturn, error: existingReturnError } = await supabaseAdmin
        .from('return_requests')
        .select('id, user_id, status, refund_amount, order_id')
        .eq('id', id)
        .maybeSingle<ReturnRequestRow>();

      if (existingReturnError) {
        console.error(`[AdminReturns] Error fetching existing return:`, existingReturnError);
        return res.status(500).json({ error: existingReturnError.message, code: existingReturnError.code });
      }

      if (!existingReturn) {
        return res.status(404).json({ error: 'Return request not found' });
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (status !== undefined) updateData.status = status;
      if (refund_amount !== undefined) updateData.refund_amount = refund_amount;
      if (estimated_refund_date !== undefined) updateData.estimated_refund_date = estimated_refund_date;
      if (admin_note !== undefined) updateData.admin_note = admin_note;

      if (process_wallet_refund) {
        const userId = wallet_user_id || existingReturn.user_id;
        const amount = refund_amount !== undefined ? refund_amount : (existingReturn.refund_amount || 0);

        if (!userId || amount === undefined || Number(amount) <= 0) {
          return res.status(400).json({ error: 'Valid user_id and positive refund_amount are required for wallet refunds' });
        }

        const walletReferenceId = wallet_reference_id || `REFUND-${String(id).slice(0, 8)}`;
        
        const { error: walletError } = await supabaseAdmin.rpc('credit_return_refund', {
            p_user_id: userId,
            p_amount: amount,
            p_reference_id: walletReferenceId,
            p_description: wallet_description ?? `Refund for return request #${String(id).slice(0, 8)}`,
          });
        if (walletError) {
          console.error(`[AdminReturns] Wallet RPC error:`, walletError);
          return res.status(500).json({ error: walletError.message, code: walletError.code });
        }
        updateData.status = 'refunded';
      }

      console.log(`[AdminReturns] Executing update on return_requests for ID ${id}`);
      const { data, error } = await supabaseAdmin
        .from('return_requests')
        .update(updateData)
        .eq('id', id)
        .select('*');

      if (error) {
        console.error(`[AdminReturns] Update error:`, error);
        return res.status(500).json({ error: error.message, code: error.code });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Return request not found or not updated' });
      }

      const updatedReturn = data[0] as ReturnRequestRow;
      const prevStatus = String(existingReturn.status || '').toLowerCase();
      const nextStatus = String(updatedReturn.status || status || '').toLowerCase();

      if (prevStatus !== nextStatus) {
        const displayStatus = nextStatus.replace(/_/g, ' ');
        console.log(`[AdminReturns] Creating notification for status transition to ${displayStatus}`);
        
        await supabaseAdmin
          .from('admin_notifications')
          .insert({
            title: 'Return request updated',
            message: `Return ${String(id).slice(0, 8)} moved to ${displayStatus}.`,
            type: ['rejected', 'cancelled'].includes(nextStatus) ? 'warning' : 'info',
            event_type: 'return_request',
            link: '/admin/returns',
            metadata: {
              returnId: id,
              orderId: existingReturn.order_id ?? null,
              previousStatus: prevStatus,
              status: nextStatus,
            },
          })
          .then(() => console.log(`[AdminReturns] Notification inserted`))
          .catch((err) => console.error(`[AdminReturns] Notification error:`, err));
      }

      const refundTriggered =
        (refund_amount !== undefined && Number(refund_amount) > 0 && prevStatus !== 'refunded') ||
        nextStatus === 'refunded';

      if (refundTriggered) {
        await supabaseAdmin
          .from('admin_notifications')
          .insert({
            title: 'Refund processed',
            message: `Refund updated for return ${String(id).slice(0, 8)}.`,
            type: 'success',
            event_type: 'refund',
            link: '/admin/returns',
            metadata: {
              returnId: id,
              orderId: existingReturn.order_id ?? null,
              refundAmount: Number(refund_amount ?? updatedReturn.refund_amount ?? 0),
              status: nextStatus,
            },
          })
          .then(() => console.log(`[AdminReturns] Refund notification inserted`))
          .catch((err) => console.error(`[AdminReturns] Refund notification error:`, err));
      }

      return res.status(200).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    console.error(`[AdminReturns] Unhandled exception:`, error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin returns request failed',
    });
  }
}
