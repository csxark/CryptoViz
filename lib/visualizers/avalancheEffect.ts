export type AvalancheAlgorithm = "toy-feistel" | "xor-rotate" | "mixing-hash";

export interface AvalancheInput {
  message: string;
  flippedBitIndex: number;
  rounds: number;
  algorithm: AvalancheAlgorithm;
}

export interface AvalancheRound {
  round: number;
  originalHex: string;
  changedHex: string;
  originalBits: string;
  changedBits: string;
  changedBitIndexes: number[];
  changedBitCount: number;
  totalBits: number;
  percentageDifference: number;
}

export interface AvalancheResult {
  input: AvalancheInput;
  flippedBitIndex: number;
  originalMessageBits: string;
  changedMessageBits: string;
  rounds: AvalancheRound[];
  finalChangedBitCount: number;
  finalPercentageDifference: number;
  averagePercentageDifference: number;
  maxChangedBitCount: number;
  heatmap: number[][];
}

const DEFAULT_ROUNDS = 8;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 16;
const OUTPUT_BITS = 64;
const OUTPUT_BYTES = OUTPUT_BITS / 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textToBytes(message: string): Uint8Array {
  const encoded = new TextEncoder().encode(message || "CryptoViz");
  const bytes = new Uint8Array(OUTPUT_BYTES);

  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index % OUTPUT_BYTES] ^= encoded[index];
    bytes[(index * 3 + 1) % OUTPUT_BYTES] = (bytes[(index * 3 + 1) % OUTPUT_BYTES] + encoded[index]) & 0xff;
  }

  return bytes;
}

function bytesToBits(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(2).padStart(8, "0"))
    .join("");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
}

function bitsToBytes(bits: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8).padEnd(8, "0"), 2);
  }

  return bytes;
}

export function flipBit(bits: string, bitIndex: number): string {
  if (!bits) return bits;
  const normalizedIndex = clamp(bitIndex, 0, bits.length - 1);
  const chars = bits.split("");
  chars[normalizedIndex] = chars[normalizedIndex] === "0" ? "1" : "0";
  return chars.join("");
}

function rotateLeftByte(value: number, shift: number): number {
  const amount = shift & 7;
  return ((value << amount) | (value >>> (8 - amount))) & 0xff;
}

function toyFeistelRound(state: Uint8Array, round: number): Uint8Array {
  const next = new Uint8Array(state.length);

  for (let index = 0; index < state.length; index += 1) {
    const left = state[index];
    const right = state[(index + 1) % state.length];
    const far = state[(index + 5) % state.length];
    const mixed = rotateLeftByte((right ^ far ^ (round * 29 + index * 17)) & 0xff, (round + index) % 8);
    next[index] = (left ^ mixed ^ ((right + round + index) & 0xff)) & 0xff;
  }

  return next;
}

function xorRotateRound(state: Uint8Array, round: number): Uint8Array {
  const next = new Uint8Array(state.length);

  for (let index = 0; index < state.length; index += 1) {
    const previous = state[(index + state.length - 1) % state.length];
    const current = state[index];
    const nextByte = state[(index + 1) % state.length];
    next[index] = rotateLeftByte((current ^ previous ^ ((nextByte + round * 11 + index) & 0xff)) & 0xff, (round % 7) + 1);
  }

  return next;
}

function mixingHashRound(state: Uint8Array, round: number): Uint8Array {
  const next = new Uint8Array(state.length);
  let carry = (0x9e + round * 0x37) & 0xff;

  for (let index = 0; index < state.length; index += 1) {
    carry = (carry + state[index] + index * 13) & 0xff;
    next[index] = rotateLeftByte((state[index] ^ carry ^ state[(index + 3) % state.length]) & 0xff, (index + round) % 8);
  }

  return next;
}

function runRound(state: Uint8Array, round: number, algorithm: AvalancheAlgorithm): Uint8Array {
  if (algorithm === "xor-rotate") return xorRotateRound(state, round);
  if (algorithm === "mixing-hash") return mixingHashRound(state, round);
  return toyFeistelRound(state, round);
}

export function compareBits(originalBits: string, changedBits: string): number[] {
  const changed: number[] = [];
  const length = Math.min(originalBits.length, changedBits.length);

  for (let index = 0; index < length; index += 1) {
    if (originalBits[index] !== changedBits[index]) changed.push(index);
  }

  return changed;
}

export function calculatePercentageDifference(changedBits: number, totalBits: number): number {
  if (totalBits <= 0) return 0;
  return Number(((changedBits / totalBits) * 100).toFixed(2));
}

export function buildAvalancheResult(input: AvalancheInput): AvalancheResult {
  const rounds = clamp(input.rounds ?? DEFAULT_ROUNDS, MIN_ROUNDS, MAX_ROUNDS);
  const originalMessageBits = bytesToBits(textToBytes(input.message));
  const safeBitIndex = clamp(input.flippedBitIndex, 0, originalMessageBits.length - 1);
  const changedMessageBits = flipBit(originalMessageBits, safeBitIndex);

  let originalState = bitsToBytes(originalMessageBits);
  let changedState = bitsToBytes(changedMessageBits);
  const roundRows: AvalancheRound[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    originalState = runRound(originalState, round, input.algorithm);
    changedState = runRound(changedState, round, input.algorithm);

    const originalBits = bytesToBits(originalState);
    const changedBits = bytesToBits(changedState);
    const changedBitIndexes = compareBits(originalBits, changedBits);
    const changedBitCount = changedBitIndexes.length;

    roundRows.push({
      round,
      originalHex: bytesToHex(originalState),
      changedHex: bytesToHex(changedState),
      originalBits,
      changedBits,
      changedBitIndexes,
      changedBitCount,
      totalBits: OUTPUT_BITS,
      percentageDifference: calculatePercentageDifference(changedBitCount, OUTPUT_BITS),
    });
  }

  const final = roundRows[roundRows.length - 1];
  const percentages = roundRows.map((row) => row.percentageDifference);

  return {
    input: {
      ...input,
      rounds,
      flippedBitIndex: safeBitIndex,
    },
    flippedBitIndex: safeBitIndex,
    originalMessageBits,
    changedMessageBits,
    rounds: roundRows,
    finalChangedBitCount: final.changedBitCount,
    finalPercentageDifference: final.percentageDifference,
    averagePercentageDifference: Number(
      (percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2),
    ),
    maxChangedBitCount: Math.max(...roundRows.map((row) => row.changedBitCount)),
    heatmap: roundRows.map((row) =>
      Array.from({ length: OUTPUT_BITS }, (_, bitIndex) => (row.changedBitIndexes.includes(bitIndex) ? 1 : 0)),
    ),
  };
}

export function getAvalancheAlgorithmLabel(algorithm: AvalancheAlgorithm): string {
  if (algorithm === "xor-rotate") return "XOR + Rotate";
  if (algorithm === "mixing-hash") return "Mixing Hash";
  return "Toy Feistel";
}

export function buildAvalancheManualChecklist(): string[] {
  return [
    "Open the Avalanche Effect Visualizer page.",
    "Change the message and confirm the round table updates.",
    "Move the flipped-bit slider and confirm the bit comparison updates.",
    "Switch algorithms and confirm statistics change.",
    "Confirm heatmap cells highlight changed bits by round.",
    "Confirm final percentage difference and average difference are visible.",
    "Resize to desktop, tablet, and mobile widths.",
    "Run the focused avalanche effect unit tests.",
  ];
}
