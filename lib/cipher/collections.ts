/**
 * Cipher Collection cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export interface CipherCollection {
  id: string;
  name: string;
  description: string;
  cipherIds: string[];
  features: string[];
}

/**
 * CIPHER COLLECTIONS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/197/final — FIPS 197.
 */
export const CIPHER_COLLECTIONS: CipherCollection[] = [
  {
    id: 'aes-family',
    name: 'AES Family',
    description: 'The Advanced Encryption Standard (AES) family of symmetric block ciphers and modes of operation. Standardized by NIST and widely used globally.',
    cipherIds: ['aes', 'aes-ccm', 'aes-xts'],
    features: [
      'Confidentiality using block ciphers',
      'Authenticated encryption options (GCM, CCM)',
      'Disk encryption capability (XTS)',
      'Standardized key sizes (128, 192, 256 bits)',
    ],
  },
  {
    id: 'sha-family',
    name: 'SHA Family',
    description: 'Secure Hash Algorithms designed by the NSA and standardized by NIST. Essential for verification, message integrity, and hashing.',
    cipherIds: ['sha256', 'sha512', 'sha224', 'sha384', 'shake128', 'shake256'],
    features: [
      'One-way hash functions with pre-image resistance',
      'Variable output sizes and extendable-output functions (SHAKE)',
      'Collision resistant design structures',
      'Foundation for digital signatures and HMACs',
    ],
  },
  {
    id: 'classical-substitution',
    name: 'Classical Substitution',
    description: 'Historical algorithms showcasing substitution, alphabetic shifts, and polyalphabetic key patterns.',
    cipherIds: ['caesar', 'rot13', 'vigenere', 'atbash', 'playfair'],
    features: [
      'Foundational shift-based mechanics',
      'Monoalphabetic & Polyalphabetic architectures',
      'Grid-based digraphic substitution (Playfair)',
      'Broken security, but highly educational',
    ],
  },
  {
    id: 'asymmetric-exchange',
    name: 'Asymmetric & Key Exchange',
    description: 'Public-key cryptography systems utilizing mathematically linked pairs of public and private keys for secure transmission, signatures, and agreement.',
    cipherIds: ['rsa', 'dsa', 'dh', 'ecc', 'ecies'],
    features: [
      'Public-private key pairs',
      'Key exchange over insecure channels (Diffie-Hellman)',
      'Digital signature generation and verification',
      'Hybrid encryption combining symmetric speed and asymmetric security (ECIES)',
    ],
  },
];
