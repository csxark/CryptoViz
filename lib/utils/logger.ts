/**
 * Centralized Structured Observability and Telemetry Module.
 * Automatically redacts sensitive cryptographic secrets, keys, passwords, and plaintext (#1338).
 */

export interface StructuredTelemetry {
  requestId?: string;
  jobId?: string;
  algorithmId?: string;
  operationType?: string;
  durationMs?: number;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO' | 'LIMIT_EXCEEDED';
  errorCode?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV !== 'production';

const SENSITIVE_KEYS = /secret|key|private|password|pass|seed|entropy|mnemonic|passphrase|token|sk|plain|intermediate|matrix|poly|vector/i;

function redactString(val: string): string {
  // Redact PEM format keys inside the string
  let result = val;
  result = result.replace(/-----BEGIN[^-]*PRIVATE KEY-----[^-]*-----END[^-]*PRIVATE KEY-----/gi, '[REDACTED_PRIVATE_KEY]');
  result = result.replace(/-----BEGIN[^-]*PUBLIC KEY-----[^-]*-----END[^-]*PUBLIC KEY-----/gi, '[REDACTED_PUBLIC_KEY]');
  result = result.replace(/-----BEGIN[^-]*KEY-----[^-]*-----END[^-]*KEY-----/gi, '[REDACTED_CRYPTOGRAPHIC_KEY]');

  if (result.includes('-----BEGIN') || result.includes('-----END')) {
    return '[REDACTED_CRYPTOGRAPHIC_KEY]';
  }

  // Redact 32-byte or 64-byte hex keys (64 or 128 characters)
  if (/^[a-fA-F0-9]{64}$/.test(result) || /^[a-fA-F0-9]{128}$/.test(result)) {
    return '[REDACTED_HEX_SECRET]';
  }
  // Redact base64 secrets of typical key lengths
  if (/^[a-zA-Z0-9+/]{43}=$/.test(result) || /^[a-zA-Z0-9+/]{44}$/.test(result)) {
    return '[REDACTED_B64_SECRET]';
  }
  // Redact inline secrets matching pattern: key=value, key: value, or key value
  return result.replace(/(password|secret|key|private|plain)(?:\s*=\s*|\s*:\s*|\s+)(?!\[)([^\s,;]+)/gi, '$1: [REDACTED]');
}

export function redact(val: unknown): unknown {
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    return redactString(val);
  }

  if (Array.isArray(val)) {
    return val.map(redact);
  }

  if (val instanceof Error) {
    return new Error(redactString(val.message));
  }

  if (typeof val === 'object') {
    const safeObj: Record<string, unknown> = {};
    const obj = val as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.test(key)) {
        safeObj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        safeObj[key] = redact(value);
      } else if (typeof value === 'string') {
        safeObj[key] = redact(value);
      } else {
        safeObj[key] = value;
      }
    }
    return safeObj;
  }

  return val;
}

export const logger = {
  log: (...args: unknown[]): void => {
    const redactedArgs = args.map(redact);
    if (isDev) {
       
      console.log(...redactedArgs);
    } else {
       
      console.log(JSON.stringify({ level: 'LOG', timestamp: new Date().toISOString(), messages: redactedArgs }));
    }
  },
  info: (...args: unknown[]): void => {
    const redactedArgs = args.map(redact);
    if (isDev) {
       
      console.info(...redactedArgs);
    } else {
       
      console.info(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), messages: redactedArgs }));
    }
  },
  warn: (...args: unknown[]): void => {
    const redactedArgs = args.map(redact);
    if (isDev) {
       
      console.warn(...redactedArgs);
    } else {
       
      console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), messages: redactedArgs }));
    }
  },
  error: (...args: unknown[]): void => {
    const redactedArgs = args.map(redact);
    if (isDev) {
       
      console.error(...redactedArgs);
    } else {
       
      console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), messages: redactedArgs }));
    }
  },
  structured: (log: StructuredTelemetry): void => {
    const redactedLog = redact(log) as StructuredTelemetry;
    if (isDev) {
       
      console.info(`[TELEMETRY] ${redactedLog.status} | Job: ${redactedLog.jobId ?? 'N/A'} | Alg: ${redactedLog.algorithmId ?? 'N/A'} | Msg: ${redactedLog.message}`, redactedLog);
    } else {
       
      console.info(JSON.stringify({
        level: 'TELEMETRY',
        timestamp: new Date().toISOString(),
        ...redactedLog,
      }));
    }
  },
};

export default logger;
