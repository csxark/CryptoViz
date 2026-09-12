/**
 * Cryptographic Test Contamination Audit & Enforcement Gate
 *
 * Enforces Phase 2 Verification Integrity Gate:
 * - Detects placeholder expected outputs (mock_*, placeholder, dummy, TODO, FIXME)
 * - Fails loudly when contaminated vectors are evaluated as conformance tests
 * - Prevents false conformance and ensures every published vector has documented provenance
 */

export class ContaminatedTestVectorError extends Error {
  constructor(algorithmId: string, value: string, reason: string) {
    super(
      `[VERIFICATION_INTEGRITY_VIOLATION] Contaminated test vector detected for algorithm "${algorithmId}". ` +
      `Encountered placeholder/unverified output "${value}". Reason: ${reason}. ` +
      `Conformance suites must never consume placeholder vectors.`
    )
    this.name = 'ContaminatedTestVectorError'
  }
}

const CONTAMINATION_PATTERNS = [
  /^mock_/i,
  /^placeholder/i,
  /^dummy/i,
  /^todo/i,
  /^fixme/i,
  /mock_stream/i,
  /mock_ciphertext/i,
  /mock_signature/i,
  /mock_hash/i,
  /mock_sig/i,
  /mock_ct/i,
  /mock_proof/i,
]

/**
 * Checks if a single value string represents a placeholder/mock value.
 */
export function isContaminatedValue(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return CONTAMINATION_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/**
 * Checks whether a TestVector contains contaminated expected values.
 */
export function isContaminatedVector(vector: {
  expected?: unknown
  expectedDecrypt?: unknown
}): boolean {
  if (!vector) return false
  if (isContaminatedValue(vector.expected)) return true
  if (isContaminatedValue(vector.expectedDecrypt)) return true
  return false
}

/**
 * Asserts that a test vector is uncontaminated.
 * FAILS LOUDLY if a placeholder is encountered.
 */
export function assertUncontaminatedVector(
  vector: { expected?: unknown; expectedDecrypt?: unknown; description?: string },
  algorithmId: string
): void {
  if (isContaminatedValue(vector.expected)) {
    throw new ContaminatedTestVectorError(
      algorithmId,
      String(vector.expected),
      `Expected value is a placeholder vector (${vector.description || 'no description'})`
    )
  }
  if (isContaminatedValue(vector.expectedDecrypt)) {
    throw new ContaminatedTestVectorError(
      algorithmId,
      String(vector.expectedDecrypt),
      `Expected decrypt value is a placeholder vector (${vector.description || 'no description'})`
    )
  }
}

/**
 * Scans an array of vectors for contamination.
 */
export function scanVectorsForContamination(vectors: any[] = []): {
  isContaminated: boolean
  placeholderCount: number
  contaminatedSamples: string[]
} {
  const contaminated: string[] = []
  for (const v of vectors) {
    if (isContaminatedValue(v?.expected)) {
      contaminated.push(String(v.expected))
    }
    if (isContaminatedValue(v?.expectedDecrypt)) {
      contaminated.push(String(v.expectedDecrypt))
    }
  }
  return {
    isContaminated: contaminated.length > 0,
    placeholderCount: contaminated.length,
    contaminatedSamples: contaminated,
  }
}
