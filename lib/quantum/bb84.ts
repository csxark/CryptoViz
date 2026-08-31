/**
 * BB84 Quantum Key Distribution simulator (with an intercept-resend eavesdropper).
 *
 * lib/quantum already has Grover and Shor — algorithms that *break* crypto. BB84
 * is the counterpart that *builds* a shared secret whose security rests on
 * physics, not computational hardness: measuring a qubit in the wrong basis
 * randomizes it, so an eavesdropper who measures in transit unavoidably injects
 * errors that Alice and Bob detect when they compare a sample of their key.
 *
 * Protocol: Alice sends qubits each in a random bit + random basis; Bob measures
 * in random bases; they publicly compare bases and keep only the positions where
 * they matched ("sifting"). With no eavesdropper the sifted keys agree exactly;
 * an intercept-resend eavesdropper (Eve) drives the sifted-key error rate (QBER)
 * to ~25%, far above the acceptance threshold — so the key is discarded.
 *
 * The RNG is injectable so the simulation is deterministic under test.
 */

export type Basis = 'rectilinear' | 'diagonal'
export type Bit = 0 | 1
/** Returns a float in [0, 1). Defaults to Math.random. */
export type RandomSource = () => number

export interface QubitTrace {
  index: number
  aliceBit: Bit
  aliceBasis: Basis
  /** Present only when an eavesdropper is simulated. */
  eveBasis?: Basis
  eveBit?: Bit
  bobBasis: Basis
  bobBit: Bit
  /** Alice's and Bob's bases matched → this position survives sifting. */
  basesMatch: boolean
  /** Sifted AND Bob's bit disagrees with Alice's (evidence of eavesdropping/noise). */
  error: boolean
}

export interface BB84Step {
  index: number
  label: string
  detail: string
  value?: string
  isMilestone?: boolean
}

export interface BB84Result {
  qubits: QubitTrace[]
  /** Alice's bits at the sifted positions (the raw key before error-checking). */
  siftedKey: Bit[]
  bobSiftedKey: Bit[]
  siftedLength: number
  /** Quantum Bit Error Rate over the sifted key. */
  errorRate: number
  /** True when the QBER exceeds the acceptance threshold → key must be discarded. */
  eavesdropperDetected: boolean
  threshold: number
  steps: BB84Step[]
}

export interface BB84Options {
  numQubits: number
  eavesdropper?: boolean
  /** QBER above which the key is rejected. Real systems use ~11%. */
  detectionThreshold?: number
  rng?: RandomSource
}

const bit = (rng: RandomSource): Bit => (rng() < 0.5 ? 0 : 1)
const basis = (rng: RandomSource): Basis => (rng() < 0.5 ? 'rectilinear' : 'diagonal')

/**
 * Measure a qubit that was prepared as (prepBit) in (prepBasis), using measBasis.
 * Matching basis → the exact prepared bit; mismatched basis → a uniformly random result.
 */
function measure(
  prepBasis: Basis,
  prepBit: Bit,
  measBasis: Basis,
  rng: RandomSource,
): Bit {
  return prepBasis === measBasis ? prepBit : bit(rng)
}

export function runBB84(options: BB84Options): BB84Result {
  const rng = options.rng ?? Math.random
  const threshold = options.detectionThreshold ?? 0.11
  const eavesdropper = Boolean(options.eavesdropper)
  const n = Math.max(0, Math.floor(options.numQubits))

  const qubits: QubitTrace[] = []
  for (let i = 0; i < n; i += 1) {
    const aliceBit = bit(rng)
    const aliceBasis = basis(rng)

    // What actually reaches Bob: Alice's qubit, unless Eve intercepts, measures,
    // and resends her (possibly wrong) result in her own basis.
    let travelBasis = aliceBasis
    let travelBit = aliceBit
    let eveBasis: Basis | undefined
    let eveBit: Bit | undefined
    if (eavesdropper) {
      eveBasis = basis(rng)
      eveBit = measure(aliceBasis, aliceBit, eveBasis, rng)
      travelBasis = eveBasis
      travelBit = eveBit
    }

    const bobBasis = basis(rng)
    const bobBit = measure(travelBasis, travelBit, bobBasis, rng)
    const basesMatch = aliceBasis === bobBasis
    const error = basesMatch && bobBit !== aliceBit

    qubits.push({
      index: i,
      aliceBit,
      aliceBasis,
      eveBasis,
      eveBit,
      bobBasis,
      bobBit,
      basesMatch,
      error,
    })
  }

  const sifted = qubits.filter((q) => q.basesMatch)
  const siftedKey = sifted.map((q) => q.aliceBit)
  const bobSiftedKey = sifted.map((q) => q.bobBit)
  const errorCount = sifted.filter((q) => q.error).length
  const errorRate = sifted.length > 0 ? errorCount / sifted.length : 0
  const eavesdropperDetected = errorRate > threshold

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const steps: BB84Step[] = [
    {
      index: 0,
      label: 'Alice transmits qubits',
      detail:
        'Alice picks a random bit and a random basis (rectilinear + or diagonal ×) for each qubit and sends them to Bob.',
      value: `${n} qubits sent`,
      isMilestone: true,
    },
    ...(eavesdropper
      ? [
          {
            index: 1,
            label: 'Eve intercepts (intercept-resend)',
            detail:
              'Eve measures each qubit in a random basis and resends her result. When her basis is wrong she both learns nothing and disturbs the qubit — the disturbance is unavoidable.',
            isMilestone: true,
          } as BB84Step,
        ]
      : []),
    {
      index: eavesdropper ? 2 : 1,
      label: 'Bob measures',
      detail:
        'Bob measures each incoming qubit in his own random basis. A wrong basis yields a random outcome.',
    },
    {
      index: eavesdropper ? 3 : 2,
      label: 'Sifting (public basis comparison)',
      detail:
        'Alice and Bob announce their bases (never the bits) and keep only the positions where the bases matched.',
      value: `${sifted.length} of ${n} qubits kept`,
      isMilestone: true,
    },
    {
      index: eavesdropper ? 4 : 3,
      label: 'Error check (QBER)',
      detail:
        'They compare a sample of the sifted key. With no eavesdropper the bits agree exactly; intercept-resend forces the error rate toward ~25%.',
      value: `QBER = ${pct(errorRate)} (threshold ${pct(threshold)})`,
      isMilestone: true,
    },
    {
      index: eavesdropper ? 5 : 4,
      label: eavesdropperDetected ? 'Eavesdropper detected — discard key' : 'Key accepted',
      detail: eavesdropperDetected
        ? 'The QBER exceeds the threshold, so Alice and Bob conclude the channel was tapped and throw the key away — the eavesdropper gains nothing usable.'
        : 'The QBER is within tolerance, so the sifted key is kept (then privacy-amplified in a full protocol).',
      isMilestone: true,
    },
  ]

  return {
    qubits,
    siftedKey,
    bobSiftedKey,
    siftedLength: sifted.length,
    errorRate,
    eavesdropperDetected,
    threshold,
    steps,
  }
}

/**
 * Deterministic seeded RNG (mulberry32) — handy for reproducible demos/tests.
 */
export function seededRandom(seed: number): RandomSource {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
