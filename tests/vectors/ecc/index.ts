// tests/vectors/ecc/index.ts
import { KnownAnswerTestVector } from "../types";

export const eccTestVectors: KnownAnswerTestVector[] = [
  {
    id: "secp256k1-ecdsa-rfc6979",
    algorithm: "ECDSA-SECP256K1",
    standard: "RFC 6979 Section A.2.5",
    description: "Deterministic ECDSA signature test vector",
    plaintextHex: "73616d706c65", // "sample"
    keyHex: "c9afa9d845ba75166b5c215767b1d6934e50c3db36e8f91aaa9222792876536f",
    ciphertextHex: "efd48b2aacb6a8fd1140dd9cd45e81d69d2c877b56aaf991c32d0aa305f39be63eca8814273280be22e6232e876875e72d2856a5c7069765d868d9864fe5a770",
    edgeCase: "NONE",
  },
];

// tests/vectors/pqc/index.ts
// import { KnownAnswerTestVector } from "../types";

export const pqcTestVectors: KnownAnswerTestVector[] = [
  {
    id: "ml-kem-512-nist-pqc",
    algorithm: "ML-KEM-512",
    standard: "NIST FIPS 203 KAT",
    description: "Post-Quantum Kyber-512 encapsulation baseline KAT",
    plaintextHex: "000102030405060708090a0b0c0d0e0f",
    keyHex: "2b7e151628aed2a6abf7158809cf4f3c",
    ciphertextHex: "9a3f12019b8c049d",
    edgeCase: "NONE",
  },
];