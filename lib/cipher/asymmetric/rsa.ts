import { CipherError } from '../../utils/errors'
import { toByteArray, fromByteArray } from '../../utils/encoding'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'
import { isPrime } from '../../asymmetric/rsaKeyGenerationWizard'

// ---------------------------------------------------------------------------
// Real mode: genuine RSA-OAEP (SHA-256) via the WebCrypto API (crypto.subtle).
// ---------------------------------------------------------------------------
const DEMO_RSA_SPKI_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmoHyoJfLKhFKPe3L6rP9C0Kvbby2qSsIObBaj6FCWICpzk8qtR+fjKzWLwZvqAIYH2TaaI+CjZwnIgOUQUVZwrOQeFZ2ZLHzsQKFa2xZ9bD/1PAN4YgJuo2ARTGb31VuPEKxdAjqYgt++R1UCmaMzpo2sjc0QRJFK03zQ52W9rPCS7IdMvxM73it66TWhFRc8+9nvmjLMJTTRevrypybPp70xyMnwPASLpG/dycfrjt5PURkQb8klYMMwGiRXyqTw1t6qckBcFq5kuQCHi8E0EbTsQRLaq+BLRHHgIlxQ8GkrPUJeO6olu4jVwl8w2x4Es3UagQSgBY5s3aZQwClxQIDAQAB'
const DEMO_RSA_PKCS8_B64 =
  'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCagfKgl8sqEUo97cvqs/0LQq9tvLapKwg5sFqPoUJYgKnOTyq1H5+MrNYvBm+oAhgfZNpoj4KNnCciA5RBRVnCs5B4VnZksfOxAoVrbFn1sP/U8A3hiAm6jYBFMZvfVW48QrF0COpiC375HVQKZozOmjayNzRBEkUrTfNDnZb2s8JLsh0y/EzveK3rpNaEVFzz72e+aMswlNNF6+vKnJs+nvTHIyfA8BIukb93Jx+uO3k9RGRBvySVgwzAaJFfKpPDW3qpyQFwWrmS5AIeLwTQRtOxBEtqr4EtEceAiXFDwaSs9Ql47qiW7iNXCXzDbHgSzdRqBBKAFjmzdplDAKXFAgMBAAECggEAGmxu2hgbnq4mTEEGxrTRacOVzOahNn0tgvAuDLI/bnNSlv3jB+bImn5UguZO4iS5i2TsFUW1xhIWfzKtgBwkJbAf3PSserwUOQl9V8nH+MS0e+4x8YgaYdUhQrQhPCiYGaYuQvHjY7EjnebuIHk5S3wELqZSQW6mdal3GPEyiC4h3WJidE88RysNJjhJdrWwHw3u/ccZP49N2ZujxXciPUHDbboGRPKlI9p5Sj4vfM3/Et0bONpqtGgiJRp068kBkH4AKcYNO1tKWPP8TvC2tdPBN3hmzK+/x2B9YkR64tuh55nEOeQNi/k7gAsaqMPuDycEAX95VQM9xqpxp0PBYQKBgQDIP8c7YoV5yIsdRpg/AEx64r020pmsaemwxpox1GA7SeIKxvoxUxFrdGUBDiPzf8PH3f/dPb/oSwHwG2AgK3rvhTRuPScPjiAP/zkmw8T/4iey4kLHw/IFdDZU7L7FjvS/RJXxaw35MconhYKUAyPJs3D6/fRE28IJZQ4sQ4NvvwKBgQDFhhCHB20ge1zt/S6WE6xdHdk/dFl3bdnKCW0x/O4ssThr7k+cAMLUQq4t8szc/ho7INzIS64GDE/907S1CJwmfh3lsQNcYZPirF+i0uYk8M5ig/vX9G6gSZIQwW5GrG3E/cILXM8n/nngkCSKYDOxxh8yw4IgIcHxlmWtdiNLewKBgBSKBiNfLZWaLjqofQEpRK7uBr5Sx5RZoLCTDknCIMS0BU1Zr1vTy1ucKqf7DVDyb+BWMuI8bSykVOSNykRCcW+T2Bbeit0blMpPQUtqlRAx4CSG9JaM0IwiqVf4mHCnAw+DN2X1tw8yPivjk8ser1MG5rW3ypAtgi94gAWmPxr9AoGBALhLqkgSqcNQ1xhGzpzApmYLX5RRHtjL6hUUTooBkMiqYhZyOF06aI5b2OCOVo8rl5Xrx5Qq6KhD/K68RTNUYT2ZFpQlYRllAfLRGjp1xL5a4HYS53xLWJy9iEeR8y6F27WdftvTMIYEbfsVAsMJl7IbRSi8OkF4vdiHlz8Np0jZAoGBAMYtXgikg1wYPmY1EDLikI/44y0tCMp62JtC+6suBA+OxUZM5R89z2liNvRHbwl9Pha3XeOW13xSmfX9Reshdzh87dAtwj8beI+5ycY1jsG4/OskbdRRh24xy1o8lqyBJSfRHhhd3C3wksv1Wy3L9vLnDgEZkD7/bVscxmGHs6Go'

const RSA_OAEP_MAX_BYTES = 190
const RSA_OAEP_ALGO = { name: 'RSA-OAEP', hash: 'SHA-256' } as const

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new CipherError(
      'WEBCRYPTO_UNAVAILABLE',
      'WebCrypto (crypto.subtle) is unavailable in this environment; RSA real mode requires it.'
    )
  }
  return subtle
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource
}

let demoPublicKeyPromise: Promise<CryptoKey> | null = null
let demoPrivateKeyPromise: Promise<CryptoKey> | null = null

function getDemoPublicKey(): Promise<CryptoKey> {
  if (!demoPublicKeyPromise) {
    demoPublicKeyPromise = getSubtle().importKey(
      'spki',
      asBufferSource(toByteArray(DEMO_RSA_SPKI_B64, 'base64')),
      RSA_OAEP_ALGO,
      false,
      ['encrypt']
    )
  }
  return demoPublicKeyPromise
}

function getDemoPrivateKey(): Promise<CryptoKey> {
  if (!demoPrivateKeyPromise) {
    demoPrivateKeyPromise = getSubtle().importKey(
      'pkcs8',
      asBufferSource(toByteArray(DEMO_RSA_PKCS8_B64, 'base64')),
      RSA_OAEP_ALGO,
      false,
      ['decrypt']
    )
  }
  return demoPrivateKeyPromise
}

async function rsaRealEncrypt(
  input: string,
  options: CipherOptions,
  start: number
): Promise<CipherResult> {
  const inputBytes = toByteArray(input, options.encoding || 'utf8')
  if (inputBytes.length > RSA_OAEP_MAX_BYTES) {
    throw new CipherError(
      'INPUT_TOO_LONG',
      `RSA-OAEP with a 2048-bit key can encrypt at most ${RSA_OAEP_MAX_BYTES} bytes at once.`
    )
  }

  const publicKey = await getDemoPublicKey()
  const cipherBuffer = await getSubtle().encrypt(RSA_OAEP_ALGO, publicKey, asBufferSource(inputBytes))
  const output = fromByteArray(new Uint8Array(cipherBuffer), 'hex')

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: '⚠️ Demo Key Warning',
      inputState: '',
      outputState: '',
      note: 'RSA real mode uses a publicly embedded demo key pair for teaching and visualization.',
      isMilestone: true,
    })

    steps.push({
      index: 1,
      label: 'RSA-OAEP 2048-bit Encryption (WebCrypto)',
      inputState: fromByteArray(inputBytes, 'hex'),
      outputState: output,
      note: 'Real mode: plaintext encrypted via genuine RSA-OAEP (SHA-256).',
      isMilestone: true,
    })
  }

  return {
    output,
    outputEncoding: 'hex',
    steps,
    metadata: { ...METADATA, keySize: 2048 },
    durationMs: performance.now() - start,
  }
}

async function rsaRealDecrypt(
  input: string,
  options: CipherOptions,
  start: number
): Promise<CipherResult> {
  let cipherBytes: Uint8Array
  try {
    cipherBytes = toByteArray(input.trim(), 'hex')
  } catch {
    throw new CipherError('INVALID_PADDING', 'Ciphertext must be a hex string produced by RSA real mode.')
  }

  let outputString: string
  try {
    const privateKey = await getDemoPrivateKey()
    const plainBuffer = await getSubtle().decrypt(RSA_OAEP_ALGO, privateKey, asBufferSource(cipherBytes))
    outputString = fromByteArray(new Uint8Array(plainBuffer), 'utf8')
  } catch (err) {
    if (err instanceof CipherError) throw err
    throw new CipherError('INVALID_PADDING', 'RSA-OAEP decryption failed.')
  }

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: '⚠️ Static Demo Key Warning',
      inputState: '',
      outputState: '',
      note: 'Static demo key pair embedded in source code.',
      isMilestone: true,
    })
    steps.push({
      index: 1,
      label: 'RSA-OAEP 2048-bit Decryption (WebCrypto)',
      inputState: input,
      outputState: outputString,
      note: 'Real mode private-key operation via WebCrypto.',
      isMilestone: true,
    })
  }

  return {
    output: outputString,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: 2048 },
    durationMs: performance.now() - start,
  }
}

const METADATA: CipherMetadata = {
  name: 'RSA',
  securityStatus: 'secure',
  yearDesigned: 1977,
  standardBody: 'PKCS #1 / ANSI X9.31',
  securityWarning: '⚠️ This demo uses a static RSA key pair embedded in source code.',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '65',
    key: '3233,17',
    expected: '2790',
    description: 'RSA standard vector in demo mode (encrypt)',
  },
  {
    input: '2790',
    key: '3233,2753',
    expected: '65',
    description: 'RSA standard vector in demo mode (decrypt)',
  },
]

export function extendedGCD(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  if (a === 0n) return { gcd: b, x: 0n, y: 1n }
  const { gcd, x, y } = extendedGCD(b % a, a)
  return { gcd, x: y - (b / a) * x, y: x }
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b]
  }
  return a
}

function lcm(a: bigint, b: bigint): bigint {
  return (a / gcd(a, b)) * b
}

export function modInverse(e: bigint, lambda: bigint): bigint {
  const { gcd, x } = extendedGCD(e, lambda)
  if (gcd !== 1n) {
    throw new CipherError('INVALID_KEY', 'e and lambda(n) are not coprime')
  }
  return ((x % lambda) + lambda) % lambda
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  let currentBase = base % mod
  let currentExp = exp
  while (currentExp > 0n) {
    if (currentExp % 2n === 1n) {
      result = (result * currentBase) % mod
    }
    currentExp = currentExp / 2n
    currentBase = (currentBase * currentBase) % mod
  }
  return result
}

// ---------------------------------------------------------------------------
// CRT Parameters, Garner's Recombination & Bellcore Fault Simulation
// ---------------------------------------------------------------------------
export interface RsaCrtKeyInfo {
  n: bigint;
  p: bigint;
  q: bigint;
  d: bigint;
  dp: bigint;
  dq: bigint;
  qInv: bigint;
}

export function computeCrtParameters(p: bigint, q: bigint, d: bigint): RsaCrtKeyInfo {
  const n = p * q;
  const dp = d % (p - 1n);
  const dq = d % (q - 1n);
  const qInv = modInverse(q, p);
  return { n, p, q, d, dp, dq, qInv };
}

export function decryptCrt(
  c: bigint,
  crtKey: RsaCrtKeyInfo,
  faultInMp: boolean = false
): { m: bigint; mp: bigint; mq: bigint } {
  let mp = modPow(c, crtKey.dp, crtKey.p);
  let mq = modPow(c, crtKey.dq, crtKey.q);

  if (faultInMp) {
    // Simulate Bellcore hardware transient bit-flip corruption in mp
    mp ^= 1n;
  }

  // Garner's recombination formula: h = (mp - mq) * qInv mod p
  const h = ((mp - mq + crtKey.p) * crtKey.qInv) % crtKey.p;
  const m = mq + h * crtKey.q;

  return { m, mp, mq };
}

export function executeBellcoreAttack(faultySignature: bigint, e: bigint, c: bigint, n: bigint): bigint {
  // gcd(s'^e - c, n)
  const se = modPow(faultySignature, e, n);
  const diff = (se - c + n) % n;
  let a = diff;
  let b = n;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

function modPowInstrumented(
  base: bigint,
  exp: bigint,
  mod: bigint
): { result: bigint; steps: { key: string; value: string }[] } {
  const steps: { key: string; value: string }[] = []
  let result = 1n
  let currentBase = base % mod
  let currentExp = exp
  let stepIdx = 0

  steps.push({
    key: 'Initial State',
    value: `base = ${base}, exponent = ${exp}, modulus = ${mod}`,
  })

  while (currentExp > 0n) {
    const bit = currentExp % 2n
    const bitDesc = `bit ${bit}`
    
    if (bit === 1n) {
      const prevResult = result
      result = (result * currentBase) % mod
      steps.push({
        key: `Step ${stepIdx++} (Multiply)`,
        value: `Multiply: ${prevResult} * ${currentBase} mod ${mod} = ${result} (exponent ${bitDesc})`,
      })
    } else {
      steps.push({
        key: `Step ${stepIdx++} (No Multiply)`,
        value: `Keep result: ${result} (exponent ${bitDesc})`,
      })
    }

    const prevBase = currentBase
    currentBase = (currentBase * currentBase) % mod
    steps.push({
      key: `Step ${stepIdx++} (Square)`,
      value: `Square: ${prevBase}^2 mod ${mod} = ${currentBase}`,
    })

    currentExp = currentExp / 2n
  }

  return { result, steps }
}

function parseRsaKey(keyStr: string, isPrivateKey: boolean): { n: bigint; e?: bigint; d?: bigint; p?: bigint; q?: bigint } {
  const cleanKey = keyStr.trim()
  if (!cleanKey) {
    return {
      n: 3233n,
      e: 17n,
      d: 2753n,
    }
  }

  try {
    const parsed = JSON.parse(cleanKey)
    if (parsed.n !== undefined) {
      return {
        n: BigInt(parsed.n),
        e: parsed.e !== undefined ? BigInt(parsed.e) : undefined,
        d: parsed.d !== undefined ? BigInt(parsed.d) : undefined,
        p: parsed.p !== undefined ? BigInt(parsed.p) : undefined,
        q: parsed.q !== undefined ? BigInt(parsed.q) : undefined,
      }
    }
  } catch {}
   
  const parts = cleanKey.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
  if (parts.length === 3) {
    let p: bigint
    let q: bigint
    let e: bigint

    try {
      p = BigInt(parts[0])
      q = BigInt(parts[1])
      e = BigInt(parts[2])
    } catch {
      throw new CipherError('INVALID_KEY', 'Invalid RSA key format.')
    }
    if (p <= 1n || q <= 1n) {
      throw new CipherError('INVALID_KEY', 'p and q must both be greater than 1.')
    }

    if (!isPrime(Number(p)) || !isPrime(Number(q))) {
      throw new CipherError('INVALID_KEY', 'p and q must be prime.')
    }

    const n = p * q
    const lambda = lcm(p - 1n, q - 1n)

    if (isPrivateKey) {
      return { n, d: modInverse(e, lambda), p, q }
    }
    return { n, e, p, q }
  }

  if (parts.length === 2) {
    let n: bigint
    let val: bigint
    try {
      n = BigInt(parts[0])
      val = BigInt(parts[1])
    } catch {
      throw new CipherError('INVALID_KEY', 'Invalid RSA key format.')
    }

    return isPrivateKey ? { n, d: val } : { n, e: val }
  }

  throw new CipherError('INVALID_KEY', 'Invalid RSA key format.')
}

export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult | Promise<CipherResult> {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Input is required.')
  }

  const start = performance.now()
  if (options.mode === 'real') {
    return rsaRealEncrypt(input, options, start)
  }

  const keyInfo = parseRsaKey(key, false)
  const n = keyInfo.n
  const e = keyInfo.e ?? 65537n

  const steps: CipherStep[] = []
  const isNumeric = /^\d+$/.test(input.trim())
  const inputParts = isNumeric 
    ? [BigInt(input.trim())] 
    : Array.from(new TextEncoder().encode(input)).map(b => BigInt(b))

  const ciphertexts: bigint[] = []
  for (let i = 0; i < inputParts.length; i++) {
    const m = inputParts[i]
    if (m >= n) {
      throw new CipherError('INPUT_TOO_LONG', `Input value is >= modulus n (${n}).`)
    }

    if (options.instrument) {
      const { result, steps: powSteps } = modPowInstrumented(m, e, n)
      ciphertexts.push(result)
      steps.push({
        index: steps.length,
        label: `Encrypting block ${i + 1}/${inputParts.length}`,
        inputState: m.toString(16),
        outputState: result.toString(16),
        table: powSteps,
        note: `Computed C = M^e mod n.`,
      })
    } else {
      ciphertexts.push(modPow(m, e, n))
    }
  }

  return {
    output: ciphertexts.join(','),
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: n < 10000n ? 12 : 2048 },
    durationMs: performance.now() - start,
  }
}

export function decrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult | Promise<CipherResult> {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Ciphertext input is required.')
  }

  const start = performance.now()
  if (options.mode === 'real') {
    return rsaRealDecrypt(input, options, start)
  }

  const keyInfo = parseRsaKey(key, true)
  const n = keyInfo.n
  const d = keyInfo.d
  const p = keyInfo.p
  const q = keyInfo.q

  if (!d) {
    throw new CipherError('INVALID_KEY', 'Private exponent d is required.')
  }

  const steps: CipherStep[] = []
  const cipherParts = input.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
  const plaintexts: bigint[] = []

  for (let i = 0; i < cipherParts.length; i++) {
    const c = BigInt(cipherParts[i])
    if (c >= n) {
      throw new CipherError('INPUT_TOO_LONG', `Ciphertext value is >= modulus n (${n}).`)
    }

    // Use CRT acceleration if prime factors p and q are available
    if (p && q) {
      const crtKey = computeCrtParameters(p, q, d);
      const { m } = decryptCrt(c, crtKey);
      plaintexts.push(m);
    } else {
      plaintexts.push(modPow(c, d, n));
    }
  }

  let output = ''
  if (cipherParts.length === 1 && !input.includes(',') && plaintexts[0] < 128n) {
    output = plaintexts[0].toString()
  } else {
    try {
      const bytes = new Uint8Array(plaintexts.map(pt => Number(pt)))
      output = new TextDecoder().decode(bytes)
    } catch {
      output = plaintexts.join(',')
    }
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: n < 10000n ? 12 : 2048 },
    durationMs: performance.now() - start,
  }
}
