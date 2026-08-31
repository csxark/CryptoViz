export interface KnownAnswerTestVector {
  id: string;
  algorithm: string;
  standard: string; // e.g. "NIST SP 800-38A", "RFC 2202", "FIPS 180-4"
  description: string;
  plaintextHex: string;
  keyHex: string;
  ciphertextHex: string;
  ivHex?: string;
  aadHex?: string;
  tagHex?: string;
  edgeCase?: "EMPTY_INPUT" | "MULTI_BLOCK" | "BOUNDARY_KEY" | "INVALID_PARAM" | "NONE";
  notes?: string;
}

export interface VectorSuite {
  category: "aes" | "des" | "sha" | "hmac" | "ecc" | "pqc";
  vectors: KnownAnswerTestVector[];
}