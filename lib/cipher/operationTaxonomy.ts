/**
 * Cryptographic Operation Taxonomy & Capability Classification (Phase 6)
 *
 * Ensures cryptographic primitives are classified with their true operations:
 * - Digital signatures: sign, verify, keygen (never generic encrypt/decrypt)
 * - Key Encapsulation Mechanisms (KEMs): kem-encapsulate, kem-decapsulate, keygen
 * - Key Agreement: key-agreement, keygen
 * - Key Derivation: kdf
 * - Secret Sharing: split, combine
 * - Hashes: hash
 * - MACs: mac, mac-verify
 * - Symmetric/Classical: encrypt, decrypt
 */

import type { CryptographicOperation } from './types'

export interface AlgorithmCapability {
  primaryOperation: CryptographicOperation
  supportedOperations: CryptographicOperation[]
  description: string
}

export const ALGORITHM_CAPABILITIES: Record<string, AlgorithmCapability> = {
  // --- Digital Signatures (Sign / Verify) ---
  ed25519: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Edwards-curve Digital Signature Algorithm (RFC 8032)',
  },
  'sphincs-plus': {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Stateless Hash-Based Digital Signature Algorithm (FIPS 205 / SLH-DSA)',
  },
  falcon: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Lattice-based Fast-Fourier Signature Scheme (NIST PQC)',
  },
  lamport: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'One-Time Signature Scheme based on cryptographic hash functions',
  },
  wots: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Winternitz One-Time Signature Scheme',
  },
  lms: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Leighton-Micali Hash-Based Signature Scheme (RFC 8554)',
  },
  dilithium: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Lattice-based Digital Signature Algorithm (FIPS 204 / ML-DSA)',
  },
  dsa: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Digital Signature Algorithm (FIPS 186-4)',
  },
  ecdsa: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Elliptic Curve Digital Signature Algorithm (ANSI X9.62 / FIPS 186-4)',
  },
  schnorr: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Schnorr Digital Signature Scheme (BIP-340)',
  },
  bls: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Boneh-Lynn-Shacham Pairing-Based Signature Scheme',
  },
  'bbs-plus': {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'BBS+ Zero-Knowledge Anonymous Credential Signature',
  },
  rainbow: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Multivariate Quadratic Signature Scheme',
  },
  sqisign: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'Isogeny-Based Digital Signature Scheme',
  },
  xmss: {
    primaryOperation: 'sign',
    supportedOperations: ['sign', 'verify', 'keygen'],
    description: 'eXtended Merkle Signature Scheme (RFC 8391)',
  },

  // --- Key Encapsulation Mechanisms (KEM) ---
  'ml-kem': {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Module-Lattice-Based Key Encapsulation Mechanism (FIPS 203 / Kyber)',
  },
  frodokem: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Unstructured Lattice Key Encapsulation Mechanism',
  },
  bike: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Bit Flipping Key Encapsulation (Code-based PQC)',
  },
  hqc: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Hamming Quasi-Cyclic Key Encapsulation (Code-based PQC)',
  },
  saber: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Learning with Rounding Key Encapsulation Mechanism',
  },
  classic_mceliece: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Classic McEliece Code-Based Key Encapsulation',
  },
  ntru: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'NTRU Lattice-Based Key Encapsulation',
  },
  ntruprime: {
    primaryOperation: 'kem-encapsulate',
    supportedOperations: ['kem-encapsulate', 'kem-decapsulate', 'keygen'],
    description: 'Streamlined NTRU Prime Key Encapsulation',
  },

  // --- Key Agreement ---
  x25519: {
    primaryOperation: 'key-agreement',
    supportedOperations: ['key-agreement', 'keygen'],
    description: 'Curve25519 Elliptic Curve Diffie-Hellman (RFC 7748)',
  },
  dh: {
    primaryOperation: 'key-agreement',
    supportedOperations: ['key-agreement', 'keygen'],
    description: 'Diffie-Hellman Key Exchange (RFC 2631 / RFC 3526)',
  },
  ecdh: {
    primaryOperation: 'key-agreement',
    supportedOperations: ['key-agreement', 'keygen'],
    description: 'Elliptic Curve Diffie-Hellman Key Exchange (SP 800-56A)',
  },
  csidh: {
    primaryOperation: 'key-agreement',
    supportedOperations: ['key-agreement', 'keygen'],
    description: 'Commutative Supersingular Isogeny Diffie-Hellman',
  },
  mqv: {
    primaryOperation: 'key-agreement',
    supportedOperations: ['key-agreement', 'keygen'],
    description: 'Menezes-Qu-Vanstone Authenticated Key Agreement',
  },

  // --- Key Derivation Functions (KDF) ---
  hkdf: {
    primaryOperation: 'kdf',
    supportedOperations: ['kdf'],
    description: 'HMAC-based Extract-and-Expand Key Derivation Function (RFC 5869)',
  },
  scrypt: {
    primaryOperation: 'kdf',
    supportedOperations: ['kdf'],
    description: 'Memory-hard Password-based Key Derivation Function (RFC 7914)',
  },
  pbkdf2: {
    primaryOperation: 'kdf',
    supportedOperations: ['kdf'],
    description: 'Password-Based Key Derivation Function 2 (RFC 2898 / SP 800-132)',
  },
  argon2id: {
    primaryOperation: 'kdf',
    supportedOperations: ['kdf'],
    description: 'Argon2id Hybrid Memory-Hard Key Derivation Function (RFC 9106)',
  },

  // --- Secret Sharing ---
  'shamir-secret-sharing': {
    primaryOperation: 'split',
    supportedOperations: ['split', 'combine'],
    description: 'Shamir (k, n) Threshold Secret Sharing Scheme',
  },

  // --- MAC Functions ---
  hmac: {
    primaryOperation: 'mac',
    supportedOperations: ['mac', 'mac-verify'],
    description: 'Keyed-Hash Message Authentication Code (RFC 2104 / FIPS 198-1)',
  },
  cmac: {
    primaryOperation: 'mac',
    supportedOperations: ['mac', 'mac-verify'],
    description: 'Cipher-based Message Authentication Code (NIST SP 800-38B)',
  },
  poly1305: {
    primaryOperation: 'mac',
    supportedOperations: ['mac', 'mac-verify'],
    description: 'Poly1305 One-Time Authenticator (RFC 7539 / RFC 8439)',
  },
  siphash: {
    primaryOperation: 'mac',
    supportedOperations: ['mac', 'mac-verify'],
    description: 'SipHash-2-4 Pseudorandom Function for Short Messages',
  },

  // --- Educational Simulators ---
  'bloom-filter': {
    primaryOperation: 'educational-demo',
    supportedOperations: ['educational-demo'],
    description: 'Probabilistic Set Membership Visualizer',
  },
}

/**
 * Resolves the semantic capabilities for an algorithm in the registry.
 */
export function getAlgorithmCapability(id: string, category: string): AlgorithmCapability {
  if (ALGORITHM_CAPABILITIES[id]) {
    return ALGORITHM_CAPABILITIES[id]
  }

  if (category === 'hash') {
    return {
      primaryOperation: 'hash',
      supportedOperations: ['hash'],
      description: 'Cryptographic Hash Function',
    }
  }

  if (category === 'classical' || category === 'symmetric') {
    return {
      primaryOperation: 'encrypt',
      supportedOperations: ['encrypt', 'decrypt'],
      description: 'Symmetric Confidentiality Cipher',
    }
  }

  // Default asymmetric encryption (e.g. RSA, ElGamal, Paillier)
  return {
    primaryOperation: 'encrypt',
    supportedOperations: ['encrypt', 'decrypt', 'keygen'],
    description: 'Asymmetric Public-Key Cryptosystem',
  }
}
