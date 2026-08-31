/**
 * Kalyna — Ukrainian National Standard (DSTU 7624:2014).
 *
 * IMPORTANT:
 * This module currently contains a visualizer-oriented placeholder
 * transformation, not a conformant DSTU 7624 implementation.
 *
 * Issue #1454 explicitly requires that the implementation must not advertise
 * this placeholder as a secure implementation. Until genuine DSTU 7624 round
 * transformations and official test vectors are added, the result is marked
 * as simulated/mock and carries an explicit security warning.
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
  securityStatus: "mock",
  securityWarning:
    "Simulated placeholder only. This is not a conformant DSTU 7624:2014 implementation and must not be used for real cryptographic security.",
  breakingComplexity:
    "Not applicable: implementation is simulated and has not passed official DSTU 7624 test vectors.",
  yearDesigned: 2014,
  standardBody: "DSTU 7624:2014",
  provenance: {
    provenance: "simulated",
    source: "CryptoViz placeholder implementation",
  },
};

const S_BOXES: number[][] = [
  new Array(256).fill(0).map((_, i) => (i * 7 + 13) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 11 + 5) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 13 + 3) & 0xff),
  new Array(256).fill(0).map((_, i) => (i * 17 + 1) & 0xff),
];

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

/**
 * Kalyna SPN cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
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

  const shifted = [...out];
  for (let i = 0; i < numBytes; i++) {
    shifted[i] = out[(i + (i % 4)) % numBytes];
  }

  const mixed = new Array(numBytes).fill(0);
  for (let c = 0; c < numBytes / 4; c++) {
    for (let i = 0; i < 4; i++) {
      mixed[c * 4 + i] = u8(
        gfMul(2, shifted[c * 4]) ^
          gfMul(3, shifted[c * 4 + 1]) ^
          shifted[c * 4 + 2] ^
          shifted[c * 4 + 3],
      );
    }
  }

  for (let i = 0; i < numBytes; i++) {
    mixed[i] ^= roundKey[i % roundKey.length];
  }

  return mixed;
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
      outputState: "SIMULATED S-box transformation loaded",
      note:
        "This visualizer path is simulated and is not a conformant DSTU 7624 implementation.",
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

        if (instrument && r % 4 === 0) {
          steps.push({
            index: steps.length,
            label: `Round ${r + 1}/${rounds}`,
            inputState: toHex(
              inBytes.slice(b * numBytes, b * numBytes + numBytes),
            ),
            outputState: toHex(state),
            note:
              "SIMULATED SubBytes, ShiftRows, MixColumns and AddRoundKey.",
            isMilestone: true,
          });
        }
      }
    } else {
      for (let r = rounds - 1; r >= 0; r--) {
        for (let i = 0; i < numBytes; i++) {
          state[i] ^= keyBytes[i % keyBytes.length];
        }
        state = kalynaSPN(state, keyBytes, r, blockSize);
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
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
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
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
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
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: "00000000000000000000000000000000",
    key: "00000000000000000000000000000000",
    expected: "mock_ciphertext",
    description: "Simulated Kalyna-128 placeholder vector; not an official DSTU test vector",
  },
];
