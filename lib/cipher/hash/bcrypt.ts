import bcrypt from 'bcryptjs'
import { CipherError } from '../../utils/errors'
import { validateHashInput } from './sha256'
import type { CipherResult, CipherStep, CipherMetadata, CipherOptions, TestVector } from '../types'

const METADATA: CipherMetadata = {
  name: 'bcrypt',
  securityStatus: 'secure',
  yearDesigned: 1999,
  standardBody: 'USENIX',
}

// Pre-calculated bcrypt test vector for verification
/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'password',
    key: '$2b$10$gNA8qfCa/v3LD5qk/xMXxusiY2ylw.rPhniUkzxfV.veG8bx2rG8u',
    expected: 'match',
    skipEncrypt: true,
    description: 'Bcrypt password verification (decrypt returns "match" when password matches hash)',
  },
]

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {}
): CipherResult {
  validateHashInput(input)

  const cost = options.mode ? parseInt(options.mode, 10) : 10
  if (isNaN(cost) || cost < 4 || cost > 31) {
    throw new CipherError('INVALID_KEY', 'Bcrypt cost factor must be an integer between 4 and 31.')
  }

  const start = performance.now()
  
  // In bcrypt, if a key is provided and starts with $2, we treat it as salt to make it deterministic
  let salt = ''
  if (key && key.startsWith('$2')) {
    salt = key
  } else {
    salt = bcrypt.genSaltSync(cost)
  }

  const output = bcrypt.hashSync(input, salt)
  const durationMs = performance.now() - start

  const steps: CipherStep[] = []
  if (options.instrument) {
    steps.push({
      index: 0,
      label: 'Salt and Cost Parsing',
      inputState: '',
      outputState: salt,
      table: [
        { key: 'Cost factor', value: cost.toString() },
        { key: 'Salt', value: salt },
        { key: 'Iterations (2^cost)', value: Math.pow(2, cost).toString() },
      ],
      note: `Parsed bcrypt parameters: cost factor ${cost} results in ${Math.pow(2, cost)} key derivation iterations.`,
      isMilestone: true,
    })

    steps.push({
      index: 1,
      label: 'EksBlowfish Key Setup',
      inputState: '',
      outputState: '',
      note: 'Deriving Blowfish P-array and S-boxes using password and salt. Running EksBlowfishSetup 2^cost times.',
    })

    steps.push({
      index: 2,
      label: 'Magic State Encryption',
      inputState: '',
      outputState: '',
      note: 'Encrypting the 24-byte magic string "OrpheanBeholderScryDoubt" 64 times using the derived Blowfish key.',
    })

    steps.push({
      index: 3,
      label: 'Encode Hash String',
      inputState: '',
      outputState: output,
      note: `Formatted output into standard modular crypt format: $2b$[cost]$[salt][hash].`,
      isMilestone: true,
    })
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: {
      ...METADATA,
      rounds: cost,
    },
    durationMs,
  }
}

/**
 * Decrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(
  input: string,
  key: string = '',
  _options: CipherOptions = {}
): CipherResult {
  // For bcrypt, "decrypt" verifies a password (input) against a hash (key)
  validateHashInput(input)
  if (!key) {
    throw new CipherError('INVALID_KEY', 'Bcrypt hash is required for verification in key parameter.')
  }

  const start = performance.now()
  let isMatch = false
  try {
    isMatch = bcrypt.compareSync(input, key)
  } catch (_err) {
    throw new CipherError('INVALID_KEY', 'Invalid bcrypt hash format.')
  }

  const durationMs = performance.now() - start

  return {
    output: isMatch ? 'match' : 'mismatch',
    outputEncoding: 'utf8',
    steps: [],
    metadata: METADATA,
    durationMs,
  }
}
