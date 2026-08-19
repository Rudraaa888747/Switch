import { supabase } from '@/integrations/supabase/client';

function isStaleTokenError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    if (err.status === 401) return true;

    const code = String(err.code ?? '');
    if (code === 'PGRST301' || code === '401') return true;

    const message = String(err.message ?? err.error_description ?? '').toLowerCase();
    if (message.includes('jwt') || message.includes('expired') || message.includes('invalid token')) return true;
  }

  if (typeof error === 'string') {
    const lower = error.toLowerCase();
    if (lower.includes('jwt') || lower.includes('expired') || lower.includes('401')) return true;
  }

  return false;
}

async function refreshSession(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.refreshSession();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Wraps a Supabase query function with automatic retry-on-stale-token logic.
 * If the first attempt fails with a 401/JWT error, refreshes the session
 * and retries once. Returns the result on success, or throws on final failure.
 */
export async function withAuthRetry<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (!isStaleTokenError(error)) throw error;

    const refreshed = await refreshSession();
    if (!refreshed) throw error;

    return await queryFn();
  }
}

/**
 * Wraps a Supabase query that returns { data, error } pattern.
 * If the first attempt fails with a 401/JWT error, refreshes the session
 * and retries once. Returns the result on success, or the last error on final failure.
 */
export async function withAuthRetrySupabase<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown }> {
  try {
    const result = await queryFn();
    if (!result.error) return result;

    if (!isStaleTokenError(result.error)) return result;

    const refreshed = await refreshSession();
    if (!refreshed) return result;

    return await queryFn();
  } catch (error) {
    if (!isStaleTokenError(error)) throw error;

    const refreshed = await refreshSession();
    if (!refreshed) throw error;

    return await queryFn();
  }
}
