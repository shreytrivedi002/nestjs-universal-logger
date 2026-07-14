import { UniversalLoggerConfig } from '../interfaces/config.interface';

export type BodyLogMode = 'none' | 'all' | 'errors';

const DEFAULT_MAX_BODY_SIZE = 1024;
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'credential',
  'ssn',
  'credit_card',
  'card_number',
];

export function resolveRequestBodyMode(api?: UniversalLoggerConfig['api']): BodyLogMode {
  if (api?.logBodyMode) {
    return api.logBodyMode;
  }
  if (api?.logBody === false) {
    return 'none';
  }
  if (api?.logBody === true) {
    return 'all';
  }
  return 'errors';
}

export function resolveResponseBodyMode(api?: UniversalLoggerConfig['api']): BodyLogMode {
  if (api?.logResponseBodyMode) {
    return api.logResponseBodyMode;
  }
  return resolveRequestBodyMode(api);
}

export function shouldLogBody(mode: BodyLogMode, statusCode?: number, isErrorPath = false): boolean {
  if (mode === 'none') {
    return false;
  }
  if (mode === 'all') {
    return true;
  }
  // 'errors' — only when we know it failed
  if (isErrorPath) {
    return true;
  }
  return typeof statusCode === 'number' && statusCode >= 400;
}

/**
 * Sanitize + size-cap a body for logging. Large bodies are never buffered fully.
 */
export function prepareLogBody(
  body: any,
  maxBodySize = DEFAULT_MAX_BODY_SIZE,
  sensitiveFields: string[] = DEFAULT_SENSITIVE_FIELDS,
): any {
  if (body === undefined || body === null) {
    return undefined;
  }

  let serialized: string;
  try {
    serialized = typeof body === 'string' ? body : JSON.stringify(body);
  } catch {
    return { _omitted: true, reason: 'BODY_NOT_SERIALIZABLE' };
  }

  if (serialized.length > maxBodySize) {
    return {
      _omitted: true,
      reason: 'BODY_TOO_LARGE',
      size: serialized.length,
      maxBodySize,
    };
  }

  if (typeof body === 'string' || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body;
  }

  const sanitized: Record<string, any> = { ...body };
  for (const field of sensitiveFields) {
    if (sanitized[field] !== undefined) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

export function getMaxBodySize(api?: UniversalLoggerConfig['api']): number {
  return api?.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;
}
