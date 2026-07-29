# Dynamic Cipher Loader & Runtime Extension Framework

## Overview

The **Dynamic Cipher Loader** in CryptoViz provides a runtime extension framework and educational sandbox for dynamically instantiating, evaluating, and running custom cipher modules (e.g. S-Box block ciphers, Affine keys, and Feistel networks).

By enabling security researchers and students to construct custom substitution S-Box tables, configure key schedules, and monitor module initialization telemetry (ms latency, bundle size, RAM allocation), CryptoViz makes the internal mechanics of block and stream ciphers accessible and interactive.

---

## Key Features

1. **Dynamic Cipher Registry (`DynamicCipherRegistry`)**:
   - Manages runtime registration of new ciphers without requiring static recompilation.
   - Simulates asynchronous code-splitting module imports and reports initialization latency.

2. **Supported Dynamic Cipher Types**:
   - **S-Box Block Cipher**: 4x4 / 8x8 substitution-permutation networks with custom S-Box tables.
   - **Affine Cipher**: $E(x) = (a \cdot x + b) \pmod{26}$ monoalphabetic substitution combining multiplicative and additive keys.
   - **Feistel Network**: Symmetric Feistel structure splitting data blocks into Left and Right halves over variable rounds.

3. **Custom Cipher Builder (`CustomCipherEditor`)**:
   - Visual form allowing users to define custom S-Boxes, round counts, and shift keys.
   - Dynamically registers newly constructed ciphers into the active registry.

4. **Telemetry & Playground (`DynamicCipherPlayground`)**:
   - Live execution panel for testing encryption and decryption.
   - Telemetry card reporting bundle size, initialization time, and memory footprint.
   - JSON export and import for sharing custom cipher schemas.

---

## Architecture & Data Flow

```
+--------------------------------------------------------------------+
|                      User Custom Cipher Builder                    |
|       (Custom S-Box Table, Affine Keys, Feistel Round Config)      |
+--------------------------------------------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------+
|               lib/utils/dynamicCipherLoader.ts                     |
|   - DynamicCipherRegistry.registerCustomCipher(cipher)             |
|   - encryptCustomSBoxBlock(input, sbox)                            |
|   - encryptAffine(input, a, b) / decryptAffine(input, a, b)         |
|   - Telemetry Tracker & JSON Schema Exporter                       |
+--------------------------------------------------------------------+
                                   |
                                   v
+--------------------------------------------------------------------+
|                 DynamicCipherLoader Component                      |
|   - Catalog: View & dynamically load built-in & custom ciphers     |
|   - Builder: Construct new custom cipher modules                   |
|   - Playground: Live encryption/decryption execution workspace      |
|   - Telemetry Grid: Module bundle size, memory & init time         |
+--------------------------------------------------------------------+
```

---

## Data Structures

```typescript
export interface DynamicCipherDefinition extends CipherDefinition {
  cipherType: "substitution" | "sbox-block" | "feistel" | "affine";
  sboxConfig?: { substitutionTable: number[] };
  feistelConfig?: { rounds: number; subkeys: string[] };
  affineConfig?: { keyA: number; keyB: number };
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
}
```

---

## Testing

To run unit and component tests for the Dynamic Cipher Loader:

```bash
npx vitest run tests/unit/utils/dynamicCipherLoader.test.ts tests/unit/components/DynamicCipherLoader.test.tsx
```
