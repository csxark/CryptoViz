import { sha256 } from '@noble/hashes/sha2.js'

export interface BloomFilterConfig {
  /** Size of bit array m (default: 64, min: 8, max: 256) */
  size: number
  /** Number of hash functions k (default: 3, min: 1, max: 8) */
  numHashes: number
}

export interface HashHit {
  hashIndex: number
  bitIndex: number
  wasAlreadySet: boolean
}

export interface InsertResult {
  element: string
  hits: HashHit[]
  bits: number[]
}

export interface TestResult {
  element: string
  hits: HashHit[]
  bits: number[]
  isPresent: boolean
  status: 'definitely_not' | 'possibly_present'
}

export interface BloomFilterStats {
  size: number
  numHashes: number
  elementsInserted: number
  bitsSet: number
  saturationRatio: number
  theoreticalFalsePositiveRate: number
  optimalNumHashes: number
}

export class BloomFilterEngine {
  private size: number
  private numHashes: number
  private bits: Uint8Array
  private insertedElements: Set<string>

  constructor(config: Partial<BloomFilterConfig> = {}) {
    this.size = Math.max(8, Math.min(256, config.size ?? 64))
    this.numHashes = Math.max(1, Math.min(8, config.numHashes ?? 3))
    this.bits = new Uint8Array(this.size)
    this.insertedElements = new Set<string>()
  }

  /**
   * Computes k bit indices for a given element using Kirsch-Mitzenmacher double-hashing
   * h_i(x) = (h1(x) + i * h2(x)) mod m
   */
  public getHashIndices(element: string): number[] {
    const encoder = new TextEncoder()
    const hashBytes = sha256(encoder.encode(element))

    const view = new DataView(hashBytes.buffer, hashBytes.byteOffset, hashBytes.byteLength)
    const h1 = view.getUint32(0, true)
    let h2 = view.getUint32(4, true)
    if (h2 === 0) h2 = 1

    const indices: number[] = []
    for (let i = 0; i < this.numHashes; i++) {
      const idx = Math.abs((h1 + i * h2) % this.size)
      indices.push(idx)
    }
    return indices
  }

  public insert(element: string): InsertResult {
    if (!element) {
      throw new Error('Element cannot be empty.')
    }

    const indices = this.getHashIndices(element)
    const hits: HashHit[] = []

    for (let i = 0; i < indices.length; i++) {
      const bitIdx = indices[i]
      const wasAlreadySet = this.bits[bitIdx] === 1
      this.bits[bitIdx] = 1
      hits.push({
        hashIndex: i,
        bitIndex: bitIdx,
        wasAlreadySet,
      })
    }

    this.insertedElements.add(element)

    return {
      element,
      hits,
      bits: Array.from(this.bits),
    }
  }

  public test(element: string): TestResult {
    if (!element) {
      throw new Error('Element cannot be empty.')
    }

    const indices = this.getHashIndices(element)
    const hits: HashHit[] = []
    let allSet = true

    for (let i = 0; i < indices.length; i++) {
      const bitIdx = indices[i]
      const isSet = this.bits[bitIdx] === 1
      if (!isSet) {
        allSet = false
      }
      hits.push({
        hashIndex: i,
        bitIndex: bitIdx,
        wasAlreadySet: isSet,
      })
    }

    return {
      element,
      hits,
      bits: Array.from(this.bits),
      isPresent: allSet,
      status: allSet ? 'possibly_present' : 'definitely_not',
    }
  }

  public clear(): void {
    this.bits.fill(0)
    this.insertedElements.clear()
  }

  public resize(config: Partial<BloomFilterConfig>): void {
    if (config.size) {
      this.size = Math.max(8, Math.min(256, config.size))
    }
    if (config.numHashes) {
      this.numHashes = Math.max(1, Math.min(8, config.numHashes))
    }
    this.clear()
  }

  public getBits(): number[] {
    return Array.from(this.bits)
  }

  public getInsertedElements(): string[] {
    return Array.from(this.insertedElements)
  }

  public getStats(): BloomFilterStats {
    let bitsSet = 0
    for (let i = 0; i < this.size; i++) {
      if (this.bits[i] === 1) bitsSet++
    }

    const n = this.insertedElements.size
    const m = this.size
    const k = this.numHashes

    const saturationRatio = bitsSet / m

    let theoreticalFalsePositiveRate = 0
    if (n > 0) {
      // p ≈ (1 - e^(-k*n/m))^k
      const exponent = (-k * n) / m
      const base = 1 - Math.exp(exponent)
      theoreticalFalsePositiveRate = Math.pow(Math.max(0, base), k)
    }

    const optimalNumHashes = n > 0 ? Math.max(1, Math.round((m / n) * Math.LN2)) : 1

    return {
      size: m,
      numHashes: k,
      elementsInserted: n,
      bitsSet,
      saturationRatio,
      theoreticalFalsePositiveRate,
      optimalNumHashes,
    }
  }
}
