import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const getAdminToken = () => process.env.ADMIN_API_TOKEN;

export const getSupabaseAdminClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is not configured');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const getBearerToken = (headers: Record<string, string | string[] | undefined>) => {
  const authorizationHeader = headers.authorization;
  const rawValue = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!rawValue) return null;

  const [scheme, token] = rawValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

export const isAdminApiAuthorized = async (headers: Record<string, string | string[] | undefined>) => {
  const supabaseAdmin = getSupabaseAdminClient();
  const bearerToken = getBearerToken(headers);

  if (bearerToken) {
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(bearerToken);

    if (!userError && user) {
      const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', {
        check_user: user.id,
      });

      if (!adminError && Boolean(isAdmin)) {
        return true;
      }
    }
  }

  const configuredToken = getAdminToken();
  if (!configuredToken) {
    return false;
  }

  const headerValue = headers['x-admin-token'];
  const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return token === configuredToken;
};


