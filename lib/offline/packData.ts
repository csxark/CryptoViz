import { OfflinePack } from './types';

export const OFFLINE_PACKS: OfflinePack[] = [
  {
    id: 'symmetric-classical',
    title: 'Symmetric & Classical Ciphers Pack',
    description: 'Complete offline collection of classical substitution ciphers, AES, DES, ChaCha20, and Block Cipher Modes.',
    category: 'symmetric',
    difficulty: 'Beginner',
    version: '1.2.0',
    estimatedSize: '2.4 MB',
    sizeBytes: 2516582,
    itemCount: 8,
    icon: 'Shield',
    topics: ['Caesar Cipher', 'Vigenère', 'Playfair Matrix', 'AES-256', 'ChaCha20', 'ECB/CBC/CTR/GCM Modes'],
    docItems: [
      { slug: 'caesar-cipher', title: 'Caesar Cipher Reference', description: 'Mathematical formulas and shift substitution diagrams.' },
      { slug: 'vigenere-cipher', title: 'Vigenère Polyalphabetic Cipher', description: 'Tabula recta matrix lookup and key repetition rules.' },
      { slug: 'aes-encryption', title: 'Advanced Encryption Standard (AES)', description: 'SubBytes, ShiftRows, MixColumns, and AddRoundKey steps.' },
      { slug: 'block-cipher-modes', title: 'Block Cipher Operating Modes', description: 'Detailed comparison of ECB, CBC, CFB, OFB, CTR, and GCM.' }
    ],
    cipherItems: [
      { id: 'caesar', name: 'Caesar Cipher', category: 'classical', description: 'Shift substitution cipher.' },
      { id: 'rot13', name: 'ROT13', category: 'classical', description: 'Fixed shift of 13 positions.' },
      { id: 'vigenere', name: 'Vigenère Cipher', category: 'classical', description: 'Polyalphabetic keyword cipher.' },
      { id: 'atbash', name: 'Atbash Cipher', category: 'classical', description: 'Alphabet reversal cipher.' },
      { id: 'playfair', name: 'Playfair Cipher', category: 'classical', description: '5x5 matrix polygraphic cipher.' },
      { id: 'aes', name: 'AES-128 / AES-256', category: 'symmetric', description: 'Rijndael block cipher standard.' }
    ]
  },
  {
    id: 'asymmetric-pqc',
    title: 'Asymmetric & Post-Quantum Pack',
    description: 'Public-key cryptography standards including RSA, Diffie-Hellman, ECC, and NIST Post-Quantum Kyber & Dilithium.',
    category: 'asymmetric',
    difficulty: 'Intermediate',
    version: '1.1.0',
    estimatedSize: '3.1 MB',
    sizeBytes: 3250585,
    itemCount: 6,
    icon: 'KeyRound',
    topics: ['RSA Keygen', 'Diffie-Hellman Key Exchange', 'Elliptic Curves (secp256k1)', 'ML-KEM (Kyber)', 'ML-DSA (Dilithium)'],
    docItems: [
      { slug: 'rsa-cryptosystem', title: 'RSA Public Key Algorithm', description: 'Prime number selection, totient function, and modular exponentiation.' },
      { slug: 'diffie-hellman', title: 'Diffie-Hellman Key Exchange', description: 'Discrete logarithm problem and secure channel establishment.' },
      { slug: 'pqc-standards', title: 'NIST Post-Quantum Cryptography', description: 'Lattice-based algorithms protecting against quantum computing attacks.' }
    ],
    cipherItems: [
      { id: 'rsa', name: 'RSA Encryption', category: 'asymmetric', description: 'Public key encryption and digital signatures.' },
      { id: 'dh', name: 'Diffie-Hellman', category: 'asymmetric', description: 'Key agreement protocol.' },
      { id: 'kyber', name: 'ML-KEM-768 (Kyber)', category: 'asymmetric', description: 'Post-quantum key encapsulation.' }
    ]
  },
  {
    id: 'hash-kdf',
    title: 'Cryptographic Hashes & KDF Pack',
    description: 'One-way hash functions, collision resistance, Merkle Trees, and password key derivation (PBKDF2, HKDF, Scrypt, Argon2).',
    category: 'hash',
    difficulty: 'Intermediate',
    version: '1.0.0',
    estimatedSize: '2.8 MB',
    sizeBytes: 2936012,
    itemCount: 7,
    icon: 'Hash',
    topics: ['SHA-256 State Compression', 'MD5 & SHA-1', 'SHA-3 (Keccak)', 'Merkle Tree Proofs', 'PBKDF2 & Scrypt'],
    docItems: [
      { slug: 'sha256-compression', title: 'SHA-256 Internal Structure', description: 'Message padding, 64-round compression loop, and digest generation.' },
      { slug: 'merkle-trees', title: 'Merkle Tree Integrity Proofs', description: 'Binary tree hashing for tamper-proof verification in distributed and file systems.' },
      { slug: 'key-derivation', title: 'Password-Based Key Derivation', description: 'Salting, iteration counting, and memory-hard hash construction.' }
    ],
    cipherItems: [
      { id: 'sha256', name: 'SHA-256', category: 'hash', description: '256-bit secure hash algorithm.' },
      { id: 'md5', name: 'MD5', category: 'hash', description: 'Legacy 128-bit hash function.' },
      { id: 'pbkdf2', name: 'PBKDF2', category: 'hash', description: 'Password-based key derivation function 2.' },
      { id: 'merkle', name: 'Merkle Tree Visualizer', category: 'hash', description: 'Hash tree structure and proof generation.' }
    ]
  },
  {
    id: 'cryptanalysis-attacks',
    title: 'Cryptanalysis & Attacks Pack',
    description: 'Interactive offline simulators for brute-force key search, frequency analysis, birthday paradox, and avalanche effect.',
    category: 'attacks',
    difficulty: 'Advanced',
    version: '1.3.0',
    estimatedSize: '1.9 MB',
    sizeBytes: 1992294,
    itemCount: 5,
    icon: 'Zap',
    topics: ['Frequency Analysis', 'Brute Force Simulator', 'Birthday Paradox Collision', 'Avalanche Effect Heatmaps', 'Padding Oracle'],
    docItems: [
      { slug: 'frequency-analysis', title: 'Letter Frequency Analysis', description: 'Breaking monoalphabetic substitution using linguistic distributions.' },
      { slug: 'birthday-attack', title: 'Birthday Paradox & Hash Collisions', description: 'Probability metrics of hash collisions in 2^(N/2) space.' },
      { slug: 'avalanche-effect', title: 'Strict Avalanche Criterion (SAC)', description: 'Measuring bit-flip propagation in block ciphers.' }
    ],
    cipherItems: [
      { id: 'brute-force', name: 'Brute Force Attack', category: 'attacks', description: 'Exhaustive key search simulator.' },
      { id: 'birthday', name: 'Birthday Attack', category: 'attacks', description: 'Hash collision paradox simulator.' },
      { id: 'avalanche', name: 'Avalanche Effect Tester', category: 'attacks', description: 'Byte heatmap SAC measurement tool.' }
    ]
  },
  {
    id: 'master-cryptography',
    title: 'Master Cryptography Offline Pack',
    description: 'The ultimate offline bundle containing all ciphers, visualizer tools, documentation guides, reference cards, and code snippets.',
    category: 'all',
    difficulty: 'Advanced',
    version: '2.0.0',
    estimatedSize: '7.8 MB',
    sizeBytes: 8178892,
    itemCount: 22,
    icon: 'BookOpen',
    topics: ['All Classical Ciphers', 'All Symmetric Ciphers', 'All Asymmetric & PQC', 'All Hashes & KDFs', 'All Attack Simulators', 'Complete Documentation'],
    docItems: [
      { slug: 'getting-started', title: 'CryptoViz Architecture & Setup', description: 'Overview of visualization sandboxes, web worker architecture, and modular design.' },
      { slug: 'master-cheat-sheet', title: 'Master Cryptography Cheat Sheet', description: 'Formula summary cards, key size security estimators, and algorithm recommendations.' }
    ],
    cipherItems: [
      { id: 'master-collection', name: 'Complete CryptoViz Visualizers Suite', category: 'all', description: 'All 20+ interactive algorithm engines.' }
    ]
  }
];

export function getOfflinePackById(id: string): OfflinePack | undefined {
  return OFFLINE_PACKS.find(pack => pack.id === id);
}
