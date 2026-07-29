import { CipherError } from '../../utils/errors'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '../types'

interface MHKey { privateSequence: bigint[]; modulus: bigint; multiplier: bigint }

function parseKey(key: string): MHKey {
  const parts = key.split(',').map((s) => s.trim())
  if (parts.length < 4) throw new CipherError('INVALID_KEY', 'Key must be: seq1,seq2,...,seqN,modulus,multiplier')
  const nums = parts.map((p) => BigInt(p))
  const multiplier = nums.pop()!
  const modulus = nums.pop()!
  const privateSequence = nums
  let sum = 0n
  for (const term of privateSequence) {
    if (term <= sum) throw new CipherError('INVALID_KEY', 'Private sequence must be superincreasing')
    sum += term
  }
  if (modulus <= sum) throw new CipherError('INVALID_KEY', 'Modulus must exceed the sum of the private sequence')
  function gcd(a: bigint, b: bigint): bigint { while (b) [a, b] = [b, a % b]; return a }
  if (gcd(multiplier, modulus) !== 1n) throw new CipherError('INVALID_KEY', 'Multiplier must be coprime to modulus')
  return { privateSequence, modulus, multiplier }
}

function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [a, m]
  let [oldS, s] = [1n, 0n]
  while (r !== 0n) {
    const q = oldR / r
    ;[oldR, r] = [r, oldR - q * r]
    ;[oldS, s] = [s, oldS - q * s]
  }
  return ((oldS % m) + m) % m
}

function publicKeyOf(mh: MHKey): bigint[] {
  return mh.privateSequence.map((t) => (t * mh.multiplier) % mh.modulus)
}

function validateInputLen(bytes: number) {
  if (bytes === 0) throw new CipherError('INPUT_REQUIRED', 'Input cannot be empty')
  if (bytes > 4096) throw new CipherError('INPUT_TOO_LONG', 'Input exceeds 4096 byte limit')
}

function encryptCore(input: string, mh: MHKey, steps: CipherStep[] | null): string {
  const bytes = new TextEncoder().encode(input)
  validateInputLen(bytes.length)
  const n = mh.privateSequence.length
  const pub = publicKeyOf(mh)
  const bits: number[] = []
  for (const byte of bytes) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1)
  while (bits.length % n !== 0) bits.push(0)
  const cipherNums: bigint[] = []
  for (let i = 0; i < bits.length; i += n) {
    const block = bits.slice(i, i + n)
    let sum = 0n
    block.forEach((bit, idx) => { if (bit) sum += pub[idx] })
    cipherNums.push(sum)
    steps?.push({
      index: steps.length, label: `Block ${cipherNums.length}`, inputState: block.join(''),
      outputState: sum.toString(), note: 'Sum of public-key terms where plaintext bit = 1',
    })
  }
  return cipherNums.join(',')
}

function decryptCore(input: string, mh: MHKey, steps: CipherStep[] | null): string {
  const multInv = modInverse(mh.multiplier, mh.modulus)
  const cipherNums = input.split(',').map((s) => BigInt(s.trim()))
  const n = mh.privateSequence.length
  const bits: number[] = []
  cipherNums.forEach((c) => {
    let target = (c * multInv) % mh.modulus
    steps?.push({ index: steps?.length ?? 0, label: 'Undo multiplier', inputState: c.toString(), outputState: target.toString(), note: 'w^-1 * C mod m' })
    const block: number[] = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      if (mh.privateSequence[i] <= target) { block[i] = 1; target -= mh.privateSequence[i] }
    }
    bits.push(...block)
  })
  const out = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < out.length * 8; i++) if (bits[i]) out[Math.floor(i / 8)] |= 1 << (7 - (i % 8))
  return new TextDecoder().decode(out)
}

function run(input: string, key: string, options: CipherOptions, direction: 'encrypt' | 'decrypt'): CipherResult {
  const start = performance.now()
  const mh = parseKey(key)
  const steps: CipherStep[] = []
  const collect = options.instrument ? steps : null
  const output = direction === 'encrypt' ? encryptCore(input, mh, collect) : decryptCore(input, mh, collect)
  return {
    output, outputEncoding: 'utf8', steps,
    metadata: {
      name: 'Merkle–Hellman Knapsack', securityStatus: 'broken',
      breakingComplexity: 'Polynomial time via lattice-basis reduction (Shamir, 1984)',
      yearDesigned: 1978, standardBody: 'Merkle & Hellman',
    },
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'encrypt')
}
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options, 'decrypt')
}

export const TEST_VECTORS: TestVector[] = [
  {
    key: '2,3,6,13,27,52,105,210,420,41',
    input: 'A',
    expected: '', // computed at test-write time — run encrypt() once locally, paste the real output here, don't hand-derive by mistake
    description: "Textbook 8-term superincreasing sequence, single ASCII char 'A' (01000001)",
  },
]
