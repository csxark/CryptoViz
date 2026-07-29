export type QuestionNode = {
  type: 'question'
  id: string
  question: string
  description?: string
  options: {
    id: string
    label: string
    summary: string // Used for breadcrumbs
    nextId: string
  }[]
}

export type RecommendationNode = {
  type: 'recommendation'
  id: string
  cipherIds: string[]
  title: string
  rationale: string
  tradeOffs?: string
  commonMistakes?: string
}

export type DecisionNode = QuestionNode | RecommendationNode

export const ADVISOR_TREE: Record<string, DecisionNode> = {
  start: {
    type: 'question',
    id: 'start',
    question: 'What is your primary goal?',
    description: 'Select the cryptography operation that best describes your use case.',
    options: [
      {
        id: 'confidentiality',
        label: 'Hide data (Encryption)',
        summary: 'Goal: Encryption',
        nextId: 'q_encrypt_shared',
      },
      {
        id: 'integrity',
        label: 'Verify data / Signatures (Integrity & Auth)',
        summary: 'Goal: Integrity / Auth',
        nextId: 'q_integrity_type',
      },
      {
        id: 'key_exchange',
        label: 'Establish a shared secret (Key Exchange)',
        summary: 'Goal: Key Exchange',
        nextId: 'rec_key_exchange',
      },
    ],
  },
  
  // -- ENCRYPTION BRANCH --
  q_encrypt_shared: {
    type: 'question',
    id: 'q_encrypt_shared',
    question: 'Do the sender and receiver already share a secret key?',
    description: 'Symmetric encryption uses the same key for both encryption and decryption, while asymmetric uses a public/private key pair.',
    options: [
      {
        id: 'symmetric',
        label: 'Yes, we have a shared secret (Symmetric)',
        summary: 'Keys: Shared secret (Symmetric)',
        nextId: 'q_encrypt_aead',
      },
      {
        id: 'asymmetric',
        label: 'No, we only have public keys (Asymmetric / Hybrid)',
        summary: 'Keys: Public/Private (Asymmetric)',
        nextId: 'rec_asymmetric_enc',
      },
    ],
  },
  q_encrypt_aead: {
    type: 'question',
    id: 'q_encrypt_aead',
    question: 'Do you need to ensure the ciphertext wasn\'t tampered with?',
    description: 'Authenticated Encryption (AEAD) provides both confidentiality and data integrity, protecting against chosen-ciphertext attacks.',
    options: [
      {
        id: 'aead_yes',
        label: 'Yes, I need Authenticated Encryption (Recommended)',
        summary: 'Requires: Authenticated Encryption',
        nextId: 'q_encrypt_hw',
      },
      {
        id: 'aead_no',
        label: 'No, just confidentiality (e.g., legacy systems or full disk encryption)',
        summary: 'Requires: Confidentiality only',
        nextId: 'q_encrypt_legacy_fde',
      },
    ],
  },
  q_encrypt_hw: {
    type: 'question',
    id: 'q_encrypt_hw',
    question: 'Does your target platform have hardware acceleration for AES?',
    description: 'Most modern CPUs (x86_64, ARMv8) have AES instructions, but some IoT, older mobile devices, or software-only environments do not.',
    options: [
      {
        id: 'hw_yes',
        label: 'Yes, hardware AES is available',
        summary: 'Platform: Hardware AES available',
        nextId: 'rec_aes_gcm',
      },
      {
        id: 'hw_no',
        label: 'No, or I am unsure (Software only)',
        summary: 'Platform: Software only',
        nextId: 'rec_chacha20',
      },
    ],
  },
  q_encrypt_legacy_fde: {
    type: 'question',
    id: 'q_encrypt_legacy_fde',
    question: 'What is the specific use case for unauthenticated encryption?',
    options: [
      {
        id: 'fde',
        label: 'Full Disk or Sector Encryption',
        summary: 'Use case: Disk encryption',
        nextId: 'rec_aes_xts',
      },
      {
        id: 'legacy',
        label: 'Interoperating with a legacy system',
        summary: 'Use case: Legacy interop',
        nextId: 'rec_legacy_sym',
      },
    ],
  },

  // -- INTEGRITY BRANCH --
  q_integrity_type: {
    type: 'question',
    id: 'q_integrity_type',
    question: 'What are you trying to verify or authenticate?',
    options: [
      {
        id: 'hash_data',
        label: 'Verify file/data integrity without a key',
        summary: 'Type: File/Data hashing',
        nextId: 'rec_hash',
      },
      {
        id: 'mac',
        label: 'Authenticate a message with a shared secret',
        summary: 'Type: Message Authentication Code (MAC)',
        nextId: 'rec_mac',
      },
      {
        id: 'signature',
        label: 'Sign a document to prove authorship (Digital Signatures)',
        summary: 'Type: Digital Signatures',
        nextId: 'q_signature_curve',
      },
      {
        id: 'password',
        label: 'Store user passwords safely',
        summary: 'Type: Password Hashing',
        nextId: 'rec_password',
      },
    ],
  },
  q_signature_curve: {
    type: 'question',
    id: 'q_signature_curve',
    question: 'Do you need strict compatibility with existing standards like TLS/X.509, or are you building a modern protocol (like a cryptocurrency)?',
    options: [
      {
        id: 'standard_tls',
        label: 'Standard enterprise/TLS compatibility',
        summary: 'Requirements: Standard compatibility',
        nextId: 'rec_ecdsa',
      },
      {
        id: 'modern_schnorr',
        label: 'Modern protocol / Need signature aggregation',
        summary: 'Requirements: Modern / Aggregation',
        nextId: 'rec_schnorr',
      },
      {
        id: 'legacy_rsa',
        label: 'Legacy system requiring RSA',
        summary: 'Requirements: Legacy RSA',
        nextId: 'rec_rsa_sig',
      }
    ],
  },

  // -- RECOMMENDATIONS --
  
  // Encryption Recommendations
  rec_aes_gcm: {
    type: 'recommendation',
    id: 'rec_aes_gcm',
    cipherIds: ['aes'], // We don't have aes-gcm separately in the registry, wait... Let me check CIPHER_REGISTRY.
    // Actually we have aes, aes-ccm. Let's recommend aes and aes-ccm and mention GCM in rationale.
    title: 'Hardware-Accelerated AEAD',
    rationale: 'For modern platforms with AES-NI or ARM Crypto extensions, AES in Galois/Counter Mode (AES-GCM) or AES-CCM is the industry standard for Authenticated Encryption. It provides high performance and strong security guarantees.',
    tradeOffs: 'AES is exceptionally fast when hardware acceleration is available. However, in pure software implementations, it can be vulnerable to cache-timing side-channel attacks. AES-CCM is slightly slower than GCM but is often preferred in constrained environments (like IoT) due to smaller code size.',
    commonMistakes: 'Never reuse a nonce/IV with the same key. In GCM, nonce reuse instantly destroys the authentication key, completely breaking security.',
  },
  rec_chacha20: {
    type: 'recommendation',
    id: 'rec_chacha20',
    cipherIds: ['chacha20-poly1305'],
    title: 'Software-Optimized AEAD',
    rationale: 'ChaCha20-Poly1305 is the recommended standard for authenticated encryption when hardware AES acceleration is not guaranteed. It is widely used in TLS 1.3 and WireGuard.',
    tradeOffs: 'ChaCha20 is designed to be fast and naturally immune to timing attacks in software since it only uses addition, rotation, and XOR operations (ARX). It is slightly slower than hardware-accelerated AES, but vastly superior to software-only AES.',
    commonMistakes: 'Like all stream ciphers, reusing a nonce with the same key is catastrophic, completely exposing the plaintext. Ensure your nonce generation is robust.',
  },
  rec_asymmetric_enc: {
    type: 'recommendation',
    id: 'rec_asymmetric_enc',
    cipherIds: ['ecies', 'rsa'],
    title: 'Hybrid Encryption (Asymmetric)',
    rationale: 'Asymmetric encryption allows a sender to encrypt a message using only the recipient\'s public key. Because asymmetric math is slow and has strict size limits, it is typically used in a "hybrid" mode: the asymmetric cipher encrypts a random symmetric key, and the symmetric key encrypts the actual data.',
    tradeOffs: 'ECIES (using Elliptic Curves like X25519) is modern, extremely fast, and uses small 32-byte keys. RSA is the legacy standard; it requires massive keys (2048+ bits) to achieve the same security and is significantly slower. Choose ECIES unless legacy compatibility is strictly required.',
    commonMistakes: 'Never use raw RSA (textbook RSA) without proper padding (like OAEP). Never try to encrypt large files directly with an asymmetric primitive.',
  },
  rec_aes_xts: {
    type: 'recommendation',
    id: 'rec_aes_xts',
    cipherIds: ['aes-xts'],
    title: 'Disk and Sector Encryption',
    rationale: 'AES-XTS is a tweakable block cipher mode specifically designed for encrypting data at rest on block devices (like hard drives). The sector number is used as a "tweak" to ensure identical blocks of plaintext encrypt to different ciphertexts.',
    tradeOffs: 'XTS is designed for scenarios where data size cannot increase (e.g., 512-byte sectors must remain 512 bytes), meaning authentication tags (like in GCM) cannot be used. It provides confidentiality, but lacks data integrity verification.',
    commonMistakes: 'Do not use XTS for network communication or standard file encryption where data size can grow. It is strictly for block-level storage.',
  },
  rec_legacy_sym: {
    type: 'recommendation',
    id: 'rec_legacy_sym',
    cipherIds: ['3des', 'des'],
    title: 'Legacy Block Ciphers',
    rationale: 'If you must interoperate with a legacy system that does not support AES, you may be forced to use older algorithms like Triple DES (3DES).',
    tradeOffs: 'DES is completely broken and can be brute-forced in hours. 3DES is deprecated and extremely slow, with a small 64-bit block size making it vulnerable to collision attacks (Sweet32) on large datasets.',
    commonMistakes: 'These should never be used in new designs. If forced to use 3DES, limit the amount of data encrypted under a single key to mitigate collision attacks.',
  },

  // Integrity Recommendations
  rec_hash: {
    type: 'recommendation',
    id: 'rec_hash',
    cipherIds: ['sha256', 'sha512', 'sm3', 'blake2s'],
    title: 'Cryptographic Hashing',
    rationale: 'Cryptographic hash functions take arbitrary data and produce a fixed-size, unique fingerprint. They are used to verify that a file has not been accidentally corrupted or modified.',
    tradeOffs: 'SHA-256 and SHA-512 are the ubiquitous NIST standards. BLAKE2s/b often provides better software performance while maintaining high security. SM3 is required if operating under Chinese national standards.',
    commonMistakes: 'Do not use standard hashes (like SHA-256) for password storage—they are too fast and vulnerable to brute-force. Do not use deprecated hashes like MD5 or SHA-1, which are vulnerable to collision attacks.',
  },
  rec_mac: {
    type: 'recommendation',
    id: 'rec_mac',
    cipherIds: ['hmac', 'cmac'],
    title: 'Message Authentication Codes (MAC)',
    rationale: 'A MAC verifies both data integrity and authenticity. Only someone possessing the shared secret key can generate or verify the tag.',
    tradeOffs: 'HMAC is built on top of a hash function (like HMAC-SHA256) and is the most widely used standard. CMAC is built from a block cipher (like AES-CMAC) and is often used in constrained environments that already implement AES but lack a hash function.',
    commonMistakes: 'Always use a constant-time comparison when verifying MAC tags to prevent timing attacks. Do not attempt to build a custom MAC by simply hashing `key + data` (vulnerable to length-extension attacks).',
  },
  rec_password: {
    type: 'recommendation',
    id: 'rec_password',
    cipherIds: ['bcrypt'],
    title: 'Password Hashing',
    rationale: 'Password hashes must be intentionally slow (key stretching) to make brute-force and dictionary attacks economically unfeasible.',
    tradeOffs: 'Bcrypt is a battle-tested standard that is memory-hard and computationally slow. Argon2 (not currently in the registry) is the modern winner of the Password Hashing Competition. Never use fast hashes like SHA-256 for passwords.',
    commonMistakes: 'Always generate a unique, cryptographically secure random salt for every user. Hardcoding salts or skipping them completely breaks password security.',
  },
  
  // Signature Recommendations
  rec_ecdsa: {
    type: 'recommendation',
    id: 'rec_ecdsa',
    cipherIds: ['ecc', 'dsa'],
    title: 'Standard Digital Signatures',
    rationale: 'Digital signatures prove that a message was created by the owner of a private key. ECDSA (Elliptic Curve Digital Signature Algorithm) over NIST curves like P-256 is the standard used in TLS, X.509 certificates, and most modern web protocols.',
    tradeOffs: 'ECDSA provides equivalent security to RSA but with significantly smaller keys and signatures (e.g., 256 bits vs 2048 bits), resulting in less bandwidth overhead. However, signature verification is mathematically intensive.',
    commonMistakes: 'ECDSA absolutely requires a cryptographically secure, unpredictable random number (k) for every signature. If the same k is used twice, the private key can be instantly calculated.',
  },
  rec_schnorr: {
    type: 'recommendation',
    id: 'rec_schnorr',
    cipherIds: ['schnorr'],
    title: 'Modern / Aggregatable Signatures',
    rationale: 'Schnorr signatures (like BIP340) offer cleaner mathematical properties than ECDSA and are provably secure under simpler assumptions. They natively support signature aggregation (e.g., MuSig).',
    tradeOffs: 'Schnorr signatures are highly desirable in cryptocurrency protocols (like Bitcoin) where multi-signature transactions need to be indistinguishable from single signatures. They are not yet natively supported in legacy X.509/TLS ecosystems.',
    commonMistakes: 'As with ECDSA, poor randomness during signing can compromise the private key. Standardized deterministic nonce generation (RFC 6979) should be used.',
  },
  rec_rsa_sig: {
    type: 'recommendation',
    id: 'rec_rsa_sig',
    cipherIds: ['rsa'],
    title: 'Legacy Digital Signatures',
    rationale: 'RSA signatures (with proper padding like PSS) remain secure but are considered legacy due to their large key and signature sizes.',
    tradeOffs: 'RSA signature verification is extremely fast (often faster than ECDSA), but signing is slow. The main drawback is the massive size of the keys and signatures, which consumes significant bandwidth in protocols like TLS.',
    commonMistakes: 'Never use textbook RSA signing without proper padding (like RSA-PSS).',
  },

  // Key Exchange
  rec_key_exchange: {
    type: 'recommendation',
    id: 'rec_key_exchange',
    cipherIds: ['x448', 'dh'],
    title: 'Key Exchange Protocols',
    rationale: 'Key exchange allows two parties with no prior knowledge of each other to jointly establish a shared secret over an insecure channel. This secret is then used for symmetric encryption (like AES).',
    tradeOffs: 'Modern Elliptic Curve Diffie-Hellman (ECDH), such as X25519 or X448, is vastly superior in performance and key size compared to traditional finite-field Diffie-Hellman (DH).',
    commonMistakes: 'Standard Diffie-Hellman does not provide authentication. It is vulnerable to Man-in-the-Middle (MitM) attacks unless the exchanged public keys are authenticated (e.g., signed with ECDSA/RSA).',
  }
}
