import { KnownAnswerTestVector } from "../types";

export const shaTestVectors: KnownAnswerTestVector[] = [
  {
    id: "sha256-abc",
    algorithm: "SHA-256",
    standard: "FIPS 180-4 Section 8.2",
    description: "SHA-256 standard NIST string test vector",
    plaintextHex: "616263", // "abc"
    keyHex: "",
    ciphertextHex: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    edgeCase: "NONE",
  },
  {
    id: "sha256-empty",
    algorithm: "SHA-256",
    standard: "FIPS 180-4 / Boundary",
    description: "SHA-256 zero-length empty string input",
    plaintextHex: "",
    keyHex: "",
    ciphertextHex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    edgeCase: "EMPTY_INPUT",
  },
  {
    id: "sha3-256-standard",
    algorithm: "SHA3-256",
    standard: "FIPS 202 Section 11",
    description: "Keccak / SHA3-256 standard vector",
    plaintextHex: "616263", // "abc"
    keyHex: "",
    ciphertextHex: "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532",
    edgeCase: "NONE",
  },
];