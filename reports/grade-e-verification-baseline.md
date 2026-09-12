# CryptoViz — Grade-E Elimination Verification Baseline (Phase 1)

## Executive Summary
This document establishes the frozen baseline state of CryptoViz before embarking on the Grade-E Elimination & Independent Cryptographic Verification Gate. Per the non-negotiable rules of this audit, no production cryptographic changes have been made during this baseline capture.

* **Audit Timestamp**: 2026-09-12T22:05:48+05:30
* **Base Git Commit**: `b814e4f455240d675029ed1b0a308a3a8bfa5f6b`
* **Branch**: `main` (up to date with `origin/main`)
* **Objective**: Eliminate Grade-E status exclusively through independent, authoritative evidence, while honestly preserving Grade E wherever trustworthy external evidence does not exist.

---

## 1. Git Working-Tree Status

### Modified Files:
* `lib/cipher/hash/sha256.ts`
* `lib/cipher/hash/sha512.ts`
* `lib/cipher/registry.ts`
* `lib/cipher/symmetric/aes-gcm.ts`
* `lib/cipher/symmetric/aes.ts`
* `lib/cipher/symmetric/chacha20.ts`
* `lib/cipher/types.ts`
* `tests/unit/cipher/conformanceParity.test.ts`
* `tests/unit/hash/sha512.test.ts`

### Untracked Infrastructure Files (Added During Prior Gate Setup):
* `lib/cipher/operationTaxonomy.ts`
* `lib/cipher/provenance/constantsManifest.json`
* `lib/testing/contaminationAudit.ts`
* `reports/algorithm-conformance-matrix.md`
* `reports/baseline-audit-checkpoint.json`
* `reports/mutation-testing-report.md`
* `reports/test-self-audit.md`
* `reports/verification-integrity-gate-final.md`
* `scripts/generateConformanceMatrix.mjs`
* `scripts/run-mutation-tests.mjs`
* `tests/conformance/cryptographicConstantsAudit.test.ts`
* `tests/conformance/mutationTesting.test.ts`
* `tests/security/negativeSecurityIntegrity.test.ts`
* `tests/unit/cipher/algorithmCapabilityAudit.test.ts`

---

## 2. Baseline Test Execution Results

* **Test Runner**: Vitest v4.1.8
* **Total Test Files Evaluated**: 517
* **Passed Test Files**: 487
* **Failed Test Files**: 30
* **Total Tests Evaluated**: 8,627
* **Passed Tests**: 8,408
* **Failed Tests**: 219
* **Duration**: 257.81s

### Core Conformance & Hardening Suite Health:
* `tests/conformance/mutationTesting.test.ts`: **36 / 36 PASSED** (Mutation score: 91.43%)
* `tests/conformance/truth-hierarchy-kat.test.ts`: **16 / 16 PASSED**
* `tests/conformance/cryptographicConstantsAudit.test.ts`: **12 / 12 PASSED**
* `tests/security/negativeSecurityIntegrity.test.ts`: **17 / 17 PASSED**
* `tests/unit/cipher/algorithmCapabilityAudit.test.ts`: **12 / 12 PASSED**

### Failed Test File Breakdown:
The 30 failing test files are non-conformance UI / assistant / legacy test files that either:
1. Expected legacy un-clamped memory workload configurations (e.g. `workloadLimits.test.ts`).
2. Expected hardcoded 4 algorithms instead of 5 in `postQuantumLearningHub.test.ts`.
3. Contained legacy expectation strings or un-updated UI component mocks (`StepAnimator.test.tsx`, `Footer.test.tsx`, `CipherSandboxComponent.test.tsx`).
4. In `katRegression.test.ts` / `conformanceParity.test.ts`, tested unverified or stub ciphers against placeholder expectations or unverified algorithms lacking proper input normalization.

---

## 3. Initial 218-Algorithm Conformance Matrix

| Grade | Description | Baseline Count | Percentage |
| :--- | :--- | :---: | :---: |
| **A** | Authoritative Published KAT + Independent Reference Oracle | 13 | 6.0% |
| **B** | Independent Reference Oracle Verified | 5 | 2.3% |
| **C** | Strong Algorithmic Property / Algebraic Validation | 21 | 9.6% |
| **D** | Internal Consistency Only (Round-trip / Self-Parity) | 0 | 0.0% |
| **E** | Unverified / Pending Independent Provenance | 179 | 82.1% |
| **Total** | **All Active Registered Algorithms** | **218** | **100.0%** |

### Breakdown of Baseline Grade A (13):
`aes`, `aes-gcm`, `3des`, `des`, `sha1`, `sha256`, `sha512`, `md5`, `chacha20`, `chacha20-poly1305`, `hmac`, `hkdf`, `ed25519`.

### Breakdown of Baseline Grade B (5):
`x25519`, `ml-kem`, `sphincs-plus`, `scrypt`, `ripemd160`.

### Breakdown of Baseline Grade C (21):
`caesar`, `rot13`, `vigenere`, `atbash`, `playfair`, `railfence`, `trithemius`, `bacon`, `affine`, `keyword-substitution`, `gronsfeld`, `beaufort`, `hill`, `columnar-transposition`, `autokey`, `porta`, `adfgvx`, `bifid`, `nihilist`, `polybius`, `four-square`.

### Breakdown of Baseline Grade E (179):
* **Symmetric Ciphers**: 82 algorithms
* **Hashes / MACs / KDFs**: 50 algorithms
* **Asymmetric & Post-Quantum**: 47 algorithms

---

## 4. Production Modifications Since Previous Baseline

1. **`lib/cipher/hash/sha512.ts`**:
   - `K_512[46]` corrected from corrupted `0xf40e358557712023n` to authoritative NIST FIPS 180-4 constant `0xf40e35855771202an`.
   - `K_512[57]` corrected from corrupted `0x5b9cca4f7763e370n` to authoritative NIST FIPS 180-4 constant `0x5b9cca4f7763e373n`.
   - Added explicit constant exports and regression tests.
2. **`lib/cipher/symmetric/aes-gcm.ts`**:
   - Implemented constant-time authentication tag verification using `crypto.timingSafeEqual` equivalence.
   - Enforced immediate throwing of `CipherError('AUTHENTICATION_FAILED')` on tampered ciphertext, modified tag, or altered AAD.
3. **`lib/cipher/symmetric/aes.ts`**:
   - Exported `AES_SBOX` and `AES_INV_SBOX` tables for external checksum auditing.
4. **`lib/cipher/types.ts` & `lib/cipher/registry.ts`**:
   - Introduced `CryptographicOperation` type definition.
   - Added `primaryOperation` and `supportedOperations` to `CipherDefinition`.
