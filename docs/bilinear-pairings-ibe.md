# Bilinear Pairings & Identity-Based Encryption (IBE) Formalism

## Overview

Pairing-based cryptography is one of the most powerful mathematical primitives in modern public-key cryptography. It provides the foundation for:
- **Identity-Based Encryption (IBE)** (Boneh-Franklin 2001)
- **Short Aggregate Signatures** (BLS Signatures)
- **Zero-Knowledge Proofs** (Groth16, PLONK, KZG Polynomial Commitments)
- **Tripartite Diffie-Hellman Key Agreement** (Joux 2000)

---

## 1. The Bilinear Map $e: G_1 \times G_2 \to G_T$

Let $G_1$ and $G_2$ be additive cyclic groups of prime order $q$ over pairing-friendly elliptic curves (e.g., BN254 or BLS12-381), and let $G_T$ be a multiplicative cyclic group of order $q$ in an extension field $\mathbb{F}_{p^k}$.

A map $e: G_1 \times G_2 \to G_T$ is a **Bilinear Pairing** if it satisfies the following three axioms:

1. **Bilinearity**:
   $$\forall P \in G_1, Q \in G_2, \quad \forall a, b \in \mathbb{Z}_q: \quad e(aP, bQ) = e(P, Q)^{ab}$$
   $$e(P_1 + P_2, Q) = e(P_1, Q) \cdot e(P_2, Q)$$
   $$e(P, Q_1 + Q_2) = e(P, Q_1) \cdot e(P, Q_2)$$

2. **Non-degeneracy**:
   If $P$ generates $G_1$ and $Q$ generates $G_2$, then $e(P, Q)$ generates $G_T$ (i.e., $e(P, Q) \neq 1$).

3. **Computability**:
   There exists an efficient polynomial-time algorithm (Miller's algorithm) to compute $e(P, Q)$.

---

## 2. Miller's Algorithm

Computing the Weil, Tate, or Optimal Ate pairing involves evaluating rational functions $f_r$ whose divisor satisfies:
$$\text{div}(f_r) = r(P) - ([r]P) - (r - 1)(\mathcal{O})$$

Miller's algorithm computes $f_r(Q)$ via a double-and-add recurrence using line functions:
- **Doubling step**: Computes tangent line $l_{R,R}$ through $R$ and vertical line $v_{2R}$ at $2R$.
  $$f \leftarrow f^2 \cdot \frac{l_{R,R}(Q)}{v_{2R}(Q)}, \quad R \leftarrow 2R$$
- **Addition step** (when bit $r_i = 1$): Computes chord line $l_{R,P}$ through $R$ and $P$ and vertical line $v_{R+P}$.
  $$f \leftarrow f \cdot \frac{l_{R,P}(Q)}{v_{R+P}(Q)}, \quad R \leftarrow R + P$$

---

## 3. Boneh-Franklin Identity-Based Encryption (IBE)

In traditional public-key cryptography (like RSA or ECC), encrypting a message requires retrieving and verifying the recipient's public key certificate signed by a Certificate Authority (CA).

In **Boneh-Franklin IBE**, the public key **is** the recipient's identity string (such as an email address `alice@example.com`).

### Protocol Flow:

1. **Setup**:
   The Key Generation Center (PKG) picks master secret $s \in \mathbb{Z}_q^*$ and computes public parameters:
   $$P_{pub} = s \cdot P \in G_1$$

2. **Extract Key**:
   The PKG maps the user's identity to a curve point $Q_{ID} = H_1(ID) \in G_2$ and derives the private key:
   $$d_{ID} = s \cdot Q_{ID} \in G_2$$

3. **Encrypt**:
   To send message $M$ to $ID$, the sender picks random ephemeral scalar $r \in \mathbb{Z}_q^*$ and computes:
   $$U = r \cdot P \in G_1$$
   $$g_{ID} = e(P_{pub}, Q_{ID})^r \in G_T$$
   $$V = M \oplus H_2(g_{ID})$$
   Ciphertext is $C = (U, V)$.

4. **Decrypt**:
   The recipient uses private key $d_{ID}$ and received point $U$ to compute:
   $$e(U, d_{ID}) = e(rP, s Q_{ID}) = e(P, Q_{ID})^{rs} = e(sP, Q_{ID})^r = e(P_{pub}, Q_{ID})^r = g_{ID}$$
   The recovered mask $H_2(g_{ID})$ decrypts the message:
   $$M = V \oplus H_2(g_{ID})$$

---

## Interactive Playground

Explore bilinear maps, Miller's algorithm trace, and IBE key exchange live at `/ibe-pairings`.
