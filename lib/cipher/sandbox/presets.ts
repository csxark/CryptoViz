import { CipherPipelineStage } from './cipherSandboxEngine'

/**
 * Cipher Preset cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherPreset {
  id: string
  name: string
  description: string
  defaultInput: string
  rounds: number
  stages: CipherPipelineStage[]
}

/**
 * CIPHER PRESETS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const CIPHER_PRESETS: CipherPreset[] = [
  {
    id: 'spn_2round',
    name: '2-Round SPN (Substitution-Permutation Network)',
    description:
      'A classic SP-Network structure that alternates non-linear substitution (Caesar/S-Box) with linear permutation (P-Box) and round key XORing to achieve Confusion & Diffusion.',
    defaultInput: 'CRYPTOGRAPHY',
    rounds: 2,
    stages: [
      {
        id: 'stage-spn-sub',
        name: 'S-Box Layer (Substitution)',
        category: 'substitution',
        subType: 'caesar',
        shift: 5,
        enabled: true,
      },
      {
        id: 'stage-spn-perm',
        name: 'P-Box Layer (Permutation)',
        category: 'permutation',
        subType: 'pbox',
        blockSize: 4,
        permutation: [2, 0, 3, 1],
        enabled: true,
      },
      {
        id: 'stage-spn-key',
        name: 'Round Key XOR',
        category: 'substitution',
        subType: 'xor',
        key: 'KEY1',
        enabled: true,
      },
    ],
  },
  {
    id: 'mini_feistel',
    name: '3-Round Mini-Feistel Cipher',
    description:
      'A simplified Feistel Network splitting the state into left & right halves, transforming one half with an F-function (Caesar+XOR), and swapping halves between rounds.',
    defaultInput: 'ATTACKATDAWN',
    rounds: 3,
    stages: [
      {
        id: 'stage-feistel-f',
        name: 'F-Function (Substitution)',
        category: 'substitution',
        subType: 'caesar',
        shift: 3,
        enabled: true,
      },
      {
        id: 'stage-feistel-xor',
        name: 'Key Addition',
        category: 'substitution',
        subType: 'xor',
        key: 'SECRET',
        enabled: true,
      },
      {
        id: 'stage-feistel-swap',
        name: 'Half Block Swap (Permutation)',
        category: 'permutation',
        subType: 'block_swap',
        blockSize: 3,
        enabled: true,
      },
    ],
  },
  {
    id: 'caesar_columnar',
    name: 'Caesar + Columnar Transposition',
    description:
      'Combines monoalphabetic Caesar shift substitution with a 3-column transposition permutation.',
    defaultInput: 'MEET ME AT THE PARK',
    rounds: 1,
    stages: [
      {
        id: 'stage-cc-shift',
        name: 'Caesar Shift (+7)',
        category: 'substitution',
        subType: 'caesar',
        shift: 7,
        enabled: true,
      },
      {
        id: 'stage-cc-trans',
        name: 'Columnar Transposition (3 Cols)',
        category: 'permutation',
        subType: 'columnar',
        columns: 3,
        keyOrder: [2, 0, 1],
        enabled: true,
      },
    ],
  },
  {
    id: 'affine_pbox',
    name: 'Affine Cipher + 4-Bit P-Box',
    description:
      'Mathematical Affine substitution (5x + 8 mod 26) followed by position rearrangement within 4-character blocks.',
    defaultInput: 'TOP SECRET CODE',
    rounds: 1,
    stages: [
      {
        id: 'stage-ap-affine',
        name: 'Affine Transform (5x + 8)',
        category: 'substitution',
        subType: 'affine',
        a: 5,
        b: 8,
        enabled: true,
      },
      {
        id: 'stage-ap-pbox',
        name: 'P-Box [1, 3, 0, 2]',
        category: 'permutation',
        subType: 'pbox',
        blockSize: 4,
        permutation: [1, 3, 0, 2],
        enabled: true,
      },
    ],
  },
  {
    id: 'rot_xor_swap',
    name: 'ROT13 + XOR + Cyclic Shift',
    description:
      'Multi-layer pipeline executing ROT13 substitution, key XOR, and cyclic rotation.',
    defaultInput: 'CONFIDENTIAL',
    rounds: 1,
    stages: [
      {
        id: 'stage-rxs-rot',
        name: 'ROT13 Layer',
        category: 'substitution',
        subType: 'caesar',
        shift: 13,
        enabled: true,
      },
      {
        id: 'stage-rxs-xor',
        name: 'XOR Layer (KEY)',
        category: 'substitution',
        subType: 'xor',
        key: 'SAFE',
        enabled: true,
      },
      {
        id: 'stage-rxs-shift',
        name: 'Cyclic Shift (+2)',
        category: 'permutation',
        subType: 'cyclic_shift',
        shift: 2,
        enabled: true,
      },
    ],
  },
]
