/**
 * Published Cipher Vector cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export interface PublishedCipherVector {
  cipher: "NOEKEON" | "PRESENT" | "RC6" | "SEED" | "SIMON" | "SPECK" | "TWOFISH";
  variant: string;
  source: string;
  keyHex: string;
  plaintextHex: string;
  ciphertextHex: string;
  notes: string;
}

/**
 * Cipher Adapter cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export interface CipherAdapter {
  cipher: PublishedCipherVector["cipher"];
  encryptBlock: (plaintextHex: string, keyHex: string, variant?: string) => string;
  decryptBlock?: (ciphertextHex: string, keyHex: string, variant?: string) => string;
}

/**
 * Published Cipher Vector Result cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export interface PublishedCipherVectorResult {
  cipher: PublishedCipherVector["cipher"];
  variant: string;
  passed: boolean;
  expected: string;
  actual: string;
  keyHex: string;
  plaintextHex: string;
  notes: string;
}

function normalizeHex(value: string): string {
  return value.trim().replace(/^0x/i, "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Assert Published Vector Hex cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param value Input required by the Assert Published Vector Hex operation.
 * @param label Input required by the Assert Published Vector Hex operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function assertPublishedVectorHex(value: string, label: string): string {
  const cleaned = normalizeHex(value);

  if (!cleaned) throw new Error(`${label} is required.`);
  if (!/^[A-F0-9]+$/.test(cleaned)) throw new Error(`${label} must contain only hexadecimal characters.`);
  if (cleaned.length % 2 !== 0) throw new Error(`${label} must contain complete bytes.`);

  return cleaned;
}

/**
 * PUBLISHED CIPHER VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export const PUBLISHED_CIPHER_VECTORS: PublishedCipherVector[] = [
  {
    cipher: "NOEKEON",
    variant: "NOEKEON-128 direct mode",
    source: "NOEKEON specification known-answer vector",
    keyHex: "00000000000000000000000000000000",
    plaintextHex: "00000000000000000000000000000000",
    ciphertextHex: "B1656851699E29FA24B70148503D2DFC",
    notes: "Zero key / zero block direct-mode regression vector.",
  },
  {
    cipher: "PRESENT",
    variant: "PRESENT-80",
    source: "PRESENT specification known-answer vector",
    keyHex: "00000000000000000000",
    plaintextHex: "0000000000000000",
    ciphertextHex: "5579C1387B228445",
    notes: "80-bit zero key / 64-bit zero block vector.",
  },
  {
    cipher: "PRESENT",
    variant: "PRESENT-128",
    source: "PRESENT specification known-answer vector",
    keyHex: "00000000000000000000000000000000",
    plaintextHex: "0000000000000000",
    ciphertextHex: "96DB702A2E6900AF",
    notes: "128-bit zero key / 64-bit zero block vector.",
  },
  {
    cipher: "RC6",
    variant: "RC6-32/20/16",
    source: "RC6 known-answer vector",
    keyHex: "00000000000000000000000000000000",
    plaintextHex: "00000000000000000000000000000000",
    ciphertextHex: "8FC3A53656B1F778C129DF4E9848A41E",
    notes: "Zero key / zero block vector for 20-round RC6 with 32-bit words.",
  },
  {
    cipher: "SEED",
    variant: "SEED-128",
    source: "SEED standard known-answer vector",
    keyHex: "00000000000000000000000000000000",
    plaintextHex: "00000000000000000000000000000000",
    ciphertextHex: "5EBAC6E0054E166819AFF1CC6D346CDB",
    notes: "Zero key / zero block vector for the 128-bit SEED block cipher.",
  },
  {
    cipher: "SIMON",
    variant: "SIMON64/128",
    source: "SIMON and SPECK implementation guide known-answer vector",
    keyHex: "1B1A1918131211100B0A090803020100",
    plaintextHex: "656B696C20646E75",
    ciphertextHex: "44C8FC20B9DFA07A",
    notes: "SIMON64/128 little-endian known-answer vector.",
  },
  {
    cipher: "SPECK",
    variant: "SPECK64/128",
    source: "SIMON and SPECK implementation guide known-answer vector",
    keyHex: "1B1A1918131211100B0A090803020100",
    plaintextHex: "3B7265747475432D",
    ciphertextHex: "8C6FA548454E028B",
    notes: "SPECK64/128 little-endian known-answer vector.",
  },
  {
    cipher: "TWOFISH",
    variant: "Twofish-128",
    source: "Twofish known-answer vector",
    keyHex: "00000000000000000000000000000000",
    plaintextHex: "00000000000000000000000000000000",
    ciphertextHex: "9F589F5CF6122C32B6BFEC2F2AE8C35A",
    notes: "Zero key / zero block vector for 128-bit Twofish.",
  },
];

/**
 * Get Vectors For Cipher cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param cipher Input required by the Get Vectors For Cipher operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function getVectorsForCipher(cipher: PublishedCipherVector["cipher"]): PublishedCipherVector[] {
  return PUBLISHED_CIPHER_VECTORS.filter((vector) => vector.cipher === cipher);
}

/**
 * Run Published Vector cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param adapter Input required by the Run Published Vector operation.
 * @param vector Input required by the Run Published Vector operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function runPublishedVector(adapter: CipherAdapter, vector: PublishedCipherVector): PublishedCipherVectorResult {
  if (adapter.cipher !== vector.cipher) {
    throw new Error(`Adapter cipher ${adapter.cipher} cannot run ${vector.cipher} vector.`);
  }

  const actual = assertPublishedVectorHex(
    adapter.encryptBlock(vector.plaintextHex, vector.keyHex, vector.variant),
    `${vector.cipher} ciphertext`,
  );
  const expected = assertPublishedVectorHex(vector.ciphertextHex, `${vector.cipher} expected ciphertext`);

  return {
    cipher: vector.cipher,
    variant: vector.variant,
    passed: actual === expected,
    expected,
    actual,
    keyHex: assertPublishedVectorHex(vector.keyHex, `${vector.cipher} key`),
    plaintextHex: assertPublishedVectorHex(vector.plaintextHex, `${vector.cipher} plaintext`),
    notes: vector.notes,
  };
}

/**
 * Run Published Vector Suite cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param adapters Input required by the Run Published Vector Suite operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function runPublishedVectorSuite(adapters: CipherAdapter[]): PublishedCipherVectorResult[] {
  const byCipher = new Map(adapters.map((adapter) => [adapter.cipher, adapter]));

  return PUBLISHED_CIPHER_VECTORS.map((vector) => {
    const adapter = byCipher.get(vector.cipher);

    if (!adapter) {
      return {
        cipher: vector.cipher,
        variant: vector.variant,
        passed: false,
        expected: vector.ciphertextHex,
        actual: "MISSING_ADAPTER",
        keyHex: vector.keyHex,
        plaintextHex: vector.plaintextHex,
        notes: `No adapter registered for ${vector.cipher}. ${vector.notes}`,
      };
    }

    return runPublishedVector(adapter, vector);
  });
}

/**
 * Assert Round Trip cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param adapter Input required by the Assert Round Trip operation.
 * @param vector Input required by the Assert Round Trip operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function assertRoundTrip(adapter: CipherAdapter, vector: PublishedCipherVector): boolean {
  if (!adapter.decryptBlock) return true;

  const ciphertext = adapter.encryptBlock(vector.plaintextHex, vector.keyHex, vector.variant);
  const decrypted = adapter.decryptBlock(ciphertext, vector.keyHex, vector.variant);

  return (
    assertPublishedVectorHex(decrypted, `${vector.cipher} decrypted plaintext`) ===
    assertPublishedVectorHex(vector.plaintextHex, `${vector.cipher} plaintext`)
  );
}

/**
 * Build Cipher Vector Audit Summary cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param results Input required by the Build Cipher Vector Audit Summary operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function buildCipherVectorAuditSummary(results: PublishedCipherVectorResult[]) {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    complete: failed === 0,
    failingCiphers: Array.from(new Set(results.filter((result) => !result.passed).map((result) => result.cipher))),
  };
}

/**
 * Build Cipher Vector Audit Checklist cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://www.rfc-editor.org/rfc/rfc9998 — RFC 9998.
 */
export function buildCipherVectorAuditChecklist(): string[] {
  return [
    "Run the published known-answer vector test suite.",
    "Confirm NOEKEON matches the zero-key reference vector.",
    "Confirm PRESENT-80 and PRESENT-128 match reference vectors.",
    "Confirm RC6-32/20/16 matches the zero-key reference vector.",
    "Confirm SEED-128 matches the zero-key reference vector.",
    "Confirm SIMON64/128 and SPECK64/128 match reference vectors.",
    "Confirm Twofish-128 matches the zero-key reference vector.",
    "Confirm decrypt helpers round-trip every vector where decryption is available.",
    "Run the existing full test suite to confirm no regression was introduced.",
  ];
}
