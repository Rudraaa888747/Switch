import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isAdminApiAuthorized } from '../../_lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await isAdminApiAuthorized(req.headers))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    if (req.method === 'GET') {
      const [reviewsResult, productsResult] = await Promise.all([
        supabaseAdmin.from('reviews').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('products').select('id,name'),
      ]);

      if (reviewsResult.error) {
        return res.status(500).json({ error: reviewsResult.error.message, code: reviewsResult.error.code });
      }

      if (productsResult.error) {
        return res.status(500).json({ error: productsResult.error.message, code: productsResult.error.code });
      }

      return res.status(200).json({
        data: {
          reviews: reviewsResult.data || [],
          products: productsResult.data || [],
        },
      });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: error.message, code: error.code });
      }

      return res.status(200).json({ data: { id } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin reviews request failed',
    });
  }
}
