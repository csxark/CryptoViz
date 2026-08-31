import { KnownAnswerTestVector } from "@/tests/vectors/types";
import { aesTestVectors } from "@/tests/vectors/aes";
import { desTestVectors } from "@/tests/vectors/des";
import { shaTestVectors } from "@/tests/vectors/sha";
import { hmacTestVectors } from "@/tests/vectors/hmac";
import { eccTestVectors, pqcTestVectors  } from "@/tests/vectors/ecc";
// import { pqcTestVectors } from "@/tests/vectors/pqc";

export interface TestVector {
  algorithm: string;
  plaintext: string;
  key: string;
  ciphertext: string;
  standard?: string;
  description?: string;
}

/**
 * Combined global known answer test vector dataset.
 */
export const allKnownAnswerVectors: KnownAnswerTestVector[] = [
  ...aesTestVectors,
  ...desTestVectors,
  ...shaTestVectors,
  ...hmacTestVectors,
  ...eccTestVectors,
  ...pqcTestVectors,
];

/**
 * UI legacy format compatibility mapper.
 */
export const sampleVectors: TestVector[] = allKnownAnswerVectors.map((v) => ({
  algorithm: v.algorithm,
  plaintext: v.plaintextHex,
  key: v.keyHex,
  ciphertext: v.ciphertextHex,
  standard: v.standard,
  description: v.description,
}));