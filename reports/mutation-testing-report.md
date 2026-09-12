# CryptoViz — Cryptographic Mutation Testing Report (Phase 10)

## Executive Summary

The Cryptographic Mutation Testing Framework validates that CryptoViz test suites detect deliberate, realistic defects across all **14 required cryptographic bug categories**.

In particular, the framework explicitly re-injects the exact **SHA-512 constant corruptions** discovered during this audit (`K_512[46]` and `K_512[57]`) and proves that both the FIPS 180-4 KAT suite and the instrumented-vs-fast parity check kill the mutants immediately.

---

## 1. Mutation Testing Metrics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Mutants Tested** | **35** | Broad coverage across 14 bug categories |
| **Mutants Killed** | **32** | Detected by KATs, Oracles, Parity, or Security Checks |
| **Mutants Survived** | **3** | Documented gaps (Side-channel, PRNG entropy, Grade E ciphers) |
| **Equivalent Mutants** | **0** | No synthetic no-ops |
| **Invalid Mutants** | **0** | All mutants compile and execute cleanly |
| **Mutation Score** | **91.43%** | $\frac{32}{35} \times 100\%$ |

---

## 2. Category Breakdown & Results

| # | Bug Category | Target Primitive | Mutant Injected | Result | Detection Mechanism |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | Cryptographic Constants | SHA-512 | `K_512[46] = 0xf40e358557712023n` (Exact Audit Defect) | **KILLED** | FIPS 180-4 KAT & Fast/Instrumented Parity |
| 1 | Cryptographic Constants | SHA-512 | `K_512[57] = 0x78a5636f43172f61n` | **KILLED** | Multi-block Node.js Crypto Oracle Parity |
| 1 | Cryptographic Constants | SHA-256 | `K[0] = 0x428a2f99` | **KILLED** | FIPS 180-4 KAT ba7816bf... |
| 1 | Cryptographic Constants | ChaCha20 | `CONSTANTS[0] = 0x61707866` | **KILLED** | RFC 7539 KAT verification |
| 1 | Cryptographic Constants | AES-128 | `RCON[1] = 0x02` | **KILLED** | FIPS 197 Appendix C.1 KAT |
| 2 | S-Boxes & Inverses | AES-128 | `S_BOX[0] = 0x64` | **KILLED** | Bijection audit & FIPS 197 KAT |
| 2 | S-Boxes & Inverses | AES-128 | `INV_S_BOX[0x63] = 0x01` | **KILLED** | Inverse mathematical bijection test |
| 3 | Round Counts | AES-128 | Premature termination at round 9 (of 10) | **KILLED** | FIPS 197 KAT mismatch |
| 3 | Round Counts | ChaCha20 | 18 rounds (9 double rounds) instead of 20 | **KILLED** | RFC 7539 Section 2.4.2 KAT vector |
| 4 | Rotations | ChaCha20 | Quarter-round rotl 16 replaced by rotl 15 | **KILLED** | RFC 7539 Section 2.1.1 vector |
| 4 | Rotations | SHA-256 | Sigma0 rotation 2 replaced by rotation 3 | **KILLED** | FIPS 180-4 Section 4.1.2 KAT |
| 5 | Shifts | DES | Round 1 key schedule left shift 1 -> 2 | **KILLED** | FIPS 46-3 KAT ciphertext mismatch |
| 5 | Shifts | SHA-256 | sigma0 right shift 3 replaced by 4 | **KILLED** | FIPS 180-4 multi-block schedule check |
| 6 | Endian Handling | SHA-256 | Message block words read as Little-Endian | **KILLED** | FIPS 180-4 Section 5.1.1 byte packing |
| 6 | Endian Handling | MD5 | Message block words read as Big-Endian | **KILLED** | RFC 1321 Section 3.4 byte order KAT |
| 7 | Padding | AES / PKCS#7 | Corrupted pad byte accepted without error | **KILLED** | Negative Security Integrity rejection |
| 7 | Padding | AES / PKCS#7 | Pad length 0 accepted without error | **KILLED** | Padding boundary check |
| 8 | IV & Nonce Handling | AES-CBC | Caller IV ignored, all-zero IV used | **KILLED** | NIST SP 800-38A CBC KAT mismatch |
| 8 | IV & Nonce Handling | AES-GCM | Decrypt ignores options.iv check (Phase 8 fix) | **KILLED** | Wrong IV rejection security test |
| 9 | Registry Mappings | Ed25519 | Registry declares operations as encrypt/decrypt | **KILLED** | Algorithm capability taxonomy audit |
| 9 | Registry Mappings | SHA-256 | Registry declares SHA-256 as symmetric | **KILLED** | Primitive type classification audit |
| 10 | Worker Dispatch | Visualizer | Worker drops final milestone step | **KILLED** | Step trace completeness validation |
| 10 | Worker Dispatch | Web Worker | Worker postMessage corrupts hex output | **KILLED** | Payload integrity verification |
| 11 | Cache Keys | Worker Cache | Cache key omits options/IV | **KILLED** | Cross-IV collision test |
| 11 | Cache Keys | Worker Cache | Cache key omits operation direction | **KILLED** | Encrypt vs Decrypt direction isolation |
| 12 | Stale Responses | Worker Cache | Cache returns stale result on input change | **KILLED** | Cache key discrimination test |
| 12 | Stale Responses | Worker Cache | Cache serves expired entry after TTL | **KILLED** | TTL expiration eviction test |
| 13 | AEAD Verification | AES-GCM | Plaintext released on tampered ciphertext | **KILLED** | AES-GCM bit-flip rejection |
| 13 | AEAD Verification | AES-GCM | Plaintext released on tampered auth tag | **KILLED** | AES-GCM tag tamper rejection |
| 13 | AEAD Verification | AES-GCM | Plaintext released on tampered AAD | **KILLED** | AES-GCM AAD mismatch rejection |
| 14 | Visualization State | SHA-512 | Non-monotonic out-of-order step indices | **KILLED** | Step index monotonicity validation |
| 14 | Visualization State | SHA-512 | Initial step omits table/input/output states | **KILLED** | Visualizer state structure validation |
| - | Side-Channel | Classical/Asym | Non-constant time early exit in comparison | **SURVIVED** | No microarchitectural timing suite |
| - | Entropy / PRNG | Random IVs | 16-bit PRNG cycle fallback during streaming | **SURVIVED** | Dieharder / NIST STS not run in unit tests |
| - | Grade E Roundtrip | Square / Sosemanuk | Symmetric round mutation in unverified cipher | **SURVIVED** | Round-trip tests mask symmetric errors |

---

## 3. Surviving Mutants & Untested Bug Classes

### MUTANT-SURVIVE-01: Constant-Time Execution & Timing Side Channels
- **Bug Class**: Microarchitectural timing side channels (early `return false` in byte comparison).
- **Survival Reason**: Unit tests execute in a virtualized JavaScript environment (V8/Node.js) where JIT compilation, GC pauses, and CPU caching introduce substantial timing jitter. Unit tests check functional equality, not statistical execution time distributions (e.g. Dudect / Welch's t-test).
- **Remediation**: Dedicated differential execution-time benchmarking suite using WebAssembly or native C constant-time primitives.

### MUTANT-SURVIVE-02: PRNG Catastrophic Entropy Collapse
- **Bug Class**: Defective or repeating pseudo-random number generator used for nonce/IV generation.
- **Survival Reason**: Unit tests verify that generated IVs are of valid length and non-constant across 2 consecutive runs, but do not execute NIST SP 800-22 statistical test batteries (Monobit, Block Frequency, Runs, Longest Run, Spectral DFT) which require millions of sample bits.
- **Remediation**: Offline entropy validation runner executing NIST STS on 10MB of random output.

### MUTANT-SURVIVE-03: Symmetric Round-Function Mutations in Grade E Algorithms
- **Bug Class**: Symmetrically corrupted forward and inverse rounds in unverified ciphers.
- **Survival Reason**: Algorithms graded **E** (e.g. Sosemanuk, Square, Kalyna) lack authoritative external KAT vectors in the test suite and only possess internal round-trip tests ($Dec(Enc(x)) = x$). A symmetric mutation to both encrypt and decrypt preserves round-trip equality despite outputting completely wrong ciphertext!
- **Significance**: This mathematically justifies the Zero False Greens policy: **Round-trip tests must NEVER be treated as evidence of standards compliance**.

---

## 4. Verification Integrity Conclusion

The mutation suite successfully proves that the verification infrastructure:
1. **Detects the exact SHA-512 constant defect** with 100% sensitivity.
2. **Rejects invalid cryptographic behavior** across all 14 categories.
3. **Transparently documents testing boundaries** rather than claiming an artificial 100% mutation score.
