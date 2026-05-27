import { supabase } from './client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const buildRestUrl = (path: string, searchParams?: URLSearchParams) => {
  const baseUrl = `${SUPABASE_URL}/rest/v1/${path}`;
  return searchParams && Array.from(searchParams.keys()).length > 0
    ? `${baseUrl}?${searchParams.toString()}`
    : baseUrl;
};

const getRestHeaders = (extraHeaders?: HeadersInit) => ({
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  Accept: 'application/json',
  ...extraHeaders,
});

export interface SupabaseRestError {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
}

const parseRestResponse = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  let errorBody: SupabaseRestError | null = null;

  try {
    errorBody = await response.json();
  } catch {
    errorBody = {
      message: response.statusText || 'Supabase REST request failed',
    };
  }

  throw errorBody;
};

export const supabaseRestRequest = async <T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    searchParams?: URLSearchParams;
    headers?: HeadersInit;
    body?: BodyInit | null;
    authToken?: string | null;
  }
) => {
  let token = options?.authToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch {
      // ignore
    }
  }

  const normalizedHeaders = {
    ...getRestHeaders(options?.headers),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if ((options?.method === 'POST' || options?.method === 'PATCH') && !normalizedHeaders['Content-Type']) {
    normalizedHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildRestUrl(path, options?.searchParams), {
    method: options?.method ?? 'GET',
    headers: normalizedHeaders,
    body: options?.body,
  });

  const data = await parseRestResponse<T>(response);

  return { data, response };
};

export const supabaseRestSelect = async <T>(path: string, searchParams?: URLSearchParams, authToken?: string | null) => {
  const { data } = await supabaseRestRequest<T>(path, {
    method: 'GET',
    searchParams,
    authToken,
  });
  return data;
};

export const supabaseRestInsert = async <T>(
  path: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  authToken?: string | null
) => {
  let token = authToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch {
      // ignore
    }
  }

  const response = await fetch(buildRestUrl(path), {
    method: 'POST',
    headers: {
      ...getRestHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return parseRestResponse<T>(response);
};

export const supabaseRestUpdate = async <T>(
  path: string,
  payload: Record<string, unknown>,
  searchParams?: URLSearchParams,
  authToken?: string | null
) => {
  let token = authToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch {
      // ignore
    }
  }

  const response = await fetch(buildRestUrl(path, searchParams), {
    method: 'PATCH',
    headers: {
      ...getRestHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return parseRestResponse<T>(response);
};

export const supabaseRestDelete = async (path: string, searchParams?: URLSearchParams, authToken?: string | null) => {
  let token = authToken;
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch {
      // ignore
    }
  }

  const response = await fetch(buildRestUrl(path, searchParams), {
    method: 'DELETE',
    headers: {
      ...getRestHeaders({
      Prefer: 'return=representation',
      }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return parseRestResponse<unknown>(response);
};
