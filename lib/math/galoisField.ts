export type ModulusHex = 0x11b | 0x11d | 0x12d

export interface MultiplicationStep {
  multiplierBitIndex: number
  multiplierBit: number
  shiftedMultiplicandHex: string
  isXorPerformed: boolean
  overflowDetected: boolean
  accumulatorBeforeHex: string
  accumulatorAfterHex: string
}

export interface MultiplicationTrace {
  inputAHex: string
  inputBHex: string
  binaryA: string
  binaryB: string
  polyA: string
  polyB: string
  modulusHex: string
  steps: MultiplicationStep[]
  resultHex: string
}

export interface EuclideanStep {
  iteration: number
  remainderHex: string
  quotientHex: string
  nextRemainderHex: string
  auxiliaryHex: string
}

export interface InverseTrace {
  inputHex: string
  modulusHex: string
  steps: EuclideanStep[]
  inverseHex: string | null
}

export interface AffineTrace {
  inputHex: string
  inverseHex: string
  binaryInverse: string
  affineSteps: {
    bitIndex: number
    equation: string
    resultBit: number
  }[]
  resultHex: string
}

// Convert byte to polynomial string
export function toPolynomialString(n: number): string {
  const terms: string[] = []
  for (let i = 7; i >= 0; i--) {
    if ((n & (1 << i)) !== 0) {
      if (i === 0) terms.push('1')
      else if (i === 1) terms.push('x')
      else terms.push(`x^${i}`)
    }
  }
  return terms.length > 0 ? terms.join(' + ') : '0'
}

export function gfAdd(a: number, b: number): number {
  return (a ^ b) & 0xff
}

export function gfMultiplyWithTrace(a: number, b: number, modulus: ModulusHex = 0x11b): MultiplicationTrace {
  let accumulator = 0
  let shiftedMultiplicand = a & 0xff
  let currentB = b & 0xff
  
  const steps: MultiplicationStep[] = []

  for (let i = 0; i < 8; i++) {
    const multiplierBit = currentB & 1
    const isXorPerformed = multiplierBit === 1
    const accumulatorBefore = accumulator

    if (isXorPerformed) {
      accumulator ^= shiftedMultiplicand
    }

    const overflowDetected = (shiftedMultiplicand & 0x80) !== 0
    let nextShifted = (shiftedMultiplicand << 1)

    if (overflowDetected) {
      nextShifted ^= modulus
    }

    steps.push({
      multiplierBitIndex: i,
      multiplierBit,
      shiftedMultiplicandHex: shiftedMultiplicand.toString(16).padStart(2, '0').toUpperCase(),
      isXorPerformed,
      overflowDetected,
      accumulatorBeforeHex: accumulatorBefore.toString(16).padStart(2, '0').toUpperCase(),
      accumulatorAfterHex: accumulator.toString(16).padStart(2, '0').toUpperCase()
    })

    shiftedMultiplicand = nextShifted & 0xff
    currentB >>= 1
  }

  return {
    inputAHex: a.toString(16).padStart(2, '0').toUpperCase(),
    inputBHex: b.toString(16).padStart(2, '0').toUpperCase(),
    binaryA: a.toString(2).padStart(8, '0'),
    binaryB: b.toString(2).padStart(8, '0'),
    polyA: toPolynomialString(a),
    polyB: toPolynomialString(b),
    modulusHex: modulus.toString(16).toUpperCase(),
    steps,
    resultHex: accumulator.toString(16).padStart(2, '0').toUpperCase()
  }
}

export function gfMultiply(a: number, b: number, modulus: ModulusHex = 0x11b): number {
  let p = 0
  let hiBit = 0
  let tempA = a & 0xff
  let tempB = b & 0xff
  for (let i = 0; i < 8; i++) {
    if ((tempB & 1) !== 0) {
      p ^= tempA
    }
    hiBit = tempA & 0x80
    tempA = (tempA << 1)
    if (hiBit !== 0) {
      tempA ^= modulus
    }
    tempA &= 0xff
    tempB >>= 1
  }
  return p & 0xff
}

function gfDegree(a: number): number {
  let res = 0
  let temp = a
  while (temp > 0) {
    temp >>= 1
    res++
  }
  return res - 1
}

function gfDivide(a: number, b: number): { q: number; r: number } {
  if (b === 0) throw new Error('Division by zero in GF(2^8)')
  let q = 0
  let r = a
  let degB = gfDegree(b)
  
  while (r >= b && gfDegree(r) >= degB) {
    const shift = gfDegree(r) - degB
    q ^= (1 << shift)
    r ^= (b << shift)
  }
  return { q, r }
}

export function gfExtendedEuclideanWithTrace(a: number, modulus: ModulusHex = 0x11b): InverseTrace {
  if (a === 0) {
    return {
      inputHex: '00',
      modulusHex: modulus.toString(16).toUpperCase(),
      steps: [],
      inverseHex: '00' // AES treats inverse of 0 as 0
    }
  }

  let r0 = modulus
  let r1 = a
  let s0 = 0
  let s1 = 1

  const steps: EuclideanStep[] = []
  let iteration = 0

  while (r1 > 0) {
    const { q, r } = gfDivide(r0, r1)
    
    // In GF(2), subtraction is XOR, so s0 - q*s1 is s0 ^ (q*s1)
    // Actually we need to multiply q and s1 as polynomials modulo something?
    // Wait, extended Euclidean for polynomials uses polynomial multiplication for q * s1
    // Let's write a quick unbounded GF multiply for the auxiliary calculation
    let qs1 = 0
    let tempQ = q
    let tempS1 = s1
    for (let i = 0; i < 16; i++) {
      if ((tempQ & 1) !== 0) qs1 ^= tempS1
      tempS1 <<= 1
      tempQ >>= 1
    }
    
    const nextS = s0 ^ qs1
    
    steps.push({
      iteration: iteration++,
      remainderHex: r0.toString(16).padStart(2, '0').toUpperCase(),
      quotientHex: q.toString(16).padStart(2, '0').toUpperCase(),
      nextRemainderHex: r.toString(16).padStart(2, '0').toUpperCase(),
      auxiliaryHex: s1.toString(16).padStart(2, '0').toUpperCase()
    })

    r0 = r1
    r1 = r
    s0 = s1
    s1 = nextS
  }

  // The inverse is s0 modulo the irreducible polynomial if r0 == 1
  // If r0 != 1, then a is not coprime, but here it's an irreducible polynomial, so r0 will be 1.
  
  return {
    inputHex: a.toString(16).padStart(2, '0').toUpperCase(),
    modulusHex: modulus.toString(16).toUpperCase(),
    steps,
    inverseHex: s0.toString(16).padStart(2, '0').toUpperCase()
  }
}

export function gfInverse(a: number, modulus: ModulusHex = 0x11b): number {
  if (a === 0) return 0
  // Instead of EEA, since field is small, we can just do a brute-force search for inverse
  for (let i = 1; i < 256; i++) {
    if (gfMultiply(a, i, modulus) === 1) return i
  }
  return 0
}

export function rijndaelAffineTransform(b: number): number {
  let s = b
  let result = 0
  for (let i = 0; i < 8; i++) {
    // b_i ^ b_{(i+4)%8} ^ b_{(i+5)%8} ^ b_{(i+6)%8} ^ b_{(i+7)%8} ^ c_i
    const b_i = (s >> i) & 1
    const b_i4 = (s >> ((i + 4) % 8)) & 1
    const b_i5 = (s >> ((i + 5) % 8)) & 1
    const b_i6 = (s >> ((i + 6) % 8)) & 1
    const b_i7 = (s >> ((i + 7) % 8)) & 1
    const c_i = (0x63 >> i) & 1
    const resBit = b_i ^ b_i4 ^ b_i5 ^ b_i6 ^ b_i7 ^ c_i
    result |= (resBit << i)
  }
  return result
}

export function deriveSBoxWithTrace(a: number, modulus: ModulusHex = 0x11b): AffineTrace {
  const inv = gfInverse(a, modulus)
  const result = rijndaelAffineTransform(inv)
  
  const affineSteps = []
  for (let i = 0; i < 8; i++) {
    const b_i = (inv >> i) & 1
    const b_i4 = (inv >> ((i + 4) % 8)) & 1
    const b_i5 = (inv >> ((i + 5) % 8)) & 1
    const b_i6 = (inv >> ((i + 6) % 8)) & 1
    const b_i7 = (inv >> ((i + 7) % 8)) & 1
    const c_i = (0x63 >> i) & 1
    const resBit = b_i ^ b_i4 ^ b_i5 ^ b_i6 ^ b_i7 ^ c_i
    
    affineSteps.push({
      bitIndex: i,
      equation: `b'${i} = b${i} ⊕ b${(i+4)%8} ⊕ b${(i+5)%8} ⊕ b${(i+6)%8} ⊕ b${(i+7)%8} ⊕ c${i} = ${b_i} ⊕ ${b_i4} ⊕ ${b_i5} ⊕ ${b_i6} ⊕ ${b_i7} ⊕ ${c_i} = ${resBit}`,
      resultBit: resBit
    })
  }

  return {
    inputHex: a.toString(16).padStart(2, '0').toUpperCase(),
    inverseHex: inv.toString(16).padStart(2, '0').toUpperCase(),
    binaryInverse: inv.toString(2).padStart(8, '0'),
    affineSteps,
    resultHex: result.toString(16).padStart(2, '0').toUpperCase()
  }
}
