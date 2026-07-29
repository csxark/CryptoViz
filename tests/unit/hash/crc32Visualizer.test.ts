import { describe, expect, it } from "vitest"
import {
  CRC32_POLYNOMIAL,
  DEFAULT_CRC32_INPUT,
  buildCrc32Table,
  getCrc32ManualChecklist,
  parseHex32,
  runCrc32Visualization,
  validateCrc32Input,
} from "../../../lib/hash/crc32Visualizer"

describe("CRC32 visualizer utilities", () => {
  it("parses hexadecimal 32-bit values", () => {
    expect(parseHex32("FFFFFFFF", "Initial value")).toBe(0xffffffff)
    expect(parseHex32("0x00000000", "Initial value")).toBe(0)
    expect(() => parseHex32("", "Initial value")).toThrow(/required/i)
    expect(() => parseHex32("zz", "Initial value")).toThrow(/hexadecimal/i)
  })

  it("validates CRC32 input", () => {
    expect(validateCrc32Input(DEFAULT_CRC32_INPUT)).toMatchObject({
      message: "CryptoViz",
      initialValue: "FFFFFFFF",
      finalXorValue: "FFFFFFFF",
    })

    expect(() =>
      validateCrc32Input({ ...DEFAULT_CRC32_INPUT, message: "" }),
    ).toThrow(/message is required/i)
  })

  it("builds the standard CRC32 table", () => {
    const table = buildCrc32Table()

    expect(table).toHaveLength(256)
    expect(table[0]).toBe(0x00000000)
    expect(table[1]).toBe(0x77073096)
    expect(CRC32_POLYNOMIAL).toBe(0xedb88320)
  })

  it("calculates the standard CRC32 test vector", () => {
    const result = runCrc32Visualization({
      message: "123456789",
      initialValue: "FFFFFFFF",
      finalXorValue: "FFFFFFFF",
    })

    expect(result.checksum).toBe("CBF43926")
    expect(result.steps).toHaveLength(9)
  })

  it("updates checksum when message changes", () => {
    expect(runCrc32Visualization(DEFAULT_CRC32_INPUT).checksum).not.toBe(
      runCrc32Visualization({ ...DEFAULT_CRC32_INPUT, message: "CryptoViz!" }).checksum,
    )
  })

  it("captures byte-by-byte trace fields", () => {
    const result = runCrc32Visualization({
      message: "A",
      initialValue: "FFFFFFFF",
      finalXorValue: "FFFFFFFF",
    })

    expect(result.steps[0]).toMatchObject({
      index: 0,
      byteHex: "41",
      character: "A",
    })
    expect(result.steps[0].tableIndex).toMatch(/^[A-F0-9]{2}$/)
    expect(result.steps[0].tableValue).toMatch(/^[A-F0-9]{8}$/)
  })

  it("builds manual testing checklist", () => {
    const checklist = getCrc32ManualChecklist()

    expect(checklist[0]).toMatch(/open the crc32/i)
    expect(checklist).toContain("Use message 123456789 and confirm checksum CBF43926.")
  })
})
