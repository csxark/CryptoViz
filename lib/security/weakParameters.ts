import type { ConversionHistoryEntry } from '../utils/conversionHistory'

export type WeakParameterSeverity = 'critical' | 'high' | 'warning'

export interface WeakParameterFinding {
  id: string
  severity: WeakParameterSeverity
  title: string
  explanation: string
  attackVector: string
  reference: string
}

export interface WeakParameterInput {
  cipherId: string
  key: string
  input?: string
  options?: Record<string, unknown>
  history?: ConversionHistoryEntry[]
}

// DES's four weak keys plus the twelve keys that form six semi-weak pairs.
// Upper-cased/lower-cased input is normalized once before the O(1) Set lookup.
const DES_WEAK_KEYS = new Set([
  '0101010101010101',
  'FEFEFEFEFEFEFEFE',
  'E0E0E0E0F1F1F1F1',
  '1F1F1F1F0E0E0E0E',
])

const DES_SEMI_WEAK_KEYS = new Set([
  '01FE01FE01FE01FE', 'FE01FE01FE01FE01',
  '1FE01FE00EF10EF1', 'E01FE01FF10EF10E',
  '01E001E001F101F1', 'E001E001F101F101',
  '1FFE1FFE0EFE0EFE', 'FE1FFE1FFE0EFE0E',
  '011F011F010E010E', '1F011F010E010E01',
  'E0FEE0FEF1FEF1FE', 'FEE0FEE0FEF1FEF1',
])

function cleanHex(value: string): string {
  return value.replace(/[\s:]/g, '').toUpperCase()
}

function hexByteLength(value: string): number | null {
  const clean = cleanHex(value)
  if (!/^[0-9A-F]+$/.test(clean) || clean.length % 2 !== 0) return null
  return clean.length / 2
}

function parseRsaExponent(key: string): bigint | null {
  const trimmed = key.trim()
  if (!trimmed) return null

  try {
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as { e?: string | number }
      return parsed.e === undefined ? null : BigInt(parsed.e)
    }

    const parts = trimmed.split(/[\s,]+/).filter(Boolean)
    if (parts.length < 2) return null
    return BigInt(parts[parts.length - 1])
  } catch {
    return null
  }
}

function parseTripleDesKeys(key: string): [string, string, string] | null {
  const clean = cleanHex(key)
  if (!/^[0-9A-F]+$/.test(clean)) return null
  if (clean.length === 32) {
    const k1 = clean.slice(0, 16)
    const k2 = clean.slice(16, 32)
    return [k1, k2, k1]
  }
  if (clean.length === 48) {
    return [clean.slice(0, 16), clean.slice(16, 32), clean.slice(32, 48)]
  }
  return null
}

function extractNonce(cipherId: string, key: string, options: Record<string, unknown>): string | null {
  if (cipherId === 'chacha20-poly1305') {
    const nonce = key.split('|')[1]?.split(':')[0]?.trim()
    return nonce ? cleanHex(nonce) : null
  }

  if (cipherId === 'aes-gcm') {
    const iv = typeof options.iv === 'string' ? options.iv : ''
    return iv ? cleanHex(iv) : null
  }

  return null
}

function isAllZeroHex(value: string): boolean {
  return value.length > 0 && /^0+$/.test(value)
}

export function detectWeakParameters({
  cipherId,
  key,
  options = {},
  history = [],
}: WeakParameterInput): WeakParameterFinding[] {
  const findings: WeakParameterFinding[] = []
  const normalizedCipher = cipherId.toLowerCase()
  const normalizedKey = cleanHex(key)

  if (normalizedCipher === 'des') {
    if (DES_WEAK_KEYS.has(normalizedKey)) {
      findings.push({
        id: 'des-weak-key',
        severity: 'critical',
        title: 'DES weak key detected (self-inverse encryption)',
        explanation: 'This key makes the DES key schedule generate the same round subkey repeatedly. Consequently, applying DES twice with this key returns the original plaintext: Eₖ(Eₖ(P)) = P.',
        attackVector: 'An attacker can recognize the degenerate key schedule and exploit the reduced structure; the key is unsuitable for cryptographic protection.',
        reference: 'NIST SP 800-57 / FIPS 46-3 historical DES guidance',
      })
    } else if (DES_SEMI_WEAK_KEYS.has(normalizedKey)) {
      findings.push({
        id: 'des-semi-weak-key',
        severity: 'high',
        title: 'DES semi-weak key detected',
        explanation: 'This key belongs to one of DES’s six semi-weak key pairs. The paired keys have a reciprocal encryption/decryption relationship that creates unusual, avoidable structure in the cipher.',
        attackVector: 'Known-plaintext analysis and key-pair testing can take advantage of the predictable relationship. Semi-weak DES keys should never be selected deliberately.',
        reference: 'FIPS 46-3 historical DES key-schedule analysis',
      })
    }
  }

  if (normalizedCipher === '3des' || normalizedCipher === 'des3' || normalizedCipher === 'triple-des') {
    const keys = parseTripleDesKeys(key)
    if (keys) {
      const [k1, k2, k3] = keys
      if (k1 === k2 && k2 === k3) {
        findings.push({
          id: '3des-single-key',
          severity: 'critical',
          title: '3DES has collapsed to single DES',
          explanation: 'All three DES stages use the same key, so Eₖ(Dₖ(Eₖ(P))) reduces to Eₖ(P). The construction therefore provides only legacy single-DES security.',
          attackVector: 'The effective key space is the single-DES key space, which is considered brute-force breakable with modern resources.',
          reference: 'NIST SP 800-67 / Triple-DES keying options',
        })
      } else if (k1 === k2 || k2 === k3) {
        findings.push({
          id: '3des-key-equivalence',
          severity: 'high',
          title: '3DES subkey equivalence detected',
          explanation: 'Two adjacent 3DES stages share the same key. Their E/D pair cancels algebraically, reducing the construction to a single DES operation under the remaining key.',
          attackVector: 'The effective security is reduced to the remaining DES key and loses the intended multi-key protection.',
          reference: 'NIST SP 800-67 / Triple-DES keying options',
        })
      }
    }
  }

  if (normalizedCipher === 'rsa') {
    const exponent = parseRsaExponent(key)
    if (exponent !== null && exponent <= 2n) {
      findings.push({
        id: 'rsa-insecure-exponent',
        severity: 'critical',
        title: 'RSA public exponent is insecure',
        explanation: `The configured exponent e = ${exponent.toString()} is below the conventional minimum of 3. e = 1 is the identity transformation and does not provide encryption at all.`,
        attackVector: 'An identity or trivially weak exponent can expose plaintext immediately or invalidate the assumptions behind RSA security.',
        reference: 'RFC 8017 / PKCS #1 RSA requirements',
      })
    } else if (exponent !== null && exponent % 2n === 0n) {
      findings.push({
        id: 'rsa-even-exponent',
        severity: 'warning',
        title: 'RSA exponent should be odd',
        explanation: `The configured exponent e = ${exponent.toString()} is even. RSA public exponents are normally odd and must be coprime with λ(n); this value is likely to fail the RSA key-validity requirements.`,
        attackVector: 'A non-coprime exponent can make the private exponent undefined and cause encryption/decryption to fail or produce an invalid key configuration.',
        reference: 'RFC 8017 / PKCS #1 RSA key-generation requirements',
      })
    } else if (exponent === 3n) {
      findings.push({
        id: 'rsa-small-e',
        severity: 'warning',
        title: 'RSA small exponent: e = 3',
        explanation: 'e = 3 is not inherently broken, but textbook or unpadded RSA with small messages can become vulnerable because m³ may be recovered without modular reduction.',
        attackVector: 'Low-exponent attacks and broadcast attacks become relevant when RSA is used without randomized, standards-compliant padding such as RSA-OAEP.',
        reference: 'RFC 8017 / RSA-OAEP requirements; Hastad-style broadcast attack literature',
      })
    }
  }

  if (normalizedCipher === 'chacha20-poly1305') {
    const keyHex = key.split('|')[0] ?? ''
    if (isAllZeroHex(cleanHex(keyHex)) && hexByteLength(keyHex) === 32) {
      findings.push({
        id: 'zero-stream-key',
        severity: 'critical',
        title: 'All-zero stream-cipher key detected',
        explanation: 'The configured 256-bit key is entirely zero. A fixed, predictable secret destroys the security assumptions of the stream cipher and its Poly1305 authentication layer.',
        attackVector: 'Anyone who knows the public configuration can reproduce the keystream and authentication key, so confidentiality and authenticity are lost.',
        reference: 'RFC 8439 key-generation and key-management requirements',
      })
    }
  }

  const nonce = extractNonce(normalizedCipher, key, options)
  if (nonce) {
    const pair = `${normalizedCipher}:${nonce}`
    const reused = history.some((entry) => {
      const entryParameters = entry.parameters
      const entryNonce = entryParameters?.nonce ?? entryParameters?.iv
      if (!entryNonce) return false
      return `${entry.cipherId.toLowerCase()}:${cleanHex(entryNonce)}` === pair
    })

    if (reused) {
      findings.push({
        id: 'aead-nonce-reuse',
        severity: 'critical',
        title: 'AEAD nonce / IV reuse detected',
        explanation: 'This key and nonce/IV pair has already been used in the local session history. AEAD schemes require nonce uniqueness for each key.',
        attackVector: 'Nonce reuse can reveal relationships between plaintexts and, for GCM, can compromise the GHASH authentication key H; for ChaCha20-Poly1305 it reuses the one-time Poly1305 key.',
        reference: normalizedCipher === 'aes-gcm' ? 'NIST SP 800-38D §8 — GCM IV uniqueness' : 'RFC 8439 §4 — nonce uniqueness',
      })
    }
  }

  return findings
}

export const weakParameterSets = {
  desWeak: DES_WEAK_KEYS,
  desSemiWeak: DES_SEMI_WEAK_KEYS,
}
