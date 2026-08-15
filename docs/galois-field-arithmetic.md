# Galois Field GF(2^8) Arithmetic

This document explains the mathematical foundations of the Galois Field arithmetic used in various cryptographic algorithms like AES, Anubis, and Twofish, and how it is implemented in the CryptoViz interactive laboratory.

## 1. What is GF(2^8)?

A Galois Field, or finite field, is a field that contains a finite number of elements. GF(2^8) consists of 256 elements, which makes it perfect for representing operations on a single byte (8 bits). 

In GF(2^8), each element is represented as a polynomial with a maximum degree of 7, where the coefficients are in GF(2) (meaning they are either 0 or 1).

For example, the byte `0x57` (binary `01010111`) represents the polynomial:
`x^6 + x^4 + x^2 + x + 1`

## 2. Addition and Subtraction

In GF(2^8), addition and subtraction are identical and correspond to polynomial addition where the coefficients are added modulo 2. 

In programming, this is simply the bitwise XOR operation (`^`).

## 3. Multiplication and Modular Reduction

Multiplication in GF(2^8) is polynomial multiplication followed by a modulo operation with a chosen **irreducible polynomial** of degree 8 (which acts similarly to prime numbers in integer arithmetic).

Different ciphers use different irreducible polynomials:
- **AES (Rijndael)**: `x^8 + x^4 + x^3 + x + 1` (0x11B)
- **Anubis**: `x^8 + x^4 + x^3 + x^2 + 1` (0x11D)
- **Twofish**: `x^8 + x^5 + x^3 + x^2 + 1` (0x12D)

### Implementation
To multiply `A` and `B`:
1. We iterate through the bits of `B`.
2. If the current bit is 1, we XOR the shifted `A` into our accumulator.
3. We shift `A` left by 1.
4. If shifting `A` caused the 8th bit (x^8) to become 1, we must perform modular reduction by XORing `A` with the irreducible polynomial (e.g., 0x11B).
5. Repeat for all 8 bits.

## 4. Multiplicative Inverse (Extended Euclidean Algorithm)

The multiplicative inverse of `A` in GF(2^8) modulo an irreducible polynomial `m(x)` is a value `A^-1` such that:
`(A * A^-1) mod m(x) = 1`

In the context of the Rijndael S-Box, the inverse of `0x00` is defined to map to `0x00`.

To calculate the inverse, we can use the **Extended Euclidean Algorithm**, which iteratively applies polynomial long division to find the greatest common divisor (which is 1) and the coefficients that satisfy Bézout's identity.

Alternatively, since the field size is small (256 elements), an exhaustive search is often used in software implementations for simplicity, but the Extended Euclidean Algorithm provides a deeper mathematical understanding of the field's structure.

## 5. Rijndael S-Box Derivation

The Rijndael S-Box used in AES SubBytes is derived mathematically to provide non-linearity. The derivation consists of two steps:

1. **Multiplicative Inverse**: Find the inverse of the byte in GF(2^8) modulo 0x11B. If the input is 0x00, the inverse is 0x00.
2. **Affine Transformation**: Apply the following affine transformation over GF(2):
   `b'_i = b_i ⊕ b_{(i+4) mod 8} ⊕ b_{(i+5) mod 8} ⊕ b_{(i+6) mod 8} ⊕ b_{(i+7) mod 8} ⊕ c_i`
   where `c` is the byte `0x63` (`01100011` in binary).

The combination of the finite field inverse and the affine transformation creates a highly non-linear mapping that is resistant to linear and differential cryptanalysis.
