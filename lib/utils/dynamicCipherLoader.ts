import type { CipherDefinition } from "@/lib/cipher/registry";

export type DynamicCipherType = "substitution" | "sbox-block" | "feistel" | "affine";

export interface SBoxConfig {
  substitutionTable: number[]; // e.g. 16-element or 256-element S-Box
  invSubstitutionTable?: number[];
}

export interface FeistelConfig {
  rounds: number;
  subkeys: string[];
}

export interface AffineConfig {
  keyA: number; // Multiplicative key (must be coprime to alphabet size 26)
  keyB: number; // Additive shift key
}

export interface DynamicCipherDefinition extends CipherDefinition {
  cipherType: DynamicCipherType;
  sboxConfig?: SBoxConfig;
  feistelConfig?: FeistelConfig;
  affineConfig?: AffineConfig;
  bundleSizeBytes?: number;
  initializationTimeMs?: number;
  isDynamic: boolean;
  author?: string;
  version?: string;
}

export interface ModuleLoadMetrics {
  cipherId: string;
  cipherName: string;
  status: "unloaded" | "loading" | "instantiated" | "ready" | "error";
  bundleSizeBytes: number;
  initializationTimeMs: number;
  memoryUsageBytes: number;
  loadedAt?: string;
  errorMessage?: string;
}

export const DYNAMIC_CIPHER_STORAGE_KEY = "cryptoviz-dynamic-ciphers";

/**
 * Executes substitution cipher logic using custom S-Box or mapping.
 */
export function encryptCustomSBoxBlock(
  input: string,
  sbox: number[],
): string {
  const bytes = new TextEncoder().encode(input);
  const encryptedBytes = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    const val = bytes[i];
    const sboxIndex = val % sbox.length;
    const substituted = sbox[sboxIndex] ?? val;
    encryptedBytes[i] = (val ^ substituted) & 0xff;
  }

  return Array.from(encryptedBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Executes Affine Cipher E(x) = (a*x + b) mod 26
 */
export function encryptAffine(
  input: string,
  keyA: number,
  keyB: number,
): string {
  const upper = input.toUpperCase();
  let result = "";

  for (let i = 0; i < upper.length; i += 1) {
    const charCode = upper.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      const x = charCode - 65;
      const encryptedCode = ((keyA * x + keyB) % 26) + 65;
      result += String.fromCharCode(encryptedCode);
    } else {
      result += upper[i];
    }
  }

  return result;
}

/**
 * Multiplicative inverse modulo 26 for Affine Cipher decryption
 */
export function modInverse26(a: number): number {
  const cleanA = ((a % 26) + 26) % 26;
  for (let x = 1; x < 26; x += 1) {
    if ((cleanA * x) % 26 === 1) return x;
  }
  return 1;
}

/**
 * Executes Affine Cipher D(x) = a^-1 * (x - b) mod 26
 */
export function decryptAffine(
  input: string,
  keyA: number,
  keyB: number,
): string {
  const upper = input.toUpperCase();
  const aInv = modInverse26(keyA);
  let result = "";

  for (let i = 0; i < upper.length; i += 1) {
    const charCode = upper.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      const y = charCode - 65;
      const decryptedCode = (((aInv * (y - keyB)) % 26) + 26) % 26 + 65;
      result += String.fromCharCode(decryptedCode);
    } else {
      result += upper[i];
    }
  }

  return result;
}

/**
 * Built-in preset dynamic ciphers for educational sandbox exploration.
 */
export const DEFAULT_DYNAMIC_CIPHERS: DynamicCipherDefinition[] = [
  {
    id: "dyn-mini-aes-4x4",
    name: "Custom 4x4 S-Box Mini-AES",
    category: "symmetric",
    cipherType: "sbox-block",
    description:
      "A simplified 4x4 substitution-permutation block cipher demonstrating AES-like S-Box substitution and round mixing.",
    defaultKey: "SECRET4X4",
    defaultInput: "CRYPTOVIZ",
    securityStatus: "legacy",
    isDynamic: true,
    author: "CryptoViz Lab",
    version: "1.0.0",
    bundleSizeBytes: 14336,
    initializationTimeMs: 4.2,
    sboxConfig: {
      substitutionTable: [
        0xe, 0x4, 0xd, 0x1, 0x2, 0xf, 0xb, 0x8, 0x3, 0xa, 0x6, 0xc, 0x5, 0x9,
        0x0, 0x7,
      ],
    },
  },
  {
    id: "dyn-affine-cipher",
    name: "Affine Cipher E(x)=(a·x+b) mod 26",
    category: "classical",
    cipherType: "affine",
    description:
      "A monoalphabetic substitution cipher combining multiplicative key 'a' and additive key 'b'.",
    defaultKey: "5,8",
    defaultInput: "AFFINECIPHER",
    securityStatus: "broken",
    isDynamic: true,
    author: "CryptoViz Lab",
    version: "1.0.0",
    bundleSizeBytes: 8192,
    initializationTimeMs: 1.8,
    affineConfig: {
      keyA: 5,
      keyB: 8,
    },
  },
  {
    id: "dyn-feistel-network",
    name: "Custom Feistel 4-Round Network",
    category: "symmetric",
    cipherType: "feistel",
    description:
      "A symmetric Feistel structure dividing 64-bit blocks into Left and Right halves evaluated over 4 rounds.",
    defaultKey: "FEISTELKEY",
    defaultInput: "FEISTELBLOCK",
    securityStatus: "legacy",
    isDynamic: true,
    author: "CryptoViz Lab",
    version: "1.2.0",
    bundleSizeBytes: 18432,
    initializationTimeMs: 6.5,
    feistelConfig: {
      rounds: 4,
      subkeys: ["K1", "K2", "K3", "K4"],
    },
  },
];

/**
 * Manages runtime dynamic cipher loading and registration.
 */
export class DynamicCipherRegistry {
  private static ciphers: Map<string, DynamicCipherDefinition> = new Map();
  private static metrics: Map<string, ModuleLoadMetrics> = new Map();

  static initializeDefaults() {
    DEFAULT_DYNAMIC_CIPHERS.forEach((cipher) => {
      this.ciphers.set(cipher.id, cipher);
      this.metrics.set(cipher.id, {
        cipherId: cipher.id,
        cipherName: cipher.name,
        status: "ready",
        bundleSizeBytes: cipher.bundleSizeBytes || 10240,
        initializationTimeMs: cipher.initializationTimeMs || 2.5,
        memoryUsageBytes: (cipher.bundleSizeBytes || 10240) * 2,
        loadedAt: new Date().toISOString(),
      });
    });
  }

  static getCiphers(): DynamicCipherDefinition[] {
    if (this.ciphers.size === 0) {
      this.initializeDefaults();
    }
    return Array.from(this.ciphers.values());
  }

  static getMetrics(): ModuleLoadMetrics[] {
    if (this.metrics.size === 0) {
      this.initializeDefaults();
    }
    return Array.from(this.metrics.values());
  }

  static async loadCipherDynamically(
    cipherId: string,
  ): Promise<ModuleLoadMetrics> {
    const start = performance.now();

    const existingMetric = this.metrics.get(cipherId);
    if (existingMetric) {
      this.metrics.set(cipherId, {
        ...existingMetric,
        status: "loading",
      });
    }

    // Simulate async dynamic module import & initialization latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    const duration = performance.now() - start;
    const cipher = this.ciphers.get(cipherId);

    const updatedMetric: ModuleLoadMetrics = {
      cipherId,
      cipherName: cipher?.name || cipherId,
      status: "ready",
      bundleSizeBytes: cipher?.bundleSizeBytes || 12288,
      initializationTimeMs: Number(duration.toFixed(2)),
      memoryUsageBytes: (cipher?.bundleSizeBytes || 12288) * 2.5,
      loadedAt: new Date().toISOString(),
    };

    this.metrics.set(cipherId, updatedMetric);
    return updatedMetric;
  }

  static registerCustomCipher(cipher: DynamicCipherDefinition): DynamicCipherDefinition[] {
    this.ciphers.set(cipher.id, cipher);
    this.metrics.set(cipher.id, {
      cipherId: cipher.id,
      cipherName: cipher.name,
      status: "ready",
      bundleSizeBytes: cipher.bundleSizeBytes || 9216,
      initializationTimeMs: cipher.initializationTimeMs || 3.1,
      memoryUsageBytes: 18432,
      loadedAt: new Date().toISOString(),
    });
    return this.getCiphers();
  }
}

/**
 * Format exportable JSON schema for dynamic ciphers.
 */
export function exportDynamicCipherJSON(
  cipher: DynamicCipherDefinition,
): string {
  return JSON.stringify(cipher, null, 2);
}

/**
 * Parse imported custom cipher JSON schema.
 */
export function importDynamicCipherJSON(jsonStr: string): DynamicCipherDefinition {
  const parsed = JSON.parse(jsonStr) as DynamicCipherDefinition;
  if (!parsed.id || !parsed.name || !parsed.cipherType) {
    throw new Error("Invalid dynamic cipher schema: missing id, name, or cipherType");
  }
  return {
    ...parsed,
    isDynamic: true,
  };
}
