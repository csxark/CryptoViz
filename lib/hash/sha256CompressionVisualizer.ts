export interface Sha256CompressionInput {
  message: string;
}

export interface Sha256Word {
  index: number;
  value: string;
  formula: string;
  note: string;
}

export interface Sha256RoundState {
  round: number;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  g: string;
  h: string;
  w: string;
  k: string;
  ch: string;
  maj: string;
  sigma0: string;
  sigma1: string;
  temp1: string;
  temp2: string;
  note: string;
}

export interface Sha256CompressionResult {
  input: string;
  paddedBlockHex: string;
  messageSchedule: Sha256Word[];
  rounds: Sha256RoundState[];
  initialHash: string[];
  compressedHash: string[];
  digest: string;
}

export const DEFAULT_SHA256_COMPRESSION_INPUT: Sha256CompressionInput = {
  message: "abc",
};

const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
];

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(value: number, bits: number) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

function shr(value: number, bits: number) {
  return value >>> bits;
}

function add32(...values: number[]) {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

function ch(x: number, y: number, z: number) {
  return ((x & y) ^ (~x & z)) >>> 0;
}

function maj(x: number, y: number, z: number) {
  return ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
}

function bigSigma0(x: number) {
  return (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
}

function bigSigma1(x: number) {
  return (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
}

function smallSigma0(x: number) {
  return (rotr(x, 7) ^ rotr(x, 18) ^ shr(x, 3)) >>> 0;
}

function smallSigma1(x: number) {
  return (rotr(x, 17) ^ rotr(x, 19) ^ shr(x, 10)) >>> 0;
}

function toHex32(value: number) {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function bytesToHex(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateSha256CompressionInput(message: string): string {
  if (message === undefined || message === null || message.length === 0) {
    throw new Error("Message is required for the SHA-256 compression demo.");
  }

  const bytes = new TextEncoder().encode(message);
  if (bytes.length > 55) {
    throw new Error(
      "This single-block visualizer supports messages up to 55 UTF-8 bytes.",
    );
  }

  return message;
}

export function buildSingleSha256Block(message: string): number[] {
  const safe = validateSha256CompressionInput(message);
  const messageBytes = Array.from(new TextEncoder().encode(safe));
  const bitLength = messageBytes.length * 8;
  const block = [...messageBytes, 0x80];

  while (block.length % 64 !== 56) {
    block.push(0);
  }

  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  block.push(
    (high >>> 24) & 0xff,
    (high >>> 16) & 0xff,
    (high >>> 8) & 0xff,
    high & 0xff,
  );
  block.push(
    (low >>> 24) & 0xff,
    (low >>> 16) & 0xff,
    (low >>> 8) & 0xff,
    low & 0xff,
  );

  return block;
}

function readWord(block: number[], offset: number) {
  return (
    ((block[offset] << 24) |
      (block[offset + 1] << 16) |
      (block[offset + 2] << 8) |
      block[offset + 3]) >>>
    0
  );
}

export function buildSha256MessageSchedule(message: string): Sha256Word[] {
  const block = buildSingleSha256Block(message);
  const words: number[] = [];
  const schedule: Sha256Word[] = [];

  for (let index = 0; index < 16; index += 1) {
    const word = readWord(block, index * 4);
    words.push(word);
    schedule.push({
      index,
      value: toHex32(word),
      formula: `W[${index}] = block word ${index}`,
      note: "The first sixteen schedule words come directly from the padded 512-bit message block.",
    });
  }

  for (let index = 16; index < 64; index += 1) {
    const value = add32(
      smallSigma1(words[index - 2]),
      words[index - 7],
      smallSigma0(words[index - 15]),
      words[index - 16],
    );
    words.push(value);
    schedule.push({
      index,
      value: toHex32(value),
      formula: `W[${index}] = σ1(W[${index - 2}]) + W[${index - 7}] + σ0(W[${index - 15}]) + W[${index - 16}]`,
      note: "Expanded words mix earlier schedule words using rotations, shifts, and 32-bit modular addition.",
    });
  }

  return schedule;
}

export function runSha256CompressionVisualization(
  message: string,
): Sha256CompressionResult {
  const safe = validateSha256CompressionInput(message);
  const block = buildSingleSha256Block(safe);
  const schedule = buildSha256MessageSchedule(safe);
  const w = schedule.map((word) => Number.parseInt(word.value, 16));

  let [a, b, c, d, e, f, g, h] = INITIAL_HASH;
  const rounds: Sha256RoundState[] = [];

  for (let round = 0; round < 64; round += 1) {
    const s1 = bigSigma1(e);
    const choice = ch(e, f, g);
    const temp1 = add32(h, s1, choice, K[round], w[round]);
    const s0 = bigSigma0(a);
    const majority = maj(a, b, c);
    const temp2 = add32(s0, majority);

    h = g;
    g = f;
    f = e;
    e = add32(d, temp1);
    d = c;
    c = b;
    b = a;
    a = add32(temp1, temp2);

    rounds.push({
      round,
      a: toHex32(a),
      b: toHex32(b),
      c: toHex32(c),
      d: toHex32(d),
      e: toHex32(e),
      f: toHex32(f),
      g: toHex32(g),
      h: toHex32(h),
      w: toHex32(w[round]),
      k: toHex32(K[round]),
      ch: toHex32(choice),
      maj: toHex32(majority),
      sigma0: toHex32(s0),
      sigma1: toHex32(s1),
      temp1: toHex32(temp1),
      temp2: toHex32(temp2),
      note: "This round computes T1 from h, Σ1(e), Ch(e,f,g), K[t], and W[t], then computes T2 from Σ0(a) and Maj(a,b,c).",
    });
  }

  const compressed = [
    add32(INITIAL_HASH[0], a),
    add32(INITIAL_HASH[1], b),
    add32(INITIAL_HASH[2], c),
    add32(INITIAL_HASH[3], d),
    add32(INITIAL_HASH[4], e),
    add32(INITIAL_HASH[5], f),
    add32(INITIAL_HASH[6], g),
    add32(INITIAL_HASH[7], h),
  ].map(toHex32);

  return {
    input: safe,
    paddedBlockHex: bytesToHex(block),
    messageSchedule: schedule,
    rounds,
    initialHash: INITIAL_HASH.map(toHex32),
    compressedHash: compressed,
    digest: compressed.join(""),
  };
}

export function getSha256CompressionManualChecklist(): string[] {
  return [
    "Open the SHA-256 Compression Round Visualizer page.",
    "Confirm the default message abc produces the known SHA-256 digest.",
    "Confirm the padded 512-bit block is displayed.",
    "Confirm the message schedule contains 64 words.",
    "Click multiple rounds and confirm a-h, W[t], K[t], T1, and T2 update.",
    "Enter an empty message and confirm a friendly validation error appears.",
    "Enter a message longer than 55 UTF-8 bytes and confirm single-block validation prevents it.",
    "Resize to mobile width and confirm round cards and tables remain usable.",
  ];
}
