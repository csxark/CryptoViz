export type MillerRabinWitnessType = 'prime-witness' | 'composite-witness' | 'strong-pseudoprime'

export interface MillerRabinRound {
  base: bigint
  initialPower: bigint
  squarings: bigint[]
  passes: boolean
  witnessType: MillerRabinWitnessType
}

export interface MillerRabinTrace {
  n: bigint
  s: number
  d: bigint
  rounds: MillerRabinRound[]
  probablePrime: boolean
  confidence: number
}

export interface FermatTrace {
  base: bigint
  result: bigint
  passes: boolean
  isCarmichaelCandidate: boolean
}

export interface LucasTrace {
  D: bigint
  P: bigint
  Q: bigint
  jacobi: number
  sequence: bigint[]
  passes: boolean
}

export interface BailliePSWResult {
  probablePrime: boolean
  millerRabin: MillerRabinTrace
  lucas: LucasTrace | null
}

export const CARMICHAEL_NUMBERS = [561n, 1105n, 1729n, 2465n]

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n || exponent < 0n) throw new Error('Invalid modular exponentiation domain')
  let result = 1n
  let value = ((base % modulus) + modulus) % modulus
  let power = exponent
  while (power > 0n) {
    if (power & 1n) result = (result * value) % modulus
    value = (value * value) % modulus
    power >>= 1n
  }
  return result
}

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) [x, y] = [y, x % y]
  return x
}

export function decomposeMinusOne(n: bigint): { s: number; d: bigint } {
  if (n < 3n || (n & 1n) === 0n) throw new Error('n must be an odd integer greater than 2')
  let d = n - 1n
  let s = 0
  while ((d & 1n) === 0n) { d >>= 1n; s++ }
  return { s, d }
}

export function millerRabinTrace(n: bigint, bases: bigint[] = [2n, 3n, 5n, 7n, 11n]): MillerRabinTrace {
  if (n < 2n) return { n, s: 0, d: 0n, rounds: [], probablePrime: false, confidence: 0 }
  if (n === 2n || n === 3n) return { n, s: 1, d: n - 1n, rounds: [], probablePrime: true, confidence: 1 }
  if ((n & 1n) === 0n) return { n, s: 1, d: (n - 1n) / 2n, rounds: [], probablePrime: false, confidence: 0 }

  const { s, d } = decomposeMinusOne(n)
  const rounds: MillerRabinRound[] = []
  for (const rawBase of bases) {
    const base = ((rawBase % n) + n) % n
    if (base < 2n || base >= n) continue
    const initialPower = modPow(base, d, n)
    let x = initialPower
    const squarings: bigint[] = []
    let passes = x === 1n || x === n - 1n
    if (!passes) {
      for (let r = 1; r < s; r++) {
        x = (x * x) % n
        squarings.push(x)
        if (x === n - 1n) { passes = true; break }
      }
    }
    rounds.push({ base, initialPower, squarings, passes, witnessType: passes ? 'strong-pseudoprime' : 'composite-witness' })
    if (!passes) return { n, s, d, rounds, probablePrime: false, confidence: 0 }
  }
  const k = rounds.length
  return { n, s, d, rounds, probablePrime: true, confidence: k ? 1 - Math.pow(4, -k) : 0 }
}

export function fermatTest(n: bigint, base = 2n): FermatTrace {
  if (n < 2n) return { base, result: 0n, passes: false, isCarmichaelCandidate: false }
  const result = modPow(base, n - 1n, n)
  const passes = result === 1n
  return { base, result, passes, isCarmichaelCandidate: passes && !isProbablePrime(n) }
}

function jacobiSymbol(aInput: bigint, nInput: bigint): number {
  if (nInput <= 0n || (nInput & 1n) === 0n) throw new Error('Jacobi denominator must be positive and odd')
  let a = ((aInput % nInput) + nInput) % nInput
  let n = nInput
  let result = 1
  while (a !== 0n) {
    while ((a & 1n) === 0n) {
      a >>= 1n
      if (n % 8n === 3n || n % 8n === 5n) result = -result
    }
    ;[a, n] = [n, a]
    if (a % 4n === 3n && n % 4n === 3n) result = -result
    a %= n
  }
  return n === 1n ? result : 0
}

function matrixMultiply(a: bigint[][], b: bigint[][], n: bigint): bigint[][] {
  return [
    [ (a[0][0] * b[0][0] + a[0][1] * b[1][0]) % n, (a[0][0] * b[0][1] + a[0][1] * b[1][1]) % n ],
    [ (a[1][0] * b[0][0] + a[1][1] * b[1][0]) % n, (a[1][0] * b[0][1] + a[1][1] * b[1][1]) % n ],
  ].map(row => row.map(v => (v + n) % n))
}

function lucasUVQ(n: bigint, P: bigint, Q: bigint, k: bigint): [bigint, bigint, bigint] {
  const base = [[P % n, ((-Q) % n + n) % n], [1n, 0n]]
  let result = [[1n, 0n], [0n, 1n]]
  let power = k
  while (power > 0n) {
    if (power & 1n) result = matrixMultiply(result, base, n)
    base[0][0] = base[0][0] // keep TypeScript happy about mutable local matrix
    const squared = matrixMultiply(base, base, n)
    base[0][0] = squared[0][0]; base[0][1] = squared[0][1]
    base[1][0] = squared[1][0]; base[1][1] = squared[1][1]
    power >>= 1n
  }
  const U = result[0][1]
  const V = (result[0][0] + result[1][1] + n) % n
  return [U, V, modPow(Q, k, n)]
}

function selfridgeD(n: bigint): bigint | null {
  let magnitude = 5n
  let sign = 1n
  for (let i = 0; i < 1000; i++) {
    const D = sign * magnitude
    const divisor = gcd(n, D < 0n ? -D : D)
    if (divisor > 1n && divisor < n) return null
    if (jacobiSymbol(D, n) === -1) return D
    magnitude += 2n
    sign = -sign
  }
  return null
}

export function strongLucasTrace(n: bigint): LucasTrace | null {
  if (n < 3n || (n & 1n) === 0n) return null
  const D = selfridgeD(n)
  if (D === null) return null
  const P = 1n
  const Q = (1n - D) / 4n
  const jacobi = jacobiSymbol(D, n)
  if (jacobi !== -1) return { D, P, Q, jacobi, sequence: [], passes: false }
  let d = n + 1n
  let s = 0
  while ((d & 1n) === 0n) { d >>= 1n; s++ }
  let [U, V, Qk] = lucasUVQ(n, P, Q, d)
  const sequence = [U, V]
  let passes = U === 0n || V === 0n
  for (let r = 1; r < s && !passes; r++) {
    V = (V * V - 2n * Qk + n) % n
    Qk = (Qk * Qk) % n
    sequence.push(V)
    if (V === 0n) passes = true
  }
  return { D, P, Q, jacobi, sequence, passes }
}

export function bailliePSW(n: bigint): BailliePSWResult {
  const millerRabin = millerRabinTrace(n, [2n])
  if (!millerRabin.probablePrime) return { probablePrime: false, millerRabin, lucas: null }
  if (n < 3n) return { probablePrime: true, millerRabin, lucas: null }
  const lucas = strongLucasTrace(n)
  return { probablePrime: Boolean(lucas?.passes), millerRabin, lucas }
}

export function isProbablePrime(n: bigint): boolean {
  if (n < 2n) return false
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  return millerRabinTrace(n, [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]).probablePrime
}

export function randomOddCandidate(bits: number): bigint {
  const size = Math.max(2, Math.min(256, Math.floor(bits)))
  const bytes = new Uint8Array(Math.ceil(size / 8))
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) throw new Error('Secure random number generation is unavailable in this environment.')
  crypto.getRandomValues(bytes)
  const excess = bytes.length * 8 - size
  bytes[0] &= 0xff >>> excess
  bytes[0] |= 1 << (7 - excess)
  bytes[bytes.length - 1] |= 1
  return BigInt(`0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`)
}
