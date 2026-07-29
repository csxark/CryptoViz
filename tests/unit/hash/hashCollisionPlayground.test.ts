import { describe, expect, it } from "vitest"
import {
  DEFAULT_HASH_COLLISION_INPUT,
  buildHashCollisionManualChecklist,
  demoHash32,
  estimateBirthdayCollisionChance,
  parseCollisionValues,
  runHashCollisionPlayground,
  truncateHash,
  validateHashCollisionInput,
} from "../../../lib/hash/hashCollisionPlayground"

describe("hash collision playground utilities", () => {
  it("parses newline and comma separated values", () => {
    expect(parseCollisionValues("apple\nbanana, carrot\n\n")).toEqual([
      "apple",
      "banana",
      "carrot",
    ])
  })

  it("validates playground input", () => {
    expect(validateHashCollisionInput(DEFAULT_HASH_COLLISION_INPUT).hashBits).toBe(8)

    expect(() =>
      validateHashCollisionInput({ valuesText: "only-one", hashBits: 8 }),
    ).toThrow(/at least two/i)

    expect(() =>
      validateHashCollisionInput({ valuesText: "a\nb", hashBits: 3 }),
    ).toThrow(/between 4 and 16/i)
  })

  it("hashes deterministically and truncates hashes", () => {
    const hash = demoHash32("apple")

    expect(hash).toBe(demoHash32("apple"))
    expect(hash).not.toBe(demoHash32("banana"))
    expect(truncateHash("000000ff", 8)).toBe("FF")
    expect(truncateHash("000000ff", 4)).toBe("F")
  })

  it("builds collision groups", () => {
    const result = runHashCollisionPlayground({
      valuesText: "apple\nbanana\ncarrot\ndelta\necho\nfoxtrot\ngrape\nhotel",
      hashBits: 4,
    })

    expect(result.values).toHaveLength(8)
    expect(result.bucketCount).toBe(16)
    expect(result.groups.length).toBeLessThanOrEqual(8)
    expect(result.totalCollisions).toBeGreaterThanOrEqual(0)
  })

  it("reports no collisions for known unique wider bucket sample", () => {
    const result = runHashCollisionPlayground({
      valuesText: "apple\nbanana\ncarrot",
      hashBits: 16,
    })

    expect(result.values).toHaveLength(3)
    expect(result.collisionGroups.every((group) => group.values.length > 1)).toBe(true)
  })

  it("estimates birthday collision chance", () => {
    expect(estimateBirthdayCollisionChance(1, 8)).toBe(0)
    expect(estimateBirthdayCollisionChance(10, 4)).toBeGreaterThan(
      estimateBirthdayCollisionChance(3, 4),
    )
  })

  it("builds manual testing checklist", () => {
    const checklist = buildHashCollisionManualChecklist()

    expect(checklist[0]).toMatch(/open the hash collision/i)
    expect(checklist).toContain(
      "Change hash bits to a smaller value and confirm collisions become more likely.",
    )
  })
})
