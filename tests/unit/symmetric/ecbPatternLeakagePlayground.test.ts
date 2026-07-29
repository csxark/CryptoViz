import { describe, expect, it } from "vitest"
import {
  DEFAULT_ECB_PATTERN_INPUT,
  buildEcbPatternManualChecklist,
  runEcbPatternLeakagePlayground,
  splitIntoBlocks,
  toyBlockEncrypt,
  validateEcbPatternInput,
} from "../../../lib/symmetric/ecbPatternLeakagePlayground"

describe("ECB pattern leakage playground utilities", () => {
  it("validates ECB pattern input", () => {
    expect(validateEcbPatternInput(DEFAULT_ECB_PATTERN_INPUT).blockSize).toBe(8)

    expect(() =>
      validateEcbPatternInput({ ...DEFAULT_ECB_PATTERN_INPUT, plaintext: "" }),
    ).toThrow(/plaintext is required/i)

    expect(() =>
      validateEcbPatternInput({ ...DEFAULT_ECB_PATTERN_INPUT, key: "" }),
    ).toThrow(/key is required/i)

    expect(() =>
      validateEcbPatternInput({ ...DEFAULT_ECB_PATTERN_INPUT, blockSize: 3 }),
    ).toThrow(/between 4 and 16/i)
  })

  it("splits plaintext into padded blocks", () => {
    expect(splitIntoBlocks("ABCDEFGH123", 4)).toEqual(["ABCD", "EFGH", "123 "])
  })

  it("encrypts identical blocks identically with the toy ECB transform", () => {
    expect(toyBlockEncrypt("BLOCK-01", "key", 8)).toBe(
      toyBlockEncrypt("BLOCK-01", "key", 8),
    )
    expect(toyBlockEncrypt("BLOCK-01", "key", 8)).not.toBe(
      toyBlockEncrypt("UNIQUE!!", "key", 8),
    )
  })

  it("detects ECB duplicate ciphertext for repeated plaintext blocks", () => {
    const result = runEcbPatternLeakagePlayground(DEFAULT_ECB_PATTERN_INPUT)

    expect(result.blocks.length).toBeGreaterThan(1)
    expect(result.repeatedPlaintextCount).toBeGreaterThan(0)
    expect(result.ecbDuplicateCount).toBeGreaterThan(0)
    expect(result.blocks.some((block) => block.repeatedEcbCiphertext)).toBe(true)
  })

  it("shows CBC comparison differs for repeated plaintext blocks", () => {
    const result = runEcbPatternLeakagePlayground({
      plaintext: "ABCDEFGHABCDEFGHABCDEFGH",
      key: "demo-key",
      iv: "iv-demo1",
      blockSize: 8,
    })

    const ecbValues = result.blocks.map((block) => block.ecbCiphertext)
    const cbcValues = result.blocks.map((block) => block.cbcCiphertext)

    expect(new Set(ecbValues).size).toBe(1)
    expect(new Set(cbcValues).size).toBe(3)
  })

  it("updates ciphertext when key or IV changes", () => {
    const first = runEcbPatternLeakagePlayground(DEFAULT_ECB_PATTERN_INPUT)
    const changedKey = runEcbPatternLeakagePlayground({
      ...DEFAULT_ECB_PATTERN_INPUT,
      key: "other-key",
    })
    const changedIv = runEcbPatternLeakagePlayground({
      ...DEFAULT_ECB_PATTERN_INPUT,
      iv: "other-iv",
    })

    expect(first.blocks[0].ecbCiphertext).not.toBe(changedKey.blocks[0].ecbCiphertext)
    expect(first.blocks[0].cbcCiphertext).not.toBe(changedIv.blocks[0].cbcCiphertext)
  })

  it("builds manual testing checklist", () => {
    const checklist = buildEcbPatternManualChecklist()

    expect(checklist[0]).toMatch(/open the ecb pattern/i)
    expect(checklist).toContain(
      "Confirm CBC comparison produces different ciphertext for repeated plaintext blocks.",
    )
  })
})
