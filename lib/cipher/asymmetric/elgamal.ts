/**
 * ElGamal Encryption — public-key scheme based on the discrete logarithm problem.
 * @see CIPHER_ENGINE.md section "ElGamal"
 *
 * Key generation: choose prime p, generator g, private key x (2 <= x <= p-2).
 * Public key: y = g^x mod p.
 * Encrypt: pick random ephemeral k, c1 = g^k mod p, c2 = m * y^k mod p.
 * Decrypt: s = c1^x mod p, m = c2 * s^-1 mod p.
 *
 * Demo mode uses small textbook primes (same "small prime" approach as
 * lib/cipher/asymmetric/rsa.ts and dh.ts) so the full modular arithmetic
 * is visible and reproducible for the visualizer.
 */

import { CipherError } from '../../utils/errors'
import { modInverse } from './rsa'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'ElGamal',
  securityStatus: 'secure', // secure at sufficient key sizes; demo mode uses toy primes for teaching
  yearDesigned: 1985,
  standardBody: 'Discrete Logarithm Problem (DLP)',
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: '4',
    key: '23,5,8,15', // p, g, y, k(ephemeral, fixed for reproducibility)
    expected: '19,8', // c1,c2
    description: 'Encrypt m=4 with p=23, g=5, y=8 (x=6), fixed ephemeral k=15',
  },
  {
    input: '19,8',
    key: '23,5,6', // p, g, x
    expected: '4',
    description: 'Decrypt c1=19,c2=8 with private key x=6 back to m=4',
  },
]

interface ElGamalPublicKey {
  p: bigint
  g: bigint
  y: bigint
  k?: bigint // optional fixed ephemeral key, demo/testing only
}

interface ElGamalPrivateKey {
  p: bigint
  g: bigint
  x: bigint
}

function parsePublicKey(keyStr: string): ElGamalPublicKey {
  const clean = keyStr.trim()
  if (!clean) {
    // Demo defaults: p=23, g=5, y=8 (corresponds to private x=6)
    return { p: 23n, g: 5n, y: 8n }
  }
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length < 3) {
    throw new CipherError(
      'INVALID_KEY',
      'ElGamal public key must be "p,g,y" (optionally "p,g,y,k" to fix the ephemeral key for reproducible output).'
    )
  }
  try {
    const p = BigInt(parts[0])
    const g = BigInt(parts[1])
    const y = BigInt(parts[2])
    const k = parts.length >= 4 ? BigInt(parts[3]) : undefined
    if (p <= 3n) throw new CipherError('INVALID_KEY', 'Prime modulus p must be greater than 3.')
    return { p, g, y, k }
  } catch (err) {
    if (err instanceof CipherError) throw err
    throw new CipherError('INVALID_KEY', 'Invalid ElGamal key format. Key values must be valid integers.')
  }
}

function parsePrivateKey(keyStr: string): ElGamalPrivateKey {
  const clean = keyStr.trim()
  if (!clean) {
    return { p: 23n, g: 5n, x: 6n }
  }
  const parts = clean.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length < 3) {
    throw new CipherError('INVALID_KEY', 'ElGamal private key must be "p,g,x".')
  }
  try {
    const p = BigInt(parts[0])
    const g = BigInt(parts[1])
    const x = BigInt(parts[2])
    if (p <= 3n) throw new CipherError('INVALID_KEY', 'Prime modulus p must be greater than 3.')
    return { p, g, x }
  } catch (err) {
    if (err instanceof CipherError) throw err
    throw new CipherError('INVALID_KEY', 'Invalid ElGamal key format. Key values must be valid integers.')
  }
}

// Cryptographically-irrelevant demo RNG: picks a k in [2, p-2]. Real ElGamal
// requires a fresh, unpredictable k per message — this is teaching code only.
function randomEphemeral(p: bigint): bigint {
  const range = p - 3n // [2, p-2] has (p-4+1) = p-3 values
  if (range <= 0n) throw new CipherError('INVALID_KEY', 'Prime p is too small to pick an ephemeral key.')
  const rand = BigInt(Math.floor(Math.random() * Number(range)))
  return 2n + rand
}

function modPowInstrumented(
  base: bigint,
  exp: bigint,
  mod: bigint,
  label: string
): { result: bigint; table: { key: string; value: string }[] } {
  const table: { key: string; value: string }[] = []
  let result = 1n
  let currentBase = base % mod
  let currentExp = exp
  table.push({ key: `${label} — start`, value: `base=${base}, exp=${exp}, mod=${mod}` })
  while (currentExp > 0n) {
    if (currentExp % 2n === 1n) {
      result = (result * currentBase) % mod
      table.push({ key: `${label} — multiply`, value: `result = ${result}` })
    }
    currentBase = (currentBase * currentBase) % mod
    currentExp = currentExp / 2n
    if (currentExp > 0n) table.push({ key: `${label} — square base`, value: `base = ${currentBase}` })
  }
  return { result, table }
}

export function encrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Message input is required.')
  }
  const start = performance.now()
  const { p, g, y, k: fixedK } = parsePublicKey(key)
  const k = fixedK ?? randomEphemeral(p)

  const isNumeric = /^\d+$/.test(input.trim())
  const blocks = isNumeric
    ? [BigInt(input.trim())]
    : Array.from(new TextEncoder().encode(input)).map((b) => BigInt(b))

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: '',
      outputState: '',
      table: [
        { key: 'p (prime modulus)', value: p.toString() },
        { key: 'g (generator)', value: g.toString() },
        { key: 'y (public key)', value: y.toString() },
        { key: 'k (ephemeral, this message only)', value: k.toString() },
      ],
      note: 'c1 = g^k mod p, c2 = m * y^k mod p. A fresh k should be used for every message in real usage.',
      isMilestone: true,
    })
  }

  const outputs: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const m = blocks[i]
    if (m >= p) {
      throw new CipherError('INPUT_TOO_LONG', `Message value ${m} must be strictly less than p (${p}).`)
    }
    const { result: c1, table: c1Table } = modPowInstrumented(g, k, p, 'c1 = g^k mod p')
    const { result: yk, table: ykTable } = modPowInstrumented(y, k, p, 'y^k mod p')
    const c2 = (m * yk) % p

    outputs.push(`${c1},${c2}`)

    if (options.instrument) {
      steps.push({
        index: steps.length,
        label: `Encrypting block ${i + 1}/${blocks.length} (m=${m})`,
        inputState: m.toString(),
        outputState: `${c1},${c2}`,
        table: [...c1Table, ...ykTable, { key: 'c2 = m * y^k mod p', value: `${m} * ${yk} mod ${p} = ${c2}` }],
        note: `Block ${i + 1}: c1=${c1}, c2=${c2}`,
      })
    }
  }

  const output = outputs.join(';')
  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: p < 10000n ? 12 : 2048 },
    durationMs: performance.now() - start,
  }
}

export function decrypt(input: string, key: string = '', options: CipherOptions = {}): CipherResult {
  if (input === undefined || input === null || input === '') {
    throw new CipherError('INPUT_REQUIRED', 'Ciphertext input is required.')
  }
  const start = performance.now()
  const { p, g, x } = parsePrivateKey(key)

  const blocks = input.split(';').map((s) => s.trim()).filter(Boolean)
  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: '',
      outputState: '',
      table: [
        { key: 'p (prime modulus)', value: p.toString() },
        { key: 'g (generator)', value: g.toString() },
        { key: 'x (private key)', value: x.toString() },
      ],
      note: 's = c1^x mod p, m = c2 * s^-1 mod p.',
      isMilestone: true,
    })
  }

  const plaintexts: bigint[] = []
  for (let i = 0; i < blocks.length; i++) {
    const parts = blocks[i].split(',').map((s) => s.trim())
    if (parts.length !== 2) {
      throw new CipherError('INVALID_INPUT', `Block ${i + 1} must be "c1,c2" (got "${blocks[i]}").`)
    }
    const c1 = BigInt(parts[0])
    const c2 = BigInt(parts[1])
    const { result: s, table: sTable } = modPowInstrumented(c1, x, p, 's = c1^x mod p')
    const sInv = modInverse(s, p)
    const m = (c2 * sInv) % p
    plaintexts.push(m)

    if (options.instrument) {
      steps.push({
        index: steps.length,
        label: `Decrypting block ${i + 1}/${blocks.length}`,
        inputState: blocks[i],
        outputState: m.toString(),
        table: [...sTable, { key: 's^-1 mod p', value: sInv.toString() }, { key: 'm = c2 * s^-1 mod p', value: m.toString() }],
        note: `Recovered m = ${m}`,
      })
    }
  }

  let output: string
  if (plaintexts.length === 1) {
    output = plaintexts[0].toString()
  } else {
    try {
      output = new TextDecoder().decode(new Uint8Array(plaintexts.map((v) => Number(v))))
    } catch {
      output = plaintexts.join(',')
    }
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: { ...METADATA, keySize: p < 10000n ? 12 : 2048 },
    durationMs: performance.now() - start,
  }
}
