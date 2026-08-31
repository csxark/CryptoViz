import { KnownAnswerTestVector } from "../types";

export const desTestVectors: KnownAnswerTestVector[] = [
  {
    id: "des-ecb-fips46-3",
    algorithm: "DES-ECB",
    standard: "FIPS 46-3 Known Answer Test",
    description: "Standard Single DES KAT vector",
    plaintextHex: "0123456789abcdef",
    keyHex: "133457799bbcdff1",
    ciphertextHex: "85e813540f0ab405",
    edgeCase: "NONE",
  },
  {
    id: "tdes-3key-ecb",
    algorithm: "3DES-ECB",
    standard: "NIST SP 800-67",
    description: "Triple-DES (TDEA) 3-Key Option 1 KAT",
    plaintextHex: "6bc1bee22e409f96",
    keyHex: "0123456789abcdef23456789abcdef01456789abcdef0123",
    ciphertextHex: "7147102081f9a263",
    edgeCase: "BOUNDARY_KEY",
  },
];