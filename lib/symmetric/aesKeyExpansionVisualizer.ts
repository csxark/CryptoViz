export interface AesKeyExpansionInput {
  keyHex: string;
}

export interface AesKeyWord {
  index: number;
  bytes: string[];
  source: "key" | "rotword" | "subword" | "rcon" | "xor";
  expression: string;
  note: string;
}

export interface AesKeyExpansionRound {
  round: number;
  roundKey: string;
  words: AesKeyWord[];
}

export interface AesKeyExpansionResult {
  originalKey: string;
  expandedWords: AesKeyWord[];
  roundKeys: AesKeyExpansionRound[];
  steps: AesKeyWord[];
}

export const AES_128_KEY_BYTES = 16;
export const AES_128_WORD_COUNT = 44;
export const AES_128_ROUND_COUNT = 11;

const SBOX = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

export const DEFAULT_AES_KEY_EXPANSION_INPUT: AesKeyExpansionInput = {
  keyHex: "000102030405060708090a0b0c0d0e0f",
};

function cleanHex(hex: string) {
  return hex.trim().replace(/\s+/g, "").toLowerCase();
}

function toHex(byte: number) {
  return byte.toString(16).padStart(2, "0");
}

function xorWords(a: number[], b: number[]) {
  return a.map((byte, index) => byte ^ b[index]);
}

function wordToHexBytes(word: number[]) {
  return word.map(toHex);
}

export function validateAes128KeyHex(keyHex: string): string {
  const cleaned = cleanHex(keyHex);

  if (!cleaned) {
    throw new Error("AES-128 key is required.");
  }

  if (!/^[a-f0-9]+$/.test(cleaned)) {
    throw new Error("AES-128 key must contain only hexadecimal characters.");
  }

  if (cleaned.length !== AES_128_KEY_BYTES * 2) {
    throw new Error("AES-128 key must be exactly 32 hexadecimal characters.");
  }

  return cleaned;
}

export function parseAesKeyBytes(keyHex: string): number[] {
  const cleaned = validateAes128KeyHex(keyHex);
  const bytes: number[] = [];

  for (let index = 0; index < cleaned.length; index += 2) {
    bytes.push(Number.parseInt(cleaned.slice(index, index + 2), 16));
  }

  return bytes;
}

export function rotWord(word: number[]) {
  if (word.length !== 4) {
    throw new Error("RotWord expects a 4-byte word.");
  }

  return [word[1], word[2], word[3], word[0]];
}

export function subWord(word: number[]) {
  if (word.length !== 4) {
    throw new Error("SubWord expects a 4-byte word.");
  }

  return word.map((byte) => SBOX[byte]);
}

export function applyRcon(word: number[], round: number) {
  if (word.length !== 4) {
    throw new Error("Rcon expects a 4-byte word.");
  }

  return [word[0] ^ RCON[round], word[1], word[2], word[3]];
}

export function expandAes128Key(keyHex: string): AesKeyExpansionResult {
  const cleaned = validateAes128KeyHex(keyHex);
  const keyBytes = parseAesKeyBytes(cleaned);
  const rawWords: number[][] = [];
  const expandedWords: AesKeyWord[] = [];

  for (let index = 0; index < 4; index += 1) {
    const word = keyBytes.slice(index * 4, index * 4 + 4);
    rawWords.push(word);
    expandedWords.push({
      index,
      bytes: wordToHexBytes(word),
      source: "key",
      expression: `w[${index}] = key bytes ${index * 4}-${index * 4 + 3}`,
      note: "The first four words come directly from the original 128-bit AES key.",
    });
  }

  for (let index = 4; index < AES_128_WORD_COUNT; index += 1) {
    let temp = [...rawWords[index - 1]];
    let note = `w[${index}] = w[${index - 4}] XOR w[${index - 1}]`;
    let source: AesKeyWord["source"] = "xor";
    let expression = `w[${index}] = w[${index - 4}] ⊕ w[${index - 1}]`;

    if (index % 4 === 0) {
      const rotated = rotWord(temp);
      const substituted = subWord(rotated);
      const rconApplied = applyRcon(substituted, index / 4);
      temp = rconApplied;
      source = "rcon";
      expression = `w[${index}] = w[${index - 4}] ⊕ Rcon(SubWord(RotWord(w[${index - 1}])))`;
      note =
        "At the start of each round key, AES rotates the previous word, applies the S-box, applies the round constant, then XORs with the word four positions back.";
    }

    const word = xorWords(rawWords[index - 4], temp);
    rawWords.push(word);
    expandedWords.push({
      index,
      bytes: wordToHexBytes(word),
      source,
      expression,
      note,
    });
  }

  const roundKeys: AesKeyExpansionRound[] = [];

  for (let round = 0; round < AES_128_ROUND_COUNT; round += 1) {
    const words = expandedWords.slice(round * 4, round * 4 + 4);
    roundKeys.push({
      round,
      words,
      roundKey: words.flatMap((word) => word.bytes).join(""),
    });
  }

  return {
    originalKey: cleaned,
    expandedWords,
    roundKeys,
    steps: expandedWords,
  };
}

export function getAesKeyExpansionManualChecklist(): string[] {
  return [
    "Open the AES Key Expansion Visualizer page.",
    "Confirm the default AES-128 key expands into 44 words.",
    "Confirm round 0 uses the original key bytes.",
    "Click a later round and confirm the round key updates.",
    "Inspect a word at an index divisible by 4 and confirm RotWord/SubWord/Rcon explanation appears.",
    "Enter a non-hex key and confirm a friendly validation error appears.",
    "Enter a key shorter than 32 hex characters and confirm validation prevents expansion.",
    "Resize to mobile width and confirm the table and round cards remain usable.",
  ];
}
