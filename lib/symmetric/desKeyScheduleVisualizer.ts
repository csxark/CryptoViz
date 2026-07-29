export interface DesKeyScheduleInput {
  keyHex: string;
}

export interface DesRoundKey {
  round: number;
  shift: number;
  c: string;
  d: string;
  combined: string;
  subkey: string;
  note: string;
}

export interface DesKeyScheduleResult {
  originalKey: string;
  keyBits64: string;
  permutedKey56: string;
  c0: string;
  d0: string;
  rounds: DesRoundKey[];
  steps: DesKeyScheduleStep[];
}

export interface DesKeyScheduleStep {
  id: string;
  title: string;
  value: string;
  explanation: string;
}

export const DEFAULT_DES_KEY_SCHEDULE_INPUT: DesKeyScheduleInput = {
  keyHex: "133457799BBCDFF1",
};

export const DES_LEFT_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

export const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
  27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38,
  30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];

export const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27,
  20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34,
  53, 46, 42, 50, 36, 29, 32,
];

function cleanHex(hex: string) {
  return hex.trim().replace(/\s+/g, "").toUpperCase();
}

export function validateDesKeyHex(keyHex: string): string {
  const cleaned = cleanHex(keyHex);

  if (!cleaned) {
    throw new Error("DES key is required.");
  }

  if (!/^[A-F0-9]+$/.test(cleaned)) {
    throw new Error("DES key must contain only hexadecimal characters.");
  }

  if (cleaned.length !== 16) {
    throw new Error("DES key must be exactly 16 hexadecimal characters.");
  }

  return cleaned;
}

export function hexToBits(hex: string): string {
  const cleaned = validateDesKeyHex(hex);

  return cleaned
    .split("")
    .map((char) => Number.parseInt(char, 16).toString(2).padStart(4, "0"))
    .join("");
}

export function bitsToHex(bits: string): string {
  if (!/^[01]+$/.test(bits) || bits.length % 4 !== 0) {
    throw new Error("Bit string must contain only 0/1 and be nibble-aligned.");
  }

  let hex = "";
  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2)
      .toString(16)
      .toUpperCase();
  }

  return hex;
}

export function permuteBits(bits: string, table: number[]): string {
  return table.map((position) => bits[position - 1]).join("");
}

export function leftRotate(bits: string, shift: number): string {
  return bits.slice(shift) + bits.slice(0, shift);
}

export function splitDesHalves(bits56: string) {
  if (bits56.length !== 56) {
    throw new Error("DES key schedule split expects 56 bits.");
  }

  return {
    c: bits56.slice(0, 28),
    d: bits56.slice(28),
  };
}

export function generateDesKeySchedule(keyHex: string): DesKeyScheduleResult {
  const originalKey = validateDesKeyHex(keyHex);
  const keyBits64 = hexToBits(originalKey);
  const permutedKey56 = permuteBits(keyBits64, PC1);
  let { c, d } = splitDesHalves(permutedKey56);
  const c0 = c;
  const d0 = d;

  const rounds: DesRoundKey[] = DES_LEFT_SHIFTS.map((shift, index) => {
    c = leftRotate(c, shift);
    d = leftRotate(d, shift);
    const combined = c + d;
    const subkeyBits = permuteBits(combined, PC2);

    return {
      round: index + 1,
      shift,
      c,
      d,
      combined,
      subkey: bitsToHex(subkeyBits),
      note:
        shift === 1
          ? "This round rotates both 28-bit halves left by 1 bit before PC-2 compression."
          : "This round rotates both 28-bit halves left by 2 bits before PC-2 compression.",
    };
  });

  return {
    originalKey,
    keyBits64,
    permutedKey56,
    c0,
    d0,
    rounds,
    steps: [
      {
        id: "hex-to-bits",
        title: "Convert 64-bit key to bits",
        value: keyBits64,
        explanation:
          "The 16-character hexadecimal DES key represents 64 bits, including parity bits.",
      },
      {
        id: "pc1",
        title: "Apply PC-1",
        value: permutedKey56,
        explanation:
          "PC-1 removes parity bits and permutes the key into a 56-bit value.",
      },
      {
        id: "split",
        title: "Split into C0 and D0",
        value: `${c0} | ${d0}`,
        explanation:
          "The 56-bit value is split into two 28-bit halves called C0 and D0.",
      },
      {
        id: "rotate-and-compress",
        title: "Rotate and apply PC-2",
        value: rounds
          .map((round) => `K${round.round}=${round.subkey}`)
          .join(", "),
        explanation:
          "Each round rotates C and D, joins them, then PC-2 compresses 56 bits into a 48-bit subkey.",
      },
    ],
  };
}

export function getDesKeyScheduleManualChecklist(): string[] {
  return [
    "Open the DES Key Schedule Visualizer page.",
    "Confirm the default key 133457799BBCDFF1 generates 16 round subkeys.",
    "Confirm round 1 subkey is 1B02EFFC7072.",
    "Click multiple rounds and confirm C, D, combined key, shift count, and subkey update.",
    "Enter a non-hex key and confirm a friendly validation error appears.",
    "Enter a key shorter than 16 hex characters and confirm validation prevents generation.",
    "Resize to mobile width and confirm round cards and tables remain usable.",
  ];
}
