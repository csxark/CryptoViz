import { describe, expect, it } from "vitest"
import {
  DEFAULT_SIDE_CHANNEL_INPUT,
  buildSideChannelManualChecklist,
  matchedPrefixLength,
  runSideChannelPlayground,
  validateSideChannelInput,
} from "../../../lib/attacks/sideChannelPlayground"

describe("side-channel playground utilities", () => {
  it("validates side-channel demo input", () => {
    expect(validateSideChannelInput(DEFAULT_SIDE_CHANNEL_INPUT)).toMatchObject({
      secret: "cryptoviz",
      guess: "cryptozzz",
      mode: "timing",
      samples: 16,
    })

    expect(() =>
      validateSideChannelInput({ ...DEFAULT_SIDE_CHANNEL_INPUT, secret: "" }),
    ).toThrow(/secret is required/i)

    expect(() =>
      validateSideChannelInput({ ...DEFAULT_SIDE_CHANNEL_INPUT, guess: "" }),
    ).toThrow(/guess is required/i)

    expect(() =>
      validateSideChannelInput({ ...DEFAULT_SIDE_CHANNEL_INPUT, samples: 0 }),
    ).toThrow(/samples must be/i)
  })

  it("computes matched prefix length", () => {
    expect(matchedPrefixLength("cryptoviz", "cryptozzz")).toBe(6)
    expect(matchedPrefixLength("cryptoviz", "aaaaaaaa")).toBe(0)
    expect(matchedPrefixLength("cryptoviz", "cryptoviz")).toBe(9)
  })

  it("runs timing side-channel simulation", () => {
    const result = runSideChannelPlayground(DEFAULT_SIDE_CHANNEL_INPUT)

    expect(result.samples).toHaveLength(16)
    expect(result.leakedPrefix).toBe("crypto")
    expect(result.inferredRisk).toBe("medium")
    expect(result.modeExplanation).toMatch(/timing/i)
  })

  it("runs cache and power mode simulations", () => {
    const cache = runSideChannelPlayground({
      ...DEFAULT_SIDE_CHANNEL_INPUT,
      mode: "cache",
    })
    const power = runSideChannelPlayground({
      ...DEFAULT_SIDE_CHANNEL_INPUT,
      mode: "power",
    })

    expect(cache.modeExplanation).toMatch(/cache/i)
    expect(power.modeExplanation).toMatch(/power/i)
    expect(cache.samples[0].mode).toBe("cache")
    expect(power.samples[0].mode).toBe("power")
  })

  it("marks high risk for full or near-full prefix leakage", () => {
    const result = runSideChannelPlayground({
      secret: "cryptoviz",
      guess: "cryptoviz",
      mode: "timing",
      samples: 3,
    })

    expect(result.leakedPrefix).toBe("cryptoviz")
    expect(result.inferredRisk).toBe("high")
  })

  it("has mode-specific mitigation notes", () => {
    const timing = runSideChannelPlayground(DEFAULT_SIDE_CHANNEL_INPUT)
    const cache = runSideChannelPlayground({ ...DEFAULT_SIDE_CHANNEL_INPUT, mode: "cache" })

    expect(timing.mitigationNotes.some((note) => /constant-time comparison/i.test(note))).toBe(true)
    expect(cache.mitigationNotes.some((note) => /table lookups/i.test(note))).toBe(true)
  })

  it("builds manual testing checklist", () => {
    const checklist = buildSideChannelManualChecklist()

    expect(checklist[0]).toMatch(/open the side-channel/i)
    expect(checklist).toContain(
      "Switch between timing, cache, and power modes and confirm explanations update.",
    )
  })
})
