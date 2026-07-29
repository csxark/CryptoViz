import { CipherError } from '../../utils/errors'
import type { CipherOptions, CipherResult, CipherStep, TestVector } from '../types'

const P = (1n << 130n) - 5n

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function utf8ToBytes(s: string): Uint8Array { return new TextEncoder().encode(s) }

function clamp(r: bigint): bigint {
  return r & BigInt('0x0ffffffc0ffffffc0ffffffc0fffffff')
}
function bytesToLE(bytes: Uint8Array): bigint {
  let v = 0n
  for (let i = bytes.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(bytes[i])
  return v
}
function leToBytes(v: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) { out[i] = Number(v & 0xffn); v >>= 8n }
  return out
}

function computeTag(message: Uint8Array, key: Uint8Array, steps: CipherStep[] | null): Uint8Array {
  if (key.length !== 32) throw new CipherError('INVALID_KEY', 'Poly1305 requires a 32-byte one-time key (r || s)')
  const r = clamp(bytesToLE(key.slice(0, 16)))
  const s = bytesToLE(key.slice(16, 32))
  let acc = 0n
  for (let i = 0; i < message.length; i += 16) {
    const chunk = message.slice(i, i + 16)
    const padded = new Uint8Array(chunk.length + 1)
    padded.set(chunk); padded[chunk.length] = 1
    const n = bytesToLE(padded)
    acc = ((acc + n) * r) % P
    steps?.push({
      index: steps.length, label: `Block ${Math.floor(i / 16) + 1}`, inputState: n.toString(16),
      outputState: acc.toString(16), note: '(acc + block) * r mod (2^130 - 5)',
    })
  }
  acc = (acc + s) % (1n << 128n)
  return leToBytes(acc, 16)
}

function run(input: string, key: string, options: CipherOptions): CipherResult {
  const start = performance.now()
  const useHex = (options as any).hexInput ?? true
  const message = useHex ? hexToBytes(input) : utf8ToBytes(input)
  if (message.length === 0) throw new CipherError('INPUT_REQUIRED', 'Input cannot be empty')
  if (message.length > 4096) throw new CipherError('INPUT_TOO_LONG', 'Input exceeds 4096 byte limit')
  const keyBytes = hexToBytes(key)
  const steps: CipherStep[] = []
  const tag = computeTag(message, keyBytes, options.instrument ? steps : null)
  return {
    output: bytesToHex(tag), outputEncoding: 'hex', steps,
    metadata: { name: 'Poly1305', keySize: 256, securityStatus: 'secure', yearDesigned: 2005, standardBody: 'RFC 8439' },
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  return run(input, key, options)
}
// One-way MAC — no inverse, matches the sha3Decrypt()/sha1Decrypt()/ripemd160Decrypt() pattern of a zero-arg stub.
export function decrypt(): CipherResult {
  throw new CipherError('INVALID_KEY', 'Poly1305 is a one-way MAC — there is no decrypt operation, only tag generation')
}

// RFC 8439 §2.5.2 — verify byte-for-byte against the RFC before merging, same caution as elsewhere.
export const TEST_VECTORS: TestVector[] = [
  {
    key: '85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b',
    input: '43727970746f6772617068696320466f72756d2052657365617263682047726f7570',
    expected: 'a8061dc1305136c6c22b8baf0c0127a',
    description: 'RFC 8439 section 2.5.2 canonical test vector',
  },
]
