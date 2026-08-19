/**
 * Secure Logger Abstraction
 * Prevents vendor lock-in and sanitizes sensitive data before logging.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'jwt',
  'secret',
  'apikey',
  'api_key',
  'cookie',
  'session',
  'card',
  'cvv',
  'pan',
  'email',
  'phone'
];

/**
 * Safely scrubs an object of sensitive information.
 */
function sanitizeData(data: unknown): unknown {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const sanitized = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, data?: unknown) => {
    const safeData = sanitizeData(data);
    // Future: send to Sentry/Datadog here
    console.info(`[INFO] ${message}`, safeData ? safeData : '');
  },
  warn: (message: string, data?: unknown) => {
    const safeData = sanitizeData(data);
    // Future: send to Sentry/Datadog here
    console.warn(`[WARN] ${message}`, safeData ? safeData : '');
  },
  error: (message: string, error?: unknown, data?: unknown) => {
    const safeData = sanitizeData(data);
    const safeError = error instanceof Error 
      ? { message: error.message, name: error.name, stack: error.stack }
      : sanitizeData(error);
    
    // Future: send to Sentry captureException here
    console.error(`[ERROR] ${message}`, safeError, safeData ? safeData : '');
  }
};
