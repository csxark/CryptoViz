export interface Crc32Input {
  message: string
  initialValue: string
  finalXorValue: string
}

export interface Crc32Step {
  index: number
  byteHex: string
  character: string
  tableIndex: string
  tableValue: string
  before: string
  afterXor: string
  afterShiftXor: string
  note: string
}

export interface Crc32Result {
  message: string
  initialValue: string
  finalXorValue: string
  polynomial: string
  steps: Crc32Step[]
  checksum: string
  checksumDecimal: number
  tablePreview: string[]
}

export const DEFAULT_CRC32_INPUT: Crc32Input = {
  message: "CryptoViz",
  initialValue: "FFFFFFFF",
  finalXorValue: "FFFFFFFF",
}

export const CRC32_POLYNOMIAL = 0xedb88320

function toHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0")
}

function toHex8(value: number) {
  return (value & 0xff).toString(16).toUpperCase().padStart(2, "0")
}

export function parseHex32(value: string, label: string): number {
  const cleaned = value.trim().replace(/^0x/i, "")

  if (!cleaned) {
    throw new Error(`${label} is required.`)
  }

  if (!/^[a-fA-F0-9]{1,8}$/.test(cleaned)) {
    throw new Error(`${label} must be a hexadecimal value up to 8 characters.`)
  }

  return Number.parseInt(cleaned, 16) >>> 0
}

export function validateCrc32Input(input: Crc32Input): Crc32Input {
  const message = input.message

  if (message.length === 0) {
    throw new Error("Message is required for the CRC32 demo.")
  }

  const bytes = new TextEncoder().encode(message)
  if (bytes.length > 256) {
    throw new Error("This educational CRC32 visualizer supports up to 256 UTF-8 bytes.")
  }

  parseHex32(input.initialValue, "Initial value")
  parseHex32(input.finalXorValue, "Final XOR value")

  return {
    message,
    initialValue: toHex32(parseHex32(input.initialValue, "Initial value")),
    finalXorValue: toHex32(parseHex32(input.finalXorValue, "Final XOR value")),
  }
}

export function buildCrc32Table(polynomial = CRC32_POLYNOMIAL): number[] {
  const table: number[] = []

  for (let byte = 0; byte < 256; byte += 1) {
    let crc = byte

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ polynomial : crc >>> 1
    }

    table.push(crc >>> 0)
  }

  return table
}

export function runCrc32Visualization(rawInput: Crc32Input): Crc32Result {
  const input = validateCrc32Input(rawInput)
  const table = buildCrc32Table()
  const bytes = Array.from(new TextEncoder().encode(input.message))
  let crc = parseHex32(input.initialValue, "Initial value")
  const finalXor = parseHex32(input.finalXorValue, "Final XOR value")
  const steps: Crc32Step[] = []

  bytes.forEach((byte, index) => {
    const before = crc >>> 0
    const tableIndex = (before ^ byte) & 0xff
    const afterXor = (before ^ byte) >>> 0
    const afterShiftXor = ((before >>> 8) ^ table[tableIndex]) >>> 0

    steps.push({
      index,
      byteHex: toHex8(byte),
      character:
        byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : `byte ${toHex8(byte)}`,
      tableIndex: toHex8(tableIndex),
      tableValue: toHex32(table[tableIndex]),
      before: toHex32(before),
      afterXor: toHex32(afterXor),
      afterShiftXor: toHex32(afterShiftXor),
      note:
        "CRC32 mixes the low byte of the current register with the message byte, looks up a table value, shifts the register, then XORs the table value.",
    })

    crc = afterShiftXor
  })

  const checksumNumber = (crc ^ finalXor) >>> 0

  return {
    message: input.message,
    initialValue: input.initialValue,
    finalXorValue: input.finalXorValue,
    polynomial: toHex32(CRC32_POLYNOMIAL),
    steps,
    checksum: toHex32(checksumNumber),
    checksumDecimal: checksumNumber,
    tablePreview: table.slice(0, 16).map(toHex32),
  }
}

export function getCrc32ManualChecklist(): string[] {
  return [
    "Open the CRC32 Visualization page.",
    "Confirm the default message renders a CRC32 checksum.",
    "Change the message and confirm the checksum updates.",
    "Confirm each byte appears in the step table with table index and table value.",
    "Use message 123456789 and confirm checksum CBF43926.",
    "Enter an empty message and confirm a friendly validation error appears.",
    "Enter an invalid hex initial value and confirm validation prevents calculation.",
    "Resize to mobile width and confirm cards and tables remain usable.",
  ]
}
