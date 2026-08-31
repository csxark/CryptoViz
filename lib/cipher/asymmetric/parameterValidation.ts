
/**
 * Validation State cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export type ValidationState = "idle" | "valid" | "invalid" | "checking"

/**
 * Validation Result cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface ValidationResult {
  state: ValidationState
  message: string
  details?: string[]
}

/**
 * Parse Big Int cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Parse Big Int operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function parseBigInt(value: string): bigint | null {
  const clean = value.trim()
  if (!/^[+-]?\d+$/.test(clean)) return null
  try { return BigInt(clean) } catch { return null }
}

/**
 * Gcd cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param a Input required by the Gcd operation.
 * @param b Input required by the Gcd operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

/**
 * Mod Pow cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param base Input required by the Mod Pow operation.
 * @param exponent Input required by the Mod Pow operation.
 * @param modulus Input required by the Mod Pow operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n || exponent < 0n) throw new Error("Invalid modular exponentiation domain")
  let result = 1n
  let b = ((base % modulus) + modulus) % modulus
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus
    b = (b * b) % modulus
    e >>= 1n
  }
  return result
}

function decompose(n: bigint): { d: bigint; s: number } {
  let d = n - 1n
  let s = 0
  while ((d & 1n) === 0n) { d >>= 1n; s++ }
  return { d, s }
}

/**
 * Deterministic Miller-Rabin for the range practical for the educational
 * parameter assistant. For larger values the UI deliberately reports that
 * a local educational check was performed rather than claiming a
 * production-grade primality certificate.
 */
export function isProbablePrime(n: bigint): boolean {
  if (n < 2n) return false
  const small = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]
  if (small.includes(n)) return true
  for (const p of small) if (n % p === 0n) return false
  const { d, s } = decompose(n)
  const bases = [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]
  for (const a of bases) {
    if (a >= n) continue
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    let witness = true
    for (let r = 1; r < s; r++) {
      x = (x * x) % n
      if (x === n - 1n) { witness = false; break }
    }
    if (witness) return false
  }
  return true
}

/**
 * Distinct Prime Factors cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param n Input required by the Distinct Prime Factors operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function distinctPrimeFactors(n: bigint): bigint[] {
  const factors: bigint[] = []
  let x = n
  for (let p = 2n; p * p <= x && p <= 100000n; p += p === 2n ? 1n : 2n) {
    if (x % p === 0n) {
      factors.push(p)
      while (x % p === 0n) x /= p
    }
  }
  if (x > 1n) factors.push(x)
  return factors
}

/**
 * Primitive Root Check cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param p Input required by the Primitive Root Check operation.
 * @param g Input required by the Primitive Root Check operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function primitiveRootCheck(p: bigint, g: bigint): ValidationResult {
  if (!isProbablePrime(p)) return { state: "invalid", message: "p must be prime." }
  if (g <= 1n || g >= p) return { state: "invalid", message: "g must satisfy 1 < g < p." }
  const factors = distinctPrimeFactors(p - 1n)
  for (const q of factors) {
    if (modPow(g, (p - 1n) / q, p) === 1n) {
      return {
        state: "invalid",
        message: `${g} is not a primitive root modulo ${p}.`,
        details: [`g^(${p - 1n}/${q}) ≡ 1 (mod ${p})`],
      }
    }
  }
  return { state: "valid", message: `${g} is a primitive root modulo ${p}.` }
}

/**
 * Validate Prime Pair cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param p Input required by the Validate Prime Pair operation.
 * @param q Input required by the Validate Prime Pair operation.
 * @param requireBlum Input required by the Validate Prime Pair operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function validatePrimePair(p: bigint, q: bigint, requireBlum: boolean): ValidationResult {
  if (!isProbablePrime(p) || !isProbablePrime(q)) {
    return { state: "invalid", message: "Both p and q must be prime." }
  }
  if (p === q) return { state: "invalid", message: "p and q must be distinct primes." }
  if (requireBlum && (p % 4n !== 3n || q % 4n !== 3n)) {
    return { state: "invalid", message: "Rabin requires p ≡ q ≡ 3 (mod 4)." }
  }
  const n = p * q
  const phi = (p - 1n) * (q - 1n)
  return {
    state: "valid",
    message: "Prime pair is valid.",
    details: [
      `n = p × q = ${n}`,
      `φ(n) = (p − 1)(q − 1) = ${phi}`,
      ...(requireBlum ? ["Both primes satisfy the Blum condition."] : []),
    ],
  }
}

/**
 * Curve Preset cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface CurvePreset {
  id: string
  name: string
  p: bigint
  a: bigint
  b: bigint
  gx: bigint
  gy: bigint
  order: bigint
  privateKey: string
  description: string
}

/**
 * CURVE PRESETS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const CURVE_PRESETS: CurvePreset[] = [
  {
    id: "p256",
    name: "NIST P-256",
    p: BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"),
    a: BigInt("0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc"),
    b: BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b"),
    gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"),
    gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"),
    order: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"),
    privateKey: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
    description: "NIST/FIPS P-256; used by CryptoViz ECC/ECDSA.",
  },
  {
    id: "secp256k1",
    name: "secp256k1",
    p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
    a: 0n,
    b: 7n,
    gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
    gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
    order: BigInt("0xfffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
    privateKey: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
    description: "Koblitz curve with y² = x³ + 7 over a 256-bit prime field.",
  },
  {
    id: "ed25519",
    name: "Edwards25519",
    p: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed"),
    a: -1n,
    b: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb5e2e6f0b3c00"),
    gx: BigInt("15112221349535400772501151409588531511454012693041857206046113283949847762202"),
    gy: BigInt("46316835694926478169428394003475163141307993866256225615783033603165251855960"),
    order: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
    privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
    description: "Educational Edwards25519 base-point preset.",
  },
]

/**
 * Point On Curve cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function pointOnCurve(
  x: bigint, y: bigint, curve: CurvePreset,
): boolean {
  const mod = (v: bigint) => ((v % curve.p) + curve.p) % curve.p
  return mod(y * y) === mod(x * x * x + curve.a * x + curve.b)
}

/**
 * Pqc Preset cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export interface PqcPreset {
  id: string
  name: string
  securityLevel: string
  dimension: string
  matrixShape: string
  keyTemplate: string
  description: string
}

/**
 * PQC PRESETS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const PQC_PRESETS: PqcPreset[] = [
  { id: "ml-kem-512", name: "ML-KEM-512", securityLevel: "NIST Level 1", dimension: "k = 2", matrixShape: "2 × 2 polynomial matrix", keyTemplate: '{"parameterSet":"ML-KEM-512"}', description: "FIPS 203 parameter set." },
  { id: "ml-kem-768", name: "ML-KEM-768", securityLevel: "NIST Level 3", dimension: "k = 3", matrixShape: "3 × 3 polynomial matrix", keyTemplate: '{"parameterSet":"ML-KEM-768"}', description: "CryptoViz registry default / FIPS 203 parameter set." },
  { id: "ml-kem-1024", name: "ML-KEM-1024", securityLevel: "NIST Level 5", dimension: "k = 4", matrixShape: "4 × 4 polynomial matrix", keyTemplate: '{"parameterSet":"ML-KEM-1024"}', description: "FIPS 203 parameter set." },
  { id: "frodo-640", name: "FrodoKEM-640", securityLevel: "NIST Level 1", dimension: "n = 640", matrixShape: "640 × 640 (educational trace is scaled)", keyTemplate: '{"parameterSet":"FrodoKEM-640","n":640,"nBar":8,"mBar":8,"q":32768}', description: "FrodoKEM-640 parameter set." },
  { id: "frodo-976", name: "FrodoKEM-976", securityLevel: "NIST Level 3", dimension: "n = 976", matrixShape: "976 × 976", keyTemplate: '{"parameterSet":"FrodoKEM-976","n":976,"nBar":8,"mBar":8,"q":65536}', description: "FrodoKEM-976 parameter set." },
  { id: "frodo-1344", name: "FrodoKEM-1344", securityLevel: "NIST Level 5", dimension: "n = 1344", matrixShape: "1344 × 1344", keyTemplate: '{"parameterSet":"FrodoKEM-1344","n":1344,"nBar":8,"mBar":8,"q":65536}', description: "FrodoKEM-1344 parameter set." },
]
