import { KnownAnswerTestVector } from "../types";

export const hmacTestVectors: KnownAnswerTestVector[] = [
  {
    id: "hmac-sha256-rfc4231-tc1",
    algorithm: "HMAC-SHA256",
    standard: "RFC 4231 Test Case 1",
    description: "Standard HMAC-SHA256 test with 20-byte key",
    plaintextHex: "4861205468657265", // "Hi There"
    keyHex: "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
    ciphertextHex: "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
    edgeCase: "NONE",
  },
  {
    id: "hmac-sha256-rfc4231-tc6",
    algorithm: "HMAC-SHA256",
    standard: "RFC 4231 Test Case 6",
    description: "HMAC-SHA256 key larger than block size (131 bytes)",
    plaintextHex: "54657374205573696e67204c6172676572205468616e20426c6f636b2d53697a65204b65792d2048617368204b65792d4669727374",
    keyHex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ciphertextHex: "9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2",
    edgeCase: "BOUNDARY_KEY",
  },
];