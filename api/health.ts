import { createClient } from '@supabase/supabase-js';

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: Request, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  
  let dbStatus = 'disconnected';
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('products').select('id').limit(1);
      if (!error) {
        dbStatus = 'connected';
      } else {
        dbStatus = 'error';
      }
    } catch (e) {
      dbStatus = 'error';
    }
  }

  const envConfigured = !!(supabaseUrl && supabaseKey);

  res.status(200).json({
    status: 'healthy',
    database: dbStatus,
    environment: envConfigured ? 'configured' : 'missing',
    uptime: `${Math.floor(process.uptime())}s`,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
