/**
 * Centralized cryptographic diagnostic system.
 * Transforms cryptographic input errors into educational, actionable hints.
 * @see CIPHER_ENGINE.md section on error handling
 */

import type { CipherError } from './errors'

export type DiagnosticCode =
  | 'NON_COPRIME_MULTIPLIER'
  | 'SINGULAR_MATRIX'
  | 'COMPOSITE_PRIME_INPUT'
  | 'ODD_HEX_LENGTH'
  | 'OFF_CURVE_POINT'

export interface RemediationOption {
  label: string
  value: string | number
  description?: string
}

export interface Diagnostic {
  errorCode: DiagnosticCode
  explanation: string
  suggestedRemediation: RemediationOption[]
}

/**
 * Extended Euclidean algorithm for GCD calculation.
 */
function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

/**
 * Simple primality test for small numbers (deterministic for the range we need).
 */
function isSmallPrime(n: number): boolean {
  if (n < 2) return false
  if (n === 2 || n === 3) return true
  if (n % 2 === 0) return false
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false
  }
  return true
}

/**
 * Find the nearest prime to a given number (deterministic).
 * Searches upward first, then downward if needed.
 */
function findNearestPrime(n: number, maxDistance: number = 100): number | null {
  // Search upward
  for (let i = 0; i <= maxDistance; i++) {
    if (isSmallPrime(n + i)) return n + i
  }
  // Search downward
  for (let i = 1; i <= maxDistance; i++) {
    if (n - i >= 2 && isSmallPrime(n - i)) return n - i
  }
  return null
}

/**
 * Generate valid coprime multipliers for Affine cipher (mod 26).
 * Returns numbers 1-25 that are coprime with 26.
 */
function generateCoprimeMultipliers(): number[] {
  const coprimes: number[] = []
  for (let i = 1; i < 26; i++) {
    if (gcd(i, 26) === 1) {
      coprimes.push(i)
    }
  }
  return coprimes
}

/**
 * Generate valid invertible 2x2 matrices for Hill cipher.
 * Returns keys that produce determinants coprime with 26.
 */
function generateValidHillKeys(): string[] {
  const validKeys: string[] = []
  const testKeys = ['HILL', 'GYBN', 'PQRS', 'ABCD', 'EFGH', 'IJKL', 'MNOP', 'TUVW', 'WXYZ']
  
  for (const key of testKeys) {
    const clean = key.toUpperCase().replace(/[^A-Z]/g, '')
    if (clean.length !== 4) continue
    
    const v = clean.split('').map((c) => c.charCodeAt(0) - 65)
    const det = ((v[0] * v[3] - v[1] * v[2]) % 26 + 26) % 26
    
    if (gcd(det, 26) === 1) {
      validKeys.push(key)
    }
  }
  
  return validKeys
}

/**
 * Generate diagnostic for Affine cipher non-coprime multiplier.
 */
function diagnoseNonCoprimeMultiplier(value: number): Diagnostic {
  const currentGcd = gcd(value, 26)
  const coprimes = generateCoprimeMultipliers()
  
  return {
    errorCode: 'NON_COPRIME_MULTIPLIER',
    explanation: `The multiplier ${value} is not coprime with 26 (modulus). GCD(${value}, 26) = ${currentGcd}. For the Affine cipher to be invertible, the multiplier must have a modular inverse, which requires gcd(a, 26) = 1. Without this property, decryption is impossible because multiple plaintext letters would map to the same ciphertext letter.`,
    suggestedRemediation: coprimes.slice(0, 5).map((c) => ({
      label: `Use multiplier ${c}`,
      value: c,
      description: `GCD(${c}, 26) = 1, so a modular inverse exists`,
    })),
  }
}

/**
 * Generate diagnostic for Hill cipher singular matrix.
 */
function diagnoseSingularMatrix(key: string, determinant: number): Diagnostic {
  const currentGcd = gcd(determinant, 26)
  const validKeys = generateValidHillKeys()
  
  return {
    errorCode: 'SINGULAR_MATRIX',
    explanation: `The key matrix has determinant ${determinant}, which shares a factor of ${currentGcd} with 26. A matrix is invertible mod 26 only if gcd(det, 26) = 1. Your matrix cannot be inverted, making decryption impossible. The determinant ${determinant} and modulus 26 have common factor ${currentGcd}, so no modular inverse exists.`,
    suggestedRemediation: validKeys.map((k) => ({
      label: `Use key "${k}"`,
      value: k,
      description: `Produces an invertible matrix mod 26`,
    })),
  }
}

/**
 * Generate diagnostic for RSA composite prime input.
 */
function diagnoseCompositePrime(input: number, fieldName: string): Diagnostic {
  const nearestPrime = findNearestPrime(input)
  
  return {
    errorCode: 'COMPOSITE_PRIME_INPUT',
    explanation: `The value ${input} provided for ${fieldName} is not a prime number. RSA requires two distinct prime numbers (p and q) to generate the modulus n = p × q and Euler's totient φ(n) = (p-1)(q-1). Using composite numbers breaks the mathematical foundation of RSA and makes the cryptosystem insecure.`,
    suggestedRemediation: nearestPrime
      ? [
          {
            label: `Use nearest prime ${nearestPrime}`,
            value: nearestPrime,
            description: `Closest prime number to ${input}`,
          },
        ]
      : [
          {
            label: 'Use a known small prime (e.g., 61, 67)',
            value: 61,
            description: 'Commonly used small prime for teaching',
          },
        ],
  }
}

/**
 * Generate diagnostic for odd hexadecimal length.
 */
function diagnoseOddHexLength(field: string): Diagnostic {
  return {
    errorCode: 'ODD_HEX_LENGTH',
    explanation: `${field} must have an even number of characters because each byte is represented by exactly two hex digits (00-FF). An odd-length hex string cannot be correctly decoded into bytes — the last digit would be orphaned without its pair.`,
    suggestedRemediation: [
      {
        label: 'Add leading zero',
        value: '0',
        description: 'Prepend "0" to make the length even',
      },
      {
        label: 'Remove last character',
        value: 'remove_last',
        description: 'Remove the orphaned final hex digit',
      },
    ],
  }
}

/**
 * Generate diagnostic for ECC off-curve point.
 */
function diagnoseOffCurvePoint(x: string, y: string, curve: string): Diagnostic {
  return {
    errorCode: 'OFF_CURVE_POINT',
    explanation: `The point (${x}, ${y}) does not lie on the ${curve} elliptic curve. In elliptic curve cryptography, all points used in computations must satisfy the curve equation y² = x³ + ax + b (mod p). Off-curve points break the group law and produce invalid results.`,
    suggestedRemediation: [
      {
        label: 'Use curve generator point',
        value: 'generator',
        description: 'Use the standard base point for this curve',
      },
      {
        label: 'Clear point coordinates',
        value: '',
        description: 'Reset to use default point',
      },
    ],
  }
}

/**
 * Main diagnostic function that maps errors to diagnostics.
 * Returns null for unsupported/unmapped errors.
 */
export function diagnoseError(error: CipherError, context?: {
  cipherId?: string
  fieldName?: string
  fieldValue?: string | number
  additionalData?: Record<string, unknown>
}): Diagnostic | null {
  const { cipherId, fieldName, fieldValue, additionalData } = context || {}
  
  // Map existing error codes to diagnostic codes
  switch (error.code) {
    case 'INVALID_KEY': {
      // Affine non-coprime multiplier
      if (cipherId === 'affine' && fieldName === 'a' && typeof fieldValue === 'number') {
        return diagnoseNonCoprimeMultiplier(fieldValue)
      }
      
      // Hill singular matrix
      if (cipherId === 'hill' && additionalData?.determinant !== undefined) {
        return diagnoseSingularMatrix(
          String(fieldValue || ''),
          Number(additionalData.determinant)
        )
      }
      
      // RSA composite prime
      if ((cipherId === 'rsa' || cipherId === 'rsaKeyGeneration') && 
          (fieldName === 'p' || fieldName === 'q') && 
          typeof fieldValue === 'number') {
        if (!isSmallPrime(fieldValue)) {
          return diagnoseCompositePrime(fieldValue, fieldName)
        }
      }
      
      break
    }
    
    case 'INVALID_INPUT': {
      // Odd hex length - check for various error message patterns
      if (error.message?.toLowerCase().includes('even') || 
          error.message?.toLowerCase().includes('hex') ||
          error.message?.toLowerCase().includes('hexadecimal')) {
        return diagnoseOddHexLength(fieldName || 'Input')
      }
      
      // ECC off-curve point
      if (cipherId?.includes('ecc') || cipherId?.includes('ec')) {
        const x = String(additionalData?.x || fieldValue)
        const y = String(additionalData?.y || '')
        const curve = String(additionalData?.curve || 'secp256k1')
        return diagnoseOffCurvePoint(x, y, curve)
      }
      
      break
    }
    
    default:
      // Return null for unsupported errors to preserve existing error behavior
      return null
  }
  
  return null
}

/**
 * Check if a specific error code has diagnostic support.
 */
export function hasDiagnosticSupport(errorCode: string): boolean {
  const supportedCodes = ['INVALID_KEY', 'INVALID_INPUT']
  return supportedCodes.includes(errorCode)
}

/**
 * Get all available diagnostic codes.
 */
export function getAllDiagnosticCodes(): DiagnosticCode[] {
  return [
    'NON_COPRIME_MULTIPLIER',
    'SINGULAR_MATRIX',
    'COMPOSITE_PRIME_INPUT',
    'ODD_HEX_LENGTH',
    'OFF_CURVE_POINT',
  ]
}
