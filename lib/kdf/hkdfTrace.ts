export interface HkdfStageStep {
  label: string
  detail: string
}

export interface HkdfStageInput {
  ikmLength: number
  saltHex: string
  infoStr: string
  hash: 'SHA-256' | 'SHA-512' | 'SHA-1'
  keyLength: number
}

export const RFC_5869_PRESETS = [
  {
    name: 'RFC 5869 Test Case 1 (SHA-256)',
    ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
    salt: '000102030405060708090a0b0c',
    info: 'f0f1f2f3f4f5f6f7f8f9',
    hash: 'SHA-256' as const,
    keyLength: 42,
    expectedPrk: '077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5',
    expectedOkm: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
  },
  {
    name: 'RFC 5869 Test Case 2 (SHA-256 Long Inputs)',
    ikm: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf',
    salt: '606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
    info: 'b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f',
    hash: 'SHA-256' as const,
    keyLength: 82,
    expectedPrk: '06a6b88c73c21ea7661133f01b2f92ee327f0d847e913c6e4a659e98014229ff',
    expectedOkm: '21b1932196f1e1c0afdc495f26c8c83d765be9cb4ce627e8abcf4d5df5e46fb3cf5a660de06f1aef1e2d02bfe63ec927d36a4e926a32993e4736c2243f0f1f703eb36a5f07b17c9ca757a3ba402292c55589',
  },
  {
    name: 'RFC 5869 Test Case 3 (SHA-256 Zero-Salt)',
    ikm: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
    salt: '',
    info: '',
    hash: 'SHA-256' as const,
    keyLength: 42,
    expectedPrk: '19ef24a32c717b167f33a91d6f648bdf96596776afdb6377ac434a12de4451e5',
    expectedOkm: '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8',
  },
]

export function describeHkdfStages(input: HkdfStageInput): HkdfStageStep[] {
  const steps: HkdfStageStep[] = []

  const hashLenMap: Record<'SHA-256' | 'SHA-512' | 'SHA-1', number> = {
    'SHA-256': 32,
    'SHA-512': 64,
    'SHA-1': 20,
  }
  const hashLen = hashLenMap[input.hash]

  steps.push({
    label: 'Stage 1: Extract Phase (PRK Generation)',
    detail: `HKDF-Extract processes ${input.ikmLength} bytes of Input Keying Material (IKM) with ${
      input.saltHex
        ? `salt (${input.saltHex.length / 2} bytes)`
        : `a default zero-padded salt of ${hashLen} bytes`
    } via HMAC-${input.hash} to generate a Pseudorandom Key (PRK) of exactly ${hashLen} bytes.`,
  })

  const N = Math.ceil(input.keyLength / hashLen)
  steps.push({
    label: 'Stage 2: Expand Phase Setup',
    detail: `HKDF-Expand prepares to derive ${input.keyLength} bytes of Output Keying Material (OKM) from PRK and context info "${
      input.infoStr || '(empty)'
    }" across ${N} block iteration(s) (each block is ${hashLen} bytes).`,
  })

  steps.push({
    label: `Stage 3: Compute ${N} Expand Block(s) T(1)..T(${N})`,
    detail: `Each block is computed iteratively: T(i) = HMAC-${input.hash}(PRK, T(i-1) | info | i). The feedback loop binds previous block outputs into subsequent blocks.`,
  })

  steps.push({
    label: 'Stage 4: Concatenation & Truncation',
    detail: `Concatenates blocks T(1)..T(${N}) (${N * hashLen} total bytes) and truncates to the requested length L = ${input.keyLength} bytes.`,
  })

  return steps
}
