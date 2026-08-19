import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdminClient, isAdminApiAuthorized } from '../../_lib/supabase-admin';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
}

interface UserCountRow {
  user_id: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await isAdminApiAuthorized(req.headers))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: usersData, error: rpcError } = await supabaseAdmin.rpc('get_admin_user_stats');

    if (rpcError) {
      return res.status(500).json({ error: rpcError.message, code: rpcError.code });
    }

    const users = typeof usersData === 'string' ? JSON.parse(usersData) : usersData;

    return res.status(200).json({ data: { users: users || [] } });
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin users request failed',
    });
  }
}
