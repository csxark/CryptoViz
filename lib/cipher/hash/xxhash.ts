import { toByteArray, fromByteArray } from "../../utils/encoding";
import { CipherError } from "../../utils/errors";
import { validateHashInput } from "./sha256";
import type {
  CipherMetadata,
  CipherOptions,
  CipherResult,
  CipherStep,
  TestVector,
} from "../types";

const PRIME32_1 = 0x9e3779b1;
const PRIME32_2 = 0x85ebca77;
const PRIME32_3 = 0xc2b2ae3d;
const PRIME32_4 = 0x27d4eb2f;
const PRIME32_5 = 0x165667b1;

const METADATA: CipherMetadata = {
  name: "XXHash32",
  blockSize: 16,
  rounds: 0,
  securityStatus: "deprecated",
  yearDesigned: 2012,
  standardBody: "Cyan4973 reference algorithm",
  breakingComplexity: "Non-cryptographic hash; not collision resistant.",
};

export const TEST_VECTORS: TestVector[] = [
  {
    input: "",
    key: "0",
    expected: "02cc5d05",
    description: "XXH32 empty input with seed 0",
  },
  {
    input: "a",
    key: "0",
    expected: "550d7456",
    description: "XXH32 one-byte input with seed 0",
  },
  {
    input: "abc",
    key: "0",
    expected: "32d153ff",
    description: "XXH32 short input with seed 0",
  },
  {
    input: "Hello, World!",
    key: "0",
    expected: "4007de50",
    description: "XXH32 default visualizer input with seed 0",
  },
  {
    input: "The quick brown fox jumps over the lazy dog",
    key: "1",
    expected: "234f8471",
    description: "XXH32 longer input with seed 1",
  },
];

function toUint32(value: number): number {
  return value >>> 0;
}

function rotl32(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function mul32(a: number, b: number): number {
  return Math.imul(a, b) >>> 0;
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function parseSeed(key: string | undefined): number {
  const raw = key?.trim() ?? "";
  if (!raw) return 0;

  const parsed =
    raw.startsWith("0x") || raw.startsWith("0X")
      ? Number.parseInt(raw.slice(2), 16)
      : Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new CipherError(
      "INVALID_KEY",
      "XXHash seed must be a decimal integer or 0x-prefixed hexadecimal value.",
    );
  }

  if (parsed < 0 || parsed > 0xffffffff) {
    throw new CipherError(
      "INVALID_KEY",
      "XXHash seed must fit inside an unsigned 32-bit integer.",
    );
  }

  return parsed >>> 0;
}

function round(accumulator: number, lane: number): number {
  return mul32(
    rotl32(add32(accumulator, mul32(lane, PRIME32_2)), 13),
    PRIME32_1,
  );
}

function avalanche(value: number): number {
  let hash = value >>> 0;
  hash ^= hash >>> 15;
  hash = mul32(hash, PRIME32_2);
  hash ^= hash >>> 13;
  hash = mul32(hash, PRIME32_3);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export function xxh32Hex(inputBytes: Uint8Array, seed = 0): string {
  let offset = 0;
  let hash: number;

  if (inputBytes.length >= 16) {
    let v1 = add32(seed, PRIME32_1, PRIME32_2);
    let v2 = add32(seed, PRIME32_2);
    let v3 = seed >>> 0;
    let v4 = add32(seed, -PRIME32_1);

    const limit = inputBytes.length - 16;
    while (offset <= limit) {
      v1 = round(v1, readUint32LE(inputBytes, offset));
      offset += 4;
      v2 = round(v2, readUint32LE(inputBytes, offset));
      offset += 4;
      v3 = round(v3, readUint32LE(inputBytes, offset));
      offset += 4;
      v4 = round(v4, readUint32LE(inputBytes, offset));
      offset += 4;
    }

    hash = add32(rotl32(v1, 1), rotl32(v2, 7), rotl32(v3, 12), rotl32(v4, 18));
  } else {
    hash = add32(seed, PRIME32_5);
  }

  hash = add32(hash, inputBytes.length);

  while (offset + 4 <= inputBytes.length) {
    hash = mul32(
      rotl32(
        add32(hash, mul32(readUint32LE(inputBytes, offset), PRIME32_3)),
        17,
      ),
      PRIME32_4,
    );
    offset += 4;
  }

  while (offset < inputBytes.length) {
    hash = mul32(
      rotl32(add32(hash, mul32(inputBytes[offset], PRIME32_5)), 11),
      PRIME32_1,
    );
    offset += 1;
  }

  return toHex32(avalanche(hash));
}

function pushStep(steps: CipherStep[], step: Omit<CipherStep, "index">): void {
  steps.push({
    index: steps.length,
    ...step,
  });
}

function xxhashInstrumented(
  inputBytes: Uint8Array,
  seed: number,
): CipherResult {
  const start = performance.now();
  const steps: CipherStep[] = [];
  let offset = 0;
  let hash: number;

  pushStep(steps, {
    label: "Read input and seed",
    inputState: fromByteArray(inputBytes, "hex"),
    outputState: "",
    table: [
      { key: "Input length", value: `${inputBytes.length} bytes` },
      { key: "Seed", value: `0x${toHex32(seed)}` },
      { key: "Mode", value: "XXH32 non-cryptographic hash" },
    ],
    note: "XXHash32 begins by converting the message into bytes and applying a 32-bit seed. It is designed for speed and checksums, not cryptographic collision resistance.",
    isMilestone: true,
  });

  if (inputBytes.length >= 16) {
    let v1 = add32(seed, PRIME32_1, PRIME32_2);
    let v2 = add32(seed, PRIME32_2);
    let v3 = seed >>> 0;
    let v4 = add32(seed, -PRIME32_1);

    pushStep(steps, {
      label: "Initialize four accumulators",
      inputState: "",
      outputState: "",
      table: [
        { key: "v1", value: `0x${toHex32(v1)}` },
        { key: "v2", value: `0x${toHex32(v2)}` },
        { key: "v3", value: `0x${toHex32(v3)}` },
        { key: "v4", value: `0x${toHex32(v4)}` },
      ],
      note: "Inputs of at least 16 bytes are processed in four parallel 32-bit lanes. This is the main reason XXHash is very fast.",
      isMilestone: true,
    });

    const limit = inputBytes.length - 16;
    let stripe = 0;

    while (offset <= limit) {
      const lane1 = readUint32LE(inputBytes, offset);
      offset += 4;
      const lane2 = readUint32LE(inputBytes, offset);
      offset += 4;
      const lane3 = readUint32LE(inputBytes, offset);
      offset += 4;
      const lane4 = readUint32LE(inputBytes, offset);
      offset += 4;

      v1 = round(v1, lane1);
      v2 = round(v2, lane2);
      v3 = round(v3, lane3);
      v4 = round(v4, lane4);

      pushStep(steps, {
        label: `Process 16-byte stripe ${stripe}`,
        inputState: fromByteArray(inputBytes.slice(offset - 16, offset), "hex"),
        outputState: "",
        matrix: [
          [`lane 1`, `0x${toHex32(lane1)}`, `v1 = 0x${toHex32(v1)}`],
          [`lane 2`, `0x${toHex32(lane2)}`, `v2 = 0x${toHex32(v2)}`],
          [`lane 3`, `0x${toHex32(lane3)}`, `v3 = 0x${toHex32(v3)}`],
          [`lane 4`, `0x${toHex32(lane4)}`, `v4 = 0x${toHex32(v4)}`],
        ],
        note: "Each 32-bit little-endian word is mixed into its lane using multiplication by a prime, a left rotation, and another prime multiplication.",
      });

      stripe += 1;
    }

    hash = add32(rotl32(v1, 1), rotl32(v2, 7), rotl32(v3, 12), rotl32(v4, 18));

    pushStep(steps, {
      label: "Merge accumulators",
      inputState: "",
      outputState: `0x${toHex32(hash)}`,
      table: [
        { key: "rotl(v1, 1)", value: `0x${toHex32(rotl32(v1, 1))}` },
        { key: "rotl(v2, 7)", value: `0x${toHex32(rotl32(v2, 7))}` },
        { key: "rotl(v3, 12)", value: `0x${toHex32(rotl32(v3, 12))}` },
        { key: "rotl(v4, 18)", value: `0x${toHex32(rotl32(v4, 18))}` },
      ],
      note: "The four lanes are rotated by different amounts and added to form the main hash state.",
      isMilestone: true,
    });
  } else {
    hash = add32(seed, PRIME32_5);

    pushStep(steps, {
      label: "Short-input initialization",
      inputState: "",
      outputState: `0x${toHex32(hash)}`,
      table: [
        { key: "seed", value: `0x${toHex32(seed)}` },
        { key: "PRIME32_5", value: `0x${toHex32(PRIME32_5)}` },
      ],
      note: "Inputs shorter than 16 bytes skip the four-lane accumulator stage and begin with seed + PRIME32_5.",
      isMilestone: true,
    });
  }

  hash = add32(hash, inputBytes.length);
  pushStep(steps, {
    label: "Add input length",
    inputState: "",
    outputState: `0x${toHex32(hash)}`,
    table: [{ key: "length", value: `${inputBytes.length} bytes` }],
    note: "The message length is added so messages with the same tail bytes but different lengths produce different hashes.",
    isMilestone: true,
  });

  while (offset + 4 <= inputBytes.length) {
    const word = readUint32LE(inputBytes, offset);
    hash = mul32(rotl32(add32(hash, mul32(word, PRIME32_3)), 17), PRIME32_4);

    pushStep(steps, {
      label: `Mix remaining 4-byte word at offset ${offset}`,
      inputState: fromByteArray(inputBytes.slice(offset, offset + 4), "hex"),
      outputState: `0x${toHex32(hash)}`,
      table: [
        { key: "word", value: `0x${toHex32(word)}` },
        { key: "hash", value: `0x${toHex32(hash)}` },
      ],
      note: "Remaining 4-byte chunks are multiplied by PRIME32_3, rotated, then multiplied by PRIME32_4.",
    });

    offset += 4;
  }

  while (offset < inputBytes.length) {
    const byte = inputBytes[offset];
    hash = mul32(rotl32(add32(hash, mul32(byte, PRIME32_5)), 11), PRIME32_1);

    pushStep(steps, {
      label: `Mix remaining byte at offset ${offset}`,
      inputState: byte.toString(16).padStart(2, "0"),
      outputState: `0x${toHex32(hash)}`,
      table: [
        { key: "byte", value: `0x${byte.toString(16).padStart(2, "0")}` },
        { key: "hash", value: `0x${toHex32(hash)}` },
      ],
      note: "Each leftover byte still affects the final digest through prime multiplication and rotation.",
    });

    offset += 1;
  }

  const beforeAvalanche = hash;

  hash ^= hash >>> 15;
  const afterShift15 = hash >>> 0;
  hash = mul32(hash, PRIME32_2);
  const afterPrime2 = hash;
  hash ^= hash >>> 13;
  const afterShift13 = hash >>> 0;
  hash = mul32(hash, PRIME32_3);
  const afterPrime3 = hash;
  hash ^= hash >>> 16;
  hash >>>= 0;

  pushStep(steps, {
    label: "Avalanche finalization",
    inputState: `0x${toHex32(beforeAvalanche)}`,
    outputState: `0x${toHex32(hash)}`,
    table: [
      { key: "xor >> 15", value: `0x${toHex32(afterShift15)}` },
      { key: "* PRIME32_2", value: `0x${toHex32(afterPrime2)}` },
      { key: "xor >> 13", value: `0x${toHex32(afterShift13)}` },
      { key: "* PRIME32_3", value: `0x${toHex32(afterPrime3)}` },
      { key: "xor >> 16", value: `0x${toHex32(hash)}` },
    ],
    note: "The avalanche stage diffuses small input changes across the final 32-bit output.",
    isMilestone: true,
  });

  pushStep(steps, {
    label: "Final XXH32 digest",
    inputState: "",
    outputState: toHex32(hash),
    table: [
      { key: "Hex digest", value: toHex32(hash) },
      { key: "Unsigned integer", value: hash.toString(10) },
    ],
    note: "The final 32-bit digest is displayed as eight hexadecimal characters. Use it for fast checksums, not for passwords, signatures, or security decisions.",
    isMilestone: true,
  });

  return {
    output: toHex32(hash),
    outputEncoding: "hex",
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  };
}

export function encrypt(
  input: string,
  key: string = "0",
  options: CipherOptions = {},
): CipherResult {
  validateHashInput(input);
  const seed = parseSeed(key);
  const inputBytes = toByteArray(input, options.encoding || "utf8");

  if (options.instrument) {
    return xxhashInstrumented(inputBytes, seed);
  }

  const start = performance.now();
  const output = xxh32Hex(inputBytes, seed);

  return {
    output,
    outputEncoding: "hex",
    steps: [],
    metadata: METADATA,
    durationMs: performance.now() - start,
  };
}

export function decrypt(): CipherResult {
  throw new CipherError(
    "ALGORITHM_UNSUPPORTED",
    "XXHash is a one-way non-cryptographic hash and does not support decryption.",
  );
}
