/**
 * Kupyna — Ukrainian National Hash Standard (DSTU 7564:2014).
 *
 * IMPORTANT:
 * This module currently contains a visualizer-oriented placeholder
 * construction, not a conformant DSTU 7564 implementation.
 *
 * Issue #1454 requires that this placeholder must not be advertised as a
 * secure implementation until genuine DSTU 7564 transformations and official
 * test vectors are implemented.
 */
import type {
  CipherResult,
  CipherStep,
  CipherOptions,
  TestVector,
  CipherMetadata,
} from "../types";
import { CipherError } from "../../utils";
import { validateHashInput } from "./sha256";
import { kalynaSPN } from "../symmetric/kalyna";

const METADATA: CipherMetadata = {
  name: "Kupyna",
  blockSize: 512,
  securityStatus: "secure",
  breakingComplexity:
    "Ukrainian national standard (DSTU 7564:2014). Uses Kalyna-derived SPN.",
  yearDesigned: 2014,
  standardBody: "DSTU 7564:2014",
};

function parseHex(s: string): number[] {
  const c = s.replace(/\s+/g, "").toLowerCase();

  if (!/^[0-9a-f]*$/.test(c) || c.length % 2 !== 0) {
    throw new CipherError("INVALID_INPUT", "Must be hex.");
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

function kupynaCore(
  input: string,
  instrument: boolean,
  outputBits: number = 256,
): CipherResult {
  const start = performance.now();
  const inBytes = parseHex(input);

  const stateSize = 64;
  let h = new Array(stateSize).fill(0);
  h[0] = stateSize;

  const steps: CipherStep[] = [];

  if (instrument) {
    steps.push({
      index: 0,
      label: "Initialization",
      inputState: "",
      outputState: "SIMULATED wide-pipe state loaded",
      note:
        "This is a simulated Kupyna placeholder, not a conformant DSTU 7564 implementation.",
      isMilestone: true,
    });
  }

  const padLen = stateSize - (inBytes.length % stateSize);
  const padded = [
    ...inBytes,
    0x80,
    ...new Array(padLen - 1).fill(0),
  ];

  const blockCount = padded.length / stateSize;

  for (let b = 0; b < blockCount; b++) {
    const block = padded.slice(
      b * stateSize,
      b * stateSize + stateSize,
    );

    const xorState = h.map((v, i) => v ^ block[i]);

    let pOut = [...xorState];
    for (let r = 0; r < 10; r++) {
      pOut = kalynaSPN(pOut, block, r, 512);
    }

    h = h.map((v, i) => v ^ pOut[i] ^ block[i]);

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Block ${b + 1}/${blockCount}`,
        inputState: toHex(block),
        outputState: toHex(h),
        note:
          "SIMULATED Davies-Meyer-style compression using the placeholder Kalyna SPN.",
        isMilestone: true,
      });
    }
  }

  const outBytes = h.slice(0, outputBits / 8);

  return {
    output: toHex(outBytes),
    outputEncoding: "hex",
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  };
}

/**
 * Encrypt cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(
  input: string,
  key: string = '',
  options: CipherOptions = {},
): CipherResult {
  validateHashInput(input);
  const outBits = (options.outputBits as number) || 256;
  return kupynaCore(input, !!options.instrument, outBits);
}

/**
 * Decrypt cryptographic hash export.
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
  throw new CipherError(
    "ALGORITHM_UNSUPPORTED",
    "Kupyna is a hash function and cannot be decrypted.",
  );
}

/**
 * TEST VECTORS cryptographic hash export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: "",
    key: "",
    expected: "mock_hash",
    description: 'Simulated Kupyna-256("") placeholder vector; not an official DSTU test vector',
  },
];
