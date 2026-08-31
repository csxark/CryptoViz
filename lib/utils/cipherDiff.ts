
import type { Encoding } from '../cipher/types'

export interface ByteDiff {
  index: number
  a: number | null
  b: number | null
  xor: number | null
  status: 'match' | 'different' | 'missing-a' | 'missing-b'
  differingBits: number
}
export interface CipherDiffAnalysis {
  bytesA: number[]
  bytesB: number[]
  alignedLength: number
  comparedBits: number
  hammingDistance: number
  bitDifferencePercentage: number
  entropyA: number
  entropyB: number
  byteDiffs: ByteDiff[]
  xorHex: string
}
function hexToBytes(value: string): number[] {
  const clean = value.replace(/\s+/g, '').replace(/^0x/i, '')
  if (!clean) return []
  if (!/^[0-9a-f]*$/i.test(clean)) throw new Error('Invalid hexadecimal output')
  const padded = clean.length % 2 ? `0${clean}` : clean
  return Array.from({ length: padded.length / 2 }, (_, i) => parseInt(padded.slice(i * 2, i * 2 + 2), 16))
}
function base64ToBytes(value: string): number[] {
  if (typeof atob !== 'function') return []
  const raw = atob(value)
  return Array.from(raw, (char) => char.charCodeAt(0))
}
function toBytes(value: string, encoding: Encoding): number[] {
  if (!value) return []
  if (encoding === 'hex') return hexToBytes(value)
  if (encoding === 'base64') return base64ToBytes(value)
  if (encoding === 'binary') return Array.from(value, (char) => char.charCodeAt(0) & 255)
  return Array.from(new TextEncoder().encode(value))
}
function popcount(value: number): number {
  let x = value & 255, count = 0
  while (x) { count += x & 1; x >>>= 1 }
  return count
}
export function shannonEntropy(bytes: number[]): number {
  if (!bytes.length) return 0
  const counts = new Map<number, number>()
  for (const byte of bytes) counts.set(byte, (counts.get(byte) ?? 0) + 1)
  let entropy = 0
  for (const count of counts.values()) {
    const p = count / bytes.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}
export function analyzeCipherOutputs(
  outputA: string,
  outputB: string,
  encodingA: Encoding = 'utf8',
  encodingB: Encoding = 'utf8',
): CipherDiffAnalysis {
  const bytesA = toBytes(outputA, encodingA)
  const bytesB = toBytes(outputB, encodingB)
  const alignedLength = Math.max(bytesA.length, bytesB.length)
  let hammingDistance = 0
  const byteDiffs: ByteDiff[] = []
  let xorHex = ''
  for (let i = 0; i < alignedLength; i++) {
    const a = bytesA[i] ?? null, b = bytesB[i] ?? null
    if (a === null) {
      byteDiffs.push({ index: i, a, b, xor: null, status: 'missing-a', differingBits: 0 })
      xorHex += '??'
      continue
    }
    if (b === null) {
      byteDiffs.push({ index: i, a, b, xor: null, status: 'missing-b', differingBits: 0 })
      xorHex += '??'
      continue
    }
    const xor = a ^ b
    const differingBits = popcount(xor)
    hammingDistance += differingBits
    byteDiffs.push({
      index: i, a, b, xor,
      status: xor === 0 ? 'match' : 'different',
      differingBits,
    })
    xorHex += xor.toString(16).padStart(2, '0')
  }
  const comparedBits = Math.min(bytesA.length, bytesB.length) * 8
  return {
    bytesA, bytesB, alignedLength, comparedBits, hammingDistance,
    bitDifferencePercentage: comparedBits ? (hammingDistance / comparedBits) * 100 : 0,
    entropyA: shannonEntropy(bytesA),
    entropyB: shannonEntropy(bytesB),
    byteDiffs, xorHex,
  }
}
export function computeHexDiff(hexA: string, hexB: string): { xorHex: string; diffCount: number } {
  const cleanA = hexA.replace(/\s+/g, '').replace(/^0x/i, '')
  const cleanB = hexB.replace(/\s+/g, '').replace(/^0x/i, '')
  const maxLen = Math.max(cleanA.length, cleanB.length)
  const evenLen = maxLen % 2 !== 0 ? maxLen + 1 : maxLen
  const paddedA = cleanA.padEnd(evenLen, '0')
  const paddedB = cleanB.padEnd(evenLen, '0')
  const bytesA = hexToBytes(paddedA)
  const bytesB = hexToBytes(paddedB)
  const len = Math.max(bytesA.length, bytesB.length)
  let diffCount = 0
  let xorHex = ''

  for (let i = 0; i < len; i++) {
    const a = bytesA[i] ?? 0
    const b = bytesB[i] ?? 0
    const xor = a ^ b
    diffCount += popcount(xor)
    xorHex += xor.toString(16).padStart(2, '0')
  }

  return { xorHex, diffCount }
}
export function flipBitInHex(hexString: string, bitIndex: number): string {
  if (hexString.length % 2 !== 0) throw new Error('Hex string must have an even length.')
  const bytes = new Uint8Array(hexToBytes(hexString))
  const byteIndex = Math.floor(bitIndex / 8)
  if (byteIndex >= bytes.length || byteIndex < 0) throw new Error('Bit index out of bounds.')
  bytes[byteIndex] ^= 1 << (7 - (bitIndex % 8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
export function flipBitInString(str: string, bitIndex: number): string {
  const bytes = new TextEncoder().encode(str)
  const byteIndex = Math.floor(bitIndex / 8)
  if (byteIndex >= bytes.length || byteIndex < 0) throw new Error('Bit index out of bounds.')
  bytes[byteIndex] ^= 1 << (7 - (bitIndex % 8))
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

