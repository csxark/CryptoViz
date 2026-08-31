import { CipherError } from '@/lib/utils/errors';

export interface RemediationOption {
  label: string;
  value: string | number;
  description?: string;
}

export interface Diagnostic {
  errorCode: string;
  explanation: string;
  suggestedRemediation: RemediationOption[];
}

export interface DiagnosticContext {
  cipherId?: string;
  fieldName?: string;
  fieldValue?: unknown;
  additionalData?: Record<string, unknown>;
}

export type DiagnosticCode =
  | 'NON_COPRIME_MULTIPLIER'
  | 'SINGULAR_MATRIX'
  | 'COMPOSITE_PRIME_INPUT'
  | 'ODD_HEX_LENGTH'
  | 'OFF_CURVE_POINT';

const SUPPORTED_ERROR_CODES = new Set(['INVALID_KEY', 'INVALID_INPUT']);

export function hasDiagnosticSupport(errorCode: string): boolean {
  return SUPPORTED_ERROR_CODES.has(errorCode);
}

export function getAllDiagnosticCodes(): DiagnosticCode[] {
  return [
    'NON_COPRIME_MULTIPLIER',
    'SINGULAR_MATRIX',
    'COMPOSITE_PRIME_INPUT',
    'ODD_HEX_LENGTH',
    'OFF_CURVE_POINT',
  ];
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function getNearestPrime(n: number): number {
  let offset = 1;
  while (offset < 100) {
    if (isPrime(n - offset)) return n - offset;
    if (isPrime(n + offset)) return n + offset;
    offset++;
  }
  return 13;
}

export function diagnoseError(
  error: unknown,
  context?: DiagnosticContext,
): Diagnostic | null {
  if (!context || !(error instanceof CipherError) || !hasDiagnosticSupport(error.code)) {
    return null;
  }

  const { cipherId, fieldName, fieldValue, additionalData } = context;

  // Affine Non-coprime multiplier
  if (cipherId === 'affine' && fieldName === 'a') {
    const val = Number(fieldValue);
    const g = gcd(val, 26);
    return {
      errorCode: 'NON_COPRIME_MULTIPLIER',
      explanation: `Multiplier ${val} is not coprime with 26 (GCD = ${g}).`,
      suggestedRemediation: [
        { label: 'Set valid coprime multiplier (5)', value: 5, description: 'Change multiplier to 5' },
        { label: 'Set valid coprime multiplier (7)', value: 7, description: 'Change multiplier to 7' },
      ],
    };
  }

  // Hill singular matrix
  if (cipherId === 'hill' && fieldName === 'key') {
    const det = additionalData?.determinant ?? 0;
    return {
      errorCode: 'SINGULAR_MATRIX',
      explanation: `Matrix determinant is ${det}, which is singular or not coprime with 26.`,
      suggestedRemediation: [
        { label: 'Use valid key (GYBN)', value: 'GYBN', description: 'Invertible 2x2 matrix key' },
        { label: 'Use valid key (HILL)', value: 'HILL', description: 'Invertible matrix key' },
      ],
    };
  }

  // RSA composite prime input
  if (cipherId === 'rsa' && (fieldName === 'p' || fieldName === 'q')) {
    const val = Number(fieldValue);
    if (!isPrime(val)) {
      const nearest = getNearestPrime(val);
      return {
        errorCode: 'COMPOSITE_PRIME_INPUT',
        explanation: `Value ${val} is composite, but RSA requires prime numbers.`,
        suggestedRemediation: [
          { label: `Use nearest prime (${nearest})`, value: nearest, description: `Change to prime ${nearest}` },
        ],
      };
    }
    return null;
  }

  // Odd hex length
  if (fieldName === 'input' && typeof fieldValue === 'string' && fieldValue.length % 2 !== 0) {
    return {
      errorCode: 'ODD_HEX_LENGTH',
      explanation: `Hexadecimal input "${fieldValue}" has an odd length. Hex inputs require an even number of characters.`,
      suggestedRemediation: [
        { label: 'Add leading zero', value: '0' + fieldValue, description: 'Pad input with leading zero' },
        { label: 'Remove last character', value: fieldValue.slice(0, -1), description: 'Trim odd trailing character' },
      ],
    };
  }

  // ECC off-curve point
  if ((cipherId === 'ecc' || cipherId === 'ecdsa') && fieldName === 'point') {
    return {
      errorCode: 'OFF_CURVE_POINT',
      explanation: `Selected point is not on the curve secp256k1.`,
      suggestedRemediation: [
        { label: 'Use Generator point', value: 'G', description: 'Reset point to standard curve generator G' },
        { label: 'Clear point', value: '', description: 'Clear invalid point selection' },
      ],
    };
  }

  return null;
}

