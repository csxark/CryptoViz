export interface EcbPatternInput {
  plaintext: string
  key: string
  blockSize: number
  iv: string
}

export interface PatternBlock {
  index: number
  plaintext: string
  plaintextHex: string
  ecbCiphertext: string
  cbcCiphertext: string
  repeatedPlaintext: boolean
  repeatedEcbCiphertext: boolean
  note: string
}

export interface EcbPatternResult {
  input: EcbPatternInput
  blocks: PatternBlock[]
  ecbDuplicateCount: number
  repeatedPlaintextCount: number
  leakageLevel: "low" | "medium" | "high"
  explanation: string
}

export const DEFAULT_ECB_PATTERN_INPUT: EcbPatternInput = {
  plaintext: "BLOCK-01|BLOCK-01|BLOCK-01|UNIQUE!!|BLOCK-01|BLOCK-01|",
  key: "demo-key",
  blockSize: 8,
  iv: "iv-demo1",
}

export const ECB_PATTERN_SAMPLES = {
  repeated: "BLOCK-01|BLOCK-01|BLOCK-01|UNIQUE!!|BLOCK-01|BLOCK-01|",
  imageLike: "WHITEPIXWHITEPIXWHITEPIXBLACKPIXWHITEPIXWHITEPIX",
  mixed: "PAYLOAD1PAYLOAD2PAYLOAD1PAYLOAD3PAYLOAD1PAYLOAD4",
}

function toHexByte(value: number) {
  return (value & 0xff).toString(16).toUpperCase().padStart(2, "0")
}

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

function bytesToHex(bytes: number[]) {
  return bytes.map(toHexByte).join("")
}

function xorBytes(left: number[], right: number[]) {
  return left.map((byte, index) => byte ^ right[index % right.length])
}

function normaliseBlockBytes(bytes: number[], blockSize: number) {
  const block = bytes.slice(0, blockSize)
  while (block.length < blockSize) block.push(0x20)
  return block
}

function keyStream(key: string, blockSize: number): number[] {
  const bytes = textToBytes(key || "demo-key")
  const stream: number[] = []

  for (let index = 0; index < blockSize; index += 1) {
    const base = bytes[index % bytes.length]
    stream.push((base + index * 31 + 0x5a) & 0xff)
  }

  return stream
}

export function validateEcbPatternInput(input: EcbPatternInput): EcbPatternInput {
  if (!input.plaintext.trim()) {
    throw new Error("Plaintext is required for the ECB pattern demo.")
  }

  if (!input.key.trim()) {
    throw new Error("Key is required for the ECB pattern demo.")
  }

  if (!input.iv.trim()) {
    throw new Error("IV is required for the CBC comparison demo.")
  }

  if (!Number.isInteger(input.blockSize) || input.blockSize < 4 || input.blockSize > 16) {
    throw new Error("Block size must be an integer between 4 and 16.")
  }

  const bytes = textToBytes(input.plaintext)
  if (bytes.length > 256) {
    throw new Error("This educational demo supports up to 256 UTF-8 bytes.")
  }

  return {
    plaintext: input.plaintext,
    key: input.key.trim(),
    iv: input.iv,
    blockSize: input.blockSize,
  }
}

export function splitIntoBlocks(text: string, blockSize: number): string[] {
  const chars = Array.from(text)
  const blocks: string[] = []

  for (let index = 0; index < chars.length; index += blockSize) {
    blocks.push(chars.slice(index, index + blockSize).join("").padEnd(blockSize, " "))
  }

  return blocks
}

export function toyBlockEncrypt(blockText: string, key: string, blockSize: number): string {
  const blockBytes = normaliseBlockBytes(textToBytes(blockText), blockSize)
  const stream = keyStream(key, blockSize)
  const mixed = xorBytes(blockBytes, stream).map((byte, index) => {
    const rotated = ((byte << ((index % 3) + 1)) | (byte >>> (8 - ((index % 3) + 1)))) & 0xff
    return rotated ^ ((index * 17 + 0xa5) & 0xff)
  })

  return bytesToHex(mixed)
}

export function toyCbcEncryptBlocks(blocks: string[], key: string, blockSize: number, iv: string): string[] {
  let previous = normaliseBlockBytes(textToBytes(iv), blockSize)
  const encrypted: string[] = []

  for (const block of blocks) {
    const blockBytes = normaliseBlockBytes(textToBytes(block), blockSize)
    const chained = xorBytes(blockBytes, previous)
    const chainedText = String.fromCharCode(...chained)
    const cipherHex = toyBlockEncrypt(chainedText, key, blockSize)
    encrypted.push(cipherHex)
    previous = Array.from({ length: blockSize }, (_, index) =>
      Number.parseInt(cipherHex.slice(index * 2, index * 2 + 2), 16),
    )
  }

  return encrypted
}

function countRepeated(values: string[]) {
  const seen = new Map<string, number>()
  let duplicates = 0

  for (const value of values) {
    const count = seen.get(value) ?? 0
    if (count > 0) duplicates += 1
    seen.set(value, count + 1)
  }

  return duplicates
}

function leakageLevel(duplicates: number, total: number): EcbPatternResult["leakageLevel"] {
  if (duplicates === 0) return "low"
  const ratio = duplicates / Math.max(1, total)
  if (ratio >= 0.4) return "high"
  return "medium"
}

export function runEcbPatternLeakagePlayground(rawInput: EcbPatternInput): EcbPatternResult {
  const input = validateEcbPatternInput(rawInput)
  const plaintextBlocks = splitIntoBlocks(input.plaintext, input.blockSize)
  const ecbCiphertexts = plaintextBlocks.map((block) =>
    toyBlockEncrypt(block, input.key, input.blockSize),
  )
  const cbcCiphertexts = toyCbcEncryptBlocks(
    plaintextBlocks,
    input.key,
    input.blockSize,
    input.iv,
  )

  const plaintextCounts = new Map<string, number>()
  const ecbCounts = new Map<string, number>()

  plaintextBlocks.forEach((block) =>
    plaintextCounts.set(block, (plaintextCounts.get(block) ?? 0) + 1),
  )
  ecbCiphertexts.forEach((cipher) =>
    ecbCounts.set(cipher, (ecbCounts.get(cipher) ?? 0) + 1),
  )

  const blocks = plaintextBlocks.map((block, index) => {
    const repeatedPlaintext = (plaintextCounts.get(block) ?? 0) > 1
    const repeatedEcbCiphertext = (ecbCounts.get(ecbCiphertexts[index]) ?? 0) > 1

    return {
      index,
      plaintext: block,
      plaintextHex: bytesToHex(normaliseBlockBytes(textToBytes(block), input.blockSize)),
      ecbCiphertext: ecbCiphertexts[index],
      cbcCiphertext: cbcCiphertexts[index],
      repeatedPlaintext,
      repeatedEcbCiphertext,
      note:
        repeatedPlaintext && repeatedEcbCiphertext
          ? "ECB encrypts identical plaintext blocks into identical ciphertext blocks, so the pattern remains visible."
          : "This block does not repeat in ECB output, but ECB still lacks chaining and semantic security.",
    }
  })

  const ecbDuplicateCount = countRepeated(ecbCiphertexts)
  const repeatedPlaintextCount = countRepeated(plaintextBlocks)

  return {
    input,
    blocks,
    ecbDuplicateCount,
    repeatedPlaintextCount,
    leakageLevel: leakageLevel(ecbDuplicateCount, blocks.length),
    explanation:
      "ECB mode encrypts each block independently. Identical plaintext blocks produce identical ciphertext blocks, which can leak visual or structural patterns. Chained modes randomise each block with previous state or nonce-based input.",
  }
}

export function buildEcbPatternManualChecklist(): string[] {
  return [
    "Open the ECB Pattern Leakage Playground page.",
    "Confirm the default repeated plaintext shows repeated ECB ciphertext blocks.",
    "Confirm CBC comparison produces different ciphertext for repeated plaintext blocks.",
    "Change the block size and confirm block grouping updates.",
    "Use sample buttons and confirm the pattern cards update.",
    "Enter an empty plaintext and confirm a friendly validation error appears.",
    "Change key or IV and confirm ciphertext values update.",
    "Resize to mobile width and confirm cards and tables remain usable.",
  ]
}
