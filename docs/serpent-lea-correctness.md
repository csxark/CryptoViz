# Technical Specification & Test Vector Alignment: Serpent & LEA Ciphers

## Overview
This document outlines the cryptographic correctness verification, test vector alignment, and key schedule implementation details for the **Serpent** and **LEA** block ciphers in CryptoViz.

---

## Serpent Block Cipher (NESSIE / AES Finalist)

### 1. Specification Alignment
- **Block Size**: 128 bits (16 bytes, represented as 4 little-endian 32-bit words).
- **Key Sizes**: 128, 192, and 256 bits. Keys under 256 bits are padded with a `1` bit (`0x01` byte) followed by zeros to 256 bits prior to expansion.
- **Round Count**: 32 rounds.
- **Subkey Generation**:
  $$\begin{aligned}
  w_i = (w_{i-8} \oplus w_{i-5} \oplus w_{i-3} \oplus w_{i-1} \oplus \phi \oplus i) \lll 11
  \end{aligned}$$
  where $\phi = \text{0x9E3779B9}$.
  Subkeys $K_0 \dots K_{32}$ are derived by applying $S_{(3-i) \bmod 8}$ to 4-word tuples $(w_{4i}, w_{4i+1}, w_{4i+2}, w_{4i+3})$.

### 2. Test Vector Verification
- **NESSIE Zero Key/Plaintext Vector**:
  - Key: `00000000000000000000000000000000`
  - Plaintext: `00000000000000000000000000000000`
  - Expected Ciphertext: `D6D99825472B6EBCBB142E8F71F13C5D`

---

## LEA Block Cipher (IETF RFC 9998 / KISA Standard)

### 1. Specification Alignment
- **Block Size**: 128 bits (4 little-endian 32-bit words).
- **Key Schedule Deltas**:
  $$\begin{aligned}
  \delta = [0\text{xC3EFE9DB}, 0\text{x44626B02}, 0\text{x79E27C8A}, 0\text{x78DF30EC}, \\
  0\text{xEEF0CD61}, 0\text{x4BC9BC27}, 0\text{x5A2E3E7F}, 0\text{xCFB05832}]
  \end{aligned}$$
  Indexing into $\delta$ is bound by key size $N_w \in \{4, 6, 8\}$ words ($\delta[i \bmod N_w]$).

### 2. RFC 9998 Test Vector (128-bit key)
- Key: `0f1e2d3c4b5a69788796a5b4c3d2e1f0`
- Plaintext: `101112131415161718191a1b1c1d1e1f`
- Expected Ciphertext: `5f2c08ba245d8fc4db0c4fcbcb5d9552`
