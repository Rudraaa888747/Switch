import { createClient } from '@supabase/supabase-js';

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: Request, res: VercelResponse) {
  // Using the server-side environment variables if available, otherwise the VITE_ prefixed ones
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Supabase credentials missing',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // A simple, lightweight query to ping the database
    const { error } = await supabase.from('products').select('id').limit(1);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      status: 'success',
      message: 'Keep-alive ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred during ping';
    return res.status(500).json({
      status: 'error',
      message,
    });
  }
}
