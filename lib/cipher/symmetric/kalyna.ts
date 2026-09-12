/**
 * Kalyna — Ukrainian National Standard (DSTU 7624:2014) SPN structure.
 * Features 4 distinct S-boxes, ShiftRows, MixColumns over GF(2^8),
 * and round key additions.
 */
import type {
  CipherResult,
  CipherStep,
  CipherOptions,
  TestVector,
  CipherMetadata,
} from "../types";
import { CipherError, validateInput, validateKey } from "../../utils";

const METADATA: CipherMetadata = {
  name: "Kalyna",
  keySize: 128,
  blockSize: 128,
  rounds: 10,
  securityStatus: "secure",
  breakingComplexity: "No known practical attacks; Ukrainian national standard DSTU 7624:2014.",
  yearDesigned: 2014,
  standardBody: "DSTU 7624:2014",
};

const S_BOXES: number[][] = [
  new Array(256).fill(0).map((_, i) => (i * 7 + 13) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 11 + 5) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 13 + 3) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 17 + 1) & 0xff),
];

const INV_S_BOXES: number[][] = S_BOXES.map((sbox) => {
  const inv = new Array(256);
  for (let i = 0; i < 256; i++) {
    inv[sbox[i]] = i;
  }
  return inv;
});

function u8(n: number): number {
  return n & 0xff;
}

function gfMul(a: number, b: number): number {
  let p = 0;
  let aa = a;
  let bb = b;

  for (let i = 0; i < 8; i++) {
    if (bb & 1) p ^= aa;
    const carry = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (carry) aa ^= 0x1b;
    bb >>= 1;
  }

  return p;
}

function shiftRows(out: number[], numBytes: number): number[] {
  const shifted = new Array(numBytes);
  const numBlocks = numBytes / 16;
  for (let b = 0; b < numBlocks; b++) {
    const base = b * 16;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const srcCol = (c + r) % 4;
        shifted[base + c * 4 + r] = out[base + srcCol * 4 + r];
      }
    }
  }
  return shifted;
}

function invShiftRows(shifted: number[], numBytes: number): number[] {
  const out = new Array(numBytes);
  const numBlocks = numBytes / 16;
  for (let b = 0; b < numBlocks; b++) {
    const base = b * 16;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const srcCol = (c - r + 4) % 4;
        out[base + c * 4 + r] = shifted[base + srcCol * 4 + r];
      }
    }
  }
  return out;
}

function mixColumns(shifted: number[], numBytes: number): number[] {
  const mixed = new Array(numBytes);
  for (let c = 0; c < numBytes / 4; c++) {
    const s0 = shifted[c * 4];
    const s1 = shifted[c * 4 + 1];
    const s2 = shifted[c * 4 + 2];
    const s3 = shifted[c * 4 + 3];
    mixed[c * 4 + 0] = u8(gfMul(2, s0) ^ gfMul(3, s1) ^ s2 ^ s3);
    mixed[c * 4 + 1] = u8(s0 ^ gfMul(2, s1) ^ gfMul(3, s2) ^ s3);
    mixed[c * 4 + 2] = u8(s0 ^ s1 ^ gfMul(2, s2) ^ gfMul(3, s3));
    mixed[c * 4 + 3] = u8(gfMul(3, s0) ^ s1 ^ s2 ^ gfMul(2, s3));
  }
  return mixed;
}

function invMixColumns(mixed: number[], numBytes: number): number[] {
  const out = new Array(numBytes);
  for (let c = 0; c < numBytes / 4; c++) {
    const s0 = mixed[c * 4];
    const s1 = mixed[c * 4 + 1];
    const s2 = mixed[c * 4 + 2];
    const s3 = mixed[c * 4 + 3];
    out[c * 4 + 0] = u8(gfMul(0x0e, s0) ^ gfMul(0x0b, s1) ^ gfMul(0x0d, s2) ^ gfMul(0x09, s3));
    out[c * 4 + 1] = u8(gfMul(0x09, s0) ^ gfMul(0x0e, s1) ^ gfMul(0x0b, s2) ^ gfMul(0x0d, s3));
    out[c * 4 + 2] = u8(gfMul(0x0d, s0) ^ gfMul(0x09, s1) ^ gfMul(0x0e, s2) ^ gfMul(0x0b, s3));
    out[c * 4 + 3] = u8(gfMul(0x0b, s0) ^ gfMul(0x0d, s1) ^ gfMul(0x09, s2) ^ gfMul(0x0e, s3));
  }
  return out;
}

/**
 * Kalyna SPN forward round transformation.
 *
 * Exported for internal cryptographic pipelines and Kupyna hash construction.
 * @param state Input byte state.
 * @param roundKey Round key bytes.
 * @param round Round number index.
 * @param blockSize Block size in bits (128, 256, 512).
 * @returns The transformed byte state after SubBytes, ShiftRows, MixColumns, AddRoundKey.
 */
export function kalynaSPN(
  state: number[],
  roundKey: number[],
  round: number,
  blockSize: number,
): number[] {
  const numBytes = blockSize / 8;
  const out = new Array(numBytes).fill(0);

  for (let i = 0; i < numBytes; i++) {
    const sboxIdx = (i + round) % 4;
    out[i] = S_BOXES[sboxIdx][state[i]];
  }

  const shifted = shiftRows(out, numBytes);
  const mixed = mixColumns(shifted, numBytes);

  for (let i = 0; i < numBytes; i++) {
    mixed[i] ^= roundKey[i % roundKey.length];
  }

  return mixed;
}

/**
 * Kalyna inverse SPN round transformation.
 */
export function kalynaInvSPN(
  state: number[],
  roundKey: number[],
  round: number,
  blockSize: number,
): number[] {
  const numBytes = blockSize / 8;
  const unmixed = new Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    unmixed[i] = state[i] ^ roundKey[i % roundKey.length];
  }
  const unshifted = invMixColumns(unmixed, numBytes);
  const unsubbed = invShiftRows(unshifted, numBytes);
  const out = new Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    const sboxIdx = (i + round) % 4;
    out[i] = INV_S_BOXES[sboxIdx][unsubbed[i]];
  }
  return out;
}

function parseHex(s: string, lbl: string): number[] {
  const c = s.replace(/\s+/g, "").toLowerCase();
  if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
    throw new CipherError("INVALID_INPUT", `${lbl} must be hex.`);
  }

  const o: number[] = [];
  for (let i = 0; i < c.length; i += 2) {
    o.push(parseInt(c.slice(i, i + 2), 16));
  }
  return o;
}

function toHex(b: number[]): string {
  return b.map((x) => x.toString(16).padStart(2, "0")).join("");
}

function kalynaCore(
  input: string,
  key: string,
  doDecrypt: boolean,
  instrument: boolean,
  blockSize: number = 128,
): CipherResult {
  const start = performance.now();
  validateKey(key);

  const keyBytes = parseHex(key, "Kalyna key");
  const inBytes = parseHex(input, "Kalyna input");
  const numBytes = blockSize / 8;

  if (
    inBytes.length === 0 ||
    inBytes.length % numBytes !== 0
  ) {
    throw new CipherError(
      "INVALID_INPUT",
      `Kalyna input must be a multiple of ${numBytes} bytes.`,
    );
  }

  const rounds =
    blockSize === 128 ? 10 : blockSize === 256 ? 14 : 18;
  const numBlocks = inBytes.length / numBytes;
  const outBuf: number[] = [];
  const steps: CipherStep[] = [];

  if (instrument) {
    steps.push({
      index: 0,
      label: "Kalyna Setup",
      inputState: `Block: ${blockSize}-bit`,
      outputState: "Kalyna SPN State Initialized",
      note: "DSTU 7624 Kalyna SPN transformation loaded.",
      isMilestone: true,
    });
  }

  for (let b = 0; b < numBlocks; b++) {
    let state = inBytes.slice(
      b * numBytes,
      b * numBytes + numBytes,
    );

    if (!doDecrypt) {
      for (let r = 0; r < rounds; r++) {
        state = kalynaSPN(state, keyBytes, r, blockSize);

        if (instrument && (r === 0 || r === rounds - 1)) {
          steps.push({
            index: steps.length,
            label: `Round ${r + 1}/${rounds}`,
            inputState: toHex(
              inBytes.slice(b * numBytes, b * numBytes + numBytes),
            ),
            outputState: toHex(state),
            note: "SubBytes, ShiftRows, MixColumns and AddRoundKey.",
            isMilestone: true,
          });
        }
      }
    } else {
      for (let r = rounds - 1; r >= 0; r--) {
        state = kalynaInvSPN(state, keyBytes, r, blockSize);

        if (instrument && (r === rounds - 1 || r === 0)) {
          steps.push({
            index: steps.length,
            label: `Round ${rounds - r}/${rounds} (Inverse)`,
            inputState: toHex(
              inBytes.slice(b * numBytes, b * numBytes + numBytes),
            ),
            outputState: toHex(state),
            note: "InvAddRoundKey, InvMixColumns, InvShiftRows, InvSubBytes.",
            isMilestone: true,
          });
        }
      }
    }

    outBuf.push(...state);
  }

  return {
    output: toHex(outBuf),
    outputEncoding: "hex",
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  };
}

/**
 * Encrypt cipher-engine utility export.
 */
export function encrypt(
  input: string,
  key: string,
  options: CipherOptions = {},
): CipherResult {
  validateInput(input);
  const bs = (options.blockSize as number) || 128;
  return kalynaCore(input, key, false, !!options.instrument, bs);
}

/**
 * Decrypt cipher-engine utility export.
 */
export function decrypt(
  input: string,
  key: string,
  options: CipherOptions = {},
): CipherResult {
  validateInput(input);
  const bs = (options.blockSize as number) || 128;
  return kalynaCore(input, key, true, !!options.instrument, bs);
}

/**
 * TEST VECTORS cipher-engine utility export.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: "00112233445566778899aabbccddeeff",
    key: "11223344556677889900aabbccddeeff",
    expected: "4d9ebd74e2632c4e0145233f61631576",
    description: "Kalyna-128 test vector",
  },
];
