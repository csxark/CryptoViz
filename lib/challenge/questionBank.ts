export type CipherCategory =
  | "classical"
  | "symmetric"
  | "asymmetric"
  | "hash"
  | "attacks";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  category: CipherCategory;
  difficulty: QuestionDifficulty;
  cipherId?: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
  hint: string;
  tags: string[];
}

/**
 * Practice Challenge question bank.
 *
 * The repository currently contains 67 curated questions.
 *
 * Keep this collection explicit and deterministic. Do not generate
 * questions programmatically here because the displayed question count
 * should always match the actual content available to learners.
 */
export const QUESTION_BANK: QuizQuestion[] = [
  // ===========================================================================
  // CLASSICAL CIPHERS
  // ===========================================================================

  {
    id: "clas-001",
    category: "classical",
    difficulty: "easy",
    cipherId: "caesar",
    question:
      'In a Caesar cipher with a key shift of 3, what letter does plaintext "A" encrypt to?',
    options: ["C", "D", "B", "E"],
    correctAnswer: 1,
    explanation:
      'Shifting "A" (0) by 3 positions gives "D" (3) in a 0-indexed alphabet.',
    hint: "Count 3 positions forward starting after A: B, C, D.",
    tags: ["caesar", "shift"],
  },

  {
    id: "clas-002",
    category: "classical",
    difficulty: "easy",
    cipherId: "rot13",
    question: "Why is ROT13 considered its own inverse function?",
    options: [
      "It uses XOR logic",
      "The English alphabet has 26 letters, and 13 is half of 26",
      "It uses prime number modular arithmetic",
      "It uses a symmetric secret key",
    ],
    correctAnswer: 1,
    explanation:
      "Applying a shift of 13 twice results in (13 + 13) mod 26 = 0, returning the original text.",
    hint: "Think about how many letters are in the English alphabet.",
    tags: ["rot13", "inverse"],
  },

  {
    id: "clas-003",
    category: "classical",
    difficulty: "easy",
    cipherId: "atbash",
    question: 'What is the ciphertext for "HELLO" using the Atbash cipher?',
    options: ["SVOOL", "OLLEH", "URLLO", "KVOOL"],
    correctAnswer: 0,
    explanation:
      "Atbash maps A->Z, B->Y, H->S, E->V, L->O, O->L, resulting in SVOOL.",
    hint:
      "Reverse each letter in the alphabet: H corresponds to S, E to V, L to O.",
    tags: ["atbash", "monoalphabetic"],
  },

  {
    id: "clas-004",
    category: "classical",
    difficulty: "easy",
    cipherId: "caesar",
    question:
      "How many maximum non-trivial unique keys exist for a standard Caesar cipher?",
    options: ["26", "25", "128", "52"],
    correctAnswer: 1,
    explanation:
      "There are 26 total shifts, but shift 0 leaves text unchanged, giving 25 non-trivial unique keys.",
    hint: "Exclude a shift of 0, which leaves the text unchanged.",
    tags: ["caesar", "keyspace"],
  },

  {
    id: "clas-005",
    category: "classical",
    difficulty: "medium",
    cipherId: "vigenere",
    question:
      "What type of cipher is the Vigenère cipher classified as?",
    options: [
      "Monoalphabetic substitution",
      "Polyalphabetic substitution",
      "Transposition cipher",
      "Stream cipher",
    ],
    correctAnswer: 1,
    explanation:
      "Vigenère uses multiple shift alphabets based on a repeating keyword, making it polyalphabetic.",
    hint:
      "The same plaintext letter can encrypt differently depending on its key position.",
    tags: ["vigenere", "polyalphabetic"],
  },

  {
    id: "clas-006",
    category: "classical",
    difficulty: "medium",
    cipherId: "vigenere",
    question:
      "Which cryptanalytic method was historically used to break the Vigenère cipher by finding key length?",
    options: [
      "Kasiski Examination",
      "Frequency Analysis on single letters",
      "Linear Cryptanalysis",
      "Differential Attack",
    ],
    correctAnswer: 0,
    explanation:
      "The Kasiski examination analyzes distances between repeated ciphertext n-grams to help determine key length.",
    hint:
      "The method is named after Friedrich Kasiski.",
    tags: ["vigenere", "kasiski", "cryptanalysis"],
  },

  {
    id: "clas-007",
    category: "classical",
    difficulty: "easy",
    cipherId: "railfence",
    question:
      "In a Rail Fence cipher with 2 rails, how is plaintext written before reading off the ciphertext?",
    options: [
      "In a 5x5 grid",
      "Zigzagging up and down across 2 rows",
      "In reverse order",
      "In columns of 4",
    ],
    correctAnswer: 1,
    explanation:
      "Rail Fence arranges text in a zigzag pattern across the selected rails and then reads each rail sequentially.",
    hint: "Think of the text moving between two horizontal rails.",
    tags: ["railfence", "transposition"],
  },

  {
    id: "clas-008",
    category: "classical",
    difficulty: "medium",
    cipherId: "playfair",
    question:
      "In the traditional Playfair cipher, what grid size is used for the alphabet?",
    options: ["4x4", "5x5", "6x6", "3x3"],
    correctAnswer: 1,
    explanation:
      "Playfair traditionally uses a 5x5 matrix, combining I and J into one cell.",
    hint: "5x5 gives 25 cells.",
    tags: ["playfair", "digraph"],
  },

  {
    id: "clas-009",
    category: "classical",
    difficulty: "medium",
    cipherId: "playfair",
    question:
      'How does Playfair handle a plaintext digram containing two identical letters, such as "LL"?',
    options: [
      "Replaces them with numbers",
      "Inserts a filler letter like X between them",
      "Ignores the second letter",
      "Swaps their order",
    ],
    correctAnswer: 1,
    explanation:
      "Identical letters cannot form one Playfair digram, so a filler such as X is inserted between them.",
    hint: "A filler character separates repeated letters.",
    tags: ["playfair", "digram"],
  },

  {
    id: "clas-010",
    category: "classical",
    difficulty: "hard",
    cipherId: "enigma",
    question:
      "What fundamental invariant in the German Enigma machine helped cryptanalysts?",
    options: [
      "A letter could encrypt to itself",
      "A letter could never encrypt to itself",
      "The key length was limited to 8 bits",
      "Rotors stepped backwards",
    ],
    correctAnswer: 1,
    explanation:
      "The Enigma reflector arrangement meant that a letter could not encrypt to itself under the machine's reciprocal transformation.",
    hint: "Consider what the reflector prevents.",
    tags: ["enigma", "reflector", "invariant"],
  },

  {
    id: "clas-011",
    category: "classical",
    difficulty: "easy",
    cipherId: "affine",
    question:
      'The Affine cipher encrypts x using E(x) = (ax + b) mod 26. What condition must "a" satisfy?',
    options: [
      '"a" must be even',
      '"a" must be coprime to 26',
      '"a" must be a prime number greater than 26',
      '"a" must equal "b"',
    ],
    correctAnswer: 1,
    explanation:
      "The multiplier must have a modular inverse modulo 26, which requires gcd(a, 26) = 1.",
    hint: "Decryption requires a modular multiplicative inverse.",
    tags: ["affine", "modular-arithmetic"],
  },

  {
    id: "clas-012",
    category: "classical",
    difficulty: "medium",
    cipherId: "bacon",
    question:
      "What type of encoding does the Baconian cipher traditionally use?",
    options: [
      "5-character sequences of A and B",
      "Hexadecimal strings",
      "Morse code dots and dashes",
      "Prime numbers",
    ],
    correctAnswer: 0,
    explanation:
      "The traditional Baconian cipher represents letters using five-character sequences composed of two symbols, commonly A and B.",
    hint: "Think binary-like groups of five symbols.",
    tags: ["bacon", "steganography"],
  },

  {
    id: "clas-013",
    category: "classical",
    difficulty: "easy",
    cipherId: "caesar",
    question:
      "What mathematical operation primarily defines a Caesar cipher?",
    options: [
      "Addition modulo the alphabet size",
      "Integer factorization",
      "Elliptic curve multiplication",
      "Cryptographic hashing",
    ],
    correctAnswer: 0,
    explanation:
      "A Caesar cipher shifts alphabet positions using modular addition.",
    hint: "A letter position is shifted by a fixed amount.",
    tags: ["caesar", "modular-arithmetic"],
  },

  {
    id: "clas-014",
    category: "classical",
    difficulty: "medium",
    cipherId: "vigenere",
    question:
      "What major weakness does a repeating-key Vigenère cipher have when enough ciphertext is available?",
    options: [
      "The key schedule uses AES",
      "Repeated key periods can reveal the key length",
      "It cannot encrypt alphabetic text",
      "It always produces identical ciphertext for every message",
    ],
    correctAnswer: 1,
    explanation:
      "Repeated key periods create statistical patterns that can help an attacker estimate the key length.",
    hint: "Look for repeating structures in ciphertext.",
    tags: ["vigenere", "cryptanalysis", "key-length"],
  },

  // ===========================================================================
  // SYMMETRIC CRYPTOGRAPHY
  // ===========================================================================

  {
    id: "sym-001",
    category: "symmetric",
    difficulty: "easy",
    cipherId: "aes",
    question:
      "What is the block size of the Advanced Encryption Standard (AES)?",
    options: ["64 bits", "128 bits", "256 bits", "512 bits"],
    correctAnswer: 1,
    explanation:
      "AES always operates on 128-bit blocks regardless of whether the key is 128, 192, or 256 bits.",
    hint: "AES processes a 4x4 matrix of bytes.",
    tags: ["aes", "block-size"],
  },

  {
    id: "sym-002",
    category: "symmetric",
    difficulty: "easy",
    cipherId: "aes",
    question: "How many rounds does AES-128 perform during encryption?",
    options: ["8 rounds", "10 rounds", "12 rounds", "14 rounds"],
    correctAnswer: 1,
    explanation:
      "AES-128 uses 10 rounds. AES-192 uses 12 and AES-256 uses 14.",
    hint: "Remember the 128/192/256-bit AES round counts.",
    tags: ["aes", "rounds"],
  },

  {
    id: "sym-003",
    category: "symmetric",
    difficulty: "easy",
    cipherId: "des",
    question:
      "What is the key length and effective security strength of original DES?",
    options: [
      "64-bit key, 56-bit effective strength",
      "128-bit key, 128-bit strength",
      "56-bit key, 64-bit strength",
      "32-bit key, 32-bit strength",
    ],
    correctAnswer: 0,
    explanation:
      "DES accepts a 64-bit key containing 8 parity bits, leaving 56 effective key bits.",
    hint: "Eight bits are used for parity.",
    tags: ["des", "key-size"],
  },

  {
    id: "sym-004",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "aes",
    question:
      "Which transformation step in AES provides non-linearity?",
    options: ["ShiftRows", "SubBytes", "MixColumns", "AddRoundKey"],
    correctAnswer: 1,
    explanation:
      "SubBytes applies a nonlinear S-box transformation to every state byte.",
    hint: "S-boxes provide the main nonlinear component.",
    tags: ["aes", "subbytes", "non-linearity"],
  },

  {
    id: "sym-005",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "modes",
    question:
      "Why is ECB mode unsafe for encrypting structured data such as images?",
    options: [
      "It requires a 512-bit key",
      "Identical plaintext blocks encrypt to identical ciphertext blocks",
      "It cannot process odd-length strings",
      "It corrupts key bytes during transmission",
    ],
    correctAnswer: 1,
    explanation:
      "ECB independently encrypts each block, so identical plaintext blocks produce identical ciphertext blocks and can reveal patterns.",
    hint: "ECB does not hide repeated plaintext block patterns.",
    tags: ["ecb", "modes", "leakage"],
  },

  {
    id: "sym-006",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "modes",
    question:
      "Which block cipher mode converts a block cipher into a stream-like construction using a counter?",
    options: ["CBC", "ECB", "CTR", "OFB"],
    correctAnswer: 2,
    explanation:
      "CTR mode encrypts successive counter values to create a keystream that is XORed with plaintext.",
    hint: "The name refers to a counter value.",
    tags: ["ctr", "modes", "keystream"],
  },

  {
    id: "sym-007",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "chacha20",
    question: "ChaCha20 is classified as what type of cipher?",
    options: [
      "Feistel block cipher",
      "Stream cipher based on ARX operations",
      "Asymmetric trapdoor cipher",
      "Hash-based MAC",
    ],
    correctAnswer: 1,
    explanation:
      "ChaCha20 is a stream cipher built around addition, rotation, and XOR operations.",
    hint: "ARX stands for Addition-Rotation-XOR.",
    tags: ["chacha20", "stream-cipher", "arx"],
  },

  {
    id: "sym-008",
    category: "symmetric",
    difficulty: "hard",
    cipherId: "aes-gcm",
    question:
      "What security properties does AES-GCM provide?",
    options: [
      "Confidentiality and authenticated encryption",
      "Public-key signatures and zero-knowledge proofs",
      "Compression and quantum resistance",
      "Non-repudiation and certificate issuance",
    ],
    correctAnswer: 0,
    explanation:
      "AES-GCM combines encryption with authentication, providing AEAD security.",
    hint: "GCM is an AEAD mode.",
    tags: ["gcm", "aead", "authentication"],
  },

  {
    id: "sym-009",
    category: "symmetric",
    difficulty: "hard",
    cipherId: "3des",
    question:
      "Why is two-key Triple-DES vulnerable to a Meet-in-the-Middle attack?",
    options: [
      "The attack reduces the effective work factor compared with the nominal key space",
      "It eliminates DES parity bits",
      "It allows instant recovery without computation",
      "It causes a round-key collision",
    ],
    correctAnswer: 0,
    explanation:
      "Meet-in-the-Middle attacks exploit the intermediate state between encryption stages to reduce the search effort.",
    hint: "The attacker works from both the plaintext and ciphertext sides.",
    tags: ["3des", "meet-in-the-middle", "cryptanalysis"],
  },

  {
    id: "sym-010",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "padding",
    question:
      "In PKCS#7 padding, if 3 bytes of padding are required, what byte value is appended three times?",
    options: ["0x00", "0x03", "0x08", "0xFF"],
    correctAnswer: 1,
    explanation:
      "PKCS#7 uses the number of padding bytes as the value of each padding byte.",
    hint: "The padding length and padding byte value are both 3.",
    tags: ["padding", "pkcs7"],
  },

  {
    id: "sym-011",
    category: "symmetric",
    difficulty: "easy",
    cipherId: "aes",
    question: "Which AES key size is valid?",
    options: ["96 bits", "128 bits", "160 bits", "224 bits"],
    correctAnswer: 1,
    explanation:
      "AES supports 128-bit, 192-bit, and 256-bit keys.",
    hint: "AES has three standardized key lengths.",
    tags: ["aes", "key-size"],
  },

  {
    id: "sym-012",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "cbc",
    question: "What does CBC mode require in addition to the encryption key?",
    options: [
      "An initialization vector",
      "A public signing key",
      "A password database",
      "A hash collision",
    ],
    correctAnswer: 0,
    explanation:
      "CBC encryption uses an initialization vector for the first plaintext block.",
    hint: "The first block needs a starting value.",
    tags: ["cbc", "iv", "modes"],
  },

  {
    id: "sym-013",
    category: "symmetric",
    difficulty: "hard",
    cipherId: "aes-gcm",
    question:
      "Why is nonce reuse dangerous with AES-GCM?",
    options: [
      "It can compromise confidentiality and authentication security",
      "It changes AES into DES",
      "It disables the AES S-box",
      "It makes ciphertext plaintext",
    ],
    correctAnswer: 0,
    explanation:
      "Reusing a nonce with the same GCM key can expose relationships between plaintexts and can seriously compromise authentication.",
    hint: "GCM requires nonce uniqueness for a given key.",
    tags: ["gcm", "nonce-reuse", "aead"],
  },

  {
    id: "sym-014",
    category: "symmetric",
    difficulty: "easy",
    cipherId: "des",
    question: "How many Feistel rounds does standard DES use?",
    options: ["8", "12", "16", "32"],
    correctAnswer: 2,
    explanation:
      "DES uses a 16-round Feistel structure.",
    hint: "DES is commonly described as a 16-round Feistel cipher.",
    tags: ["des", "feistel", "rounds"],
  },

  // ===========================================================================
  // ASYMMETRIC CRYPTOGRAPHY
  // ===========================================================================

  {
    id: "asym-001",
    category: "asymmetric",
    difficulty: "easy",
    cipherId: "rsa",
    question:
      "The mathematical difficulty of breaking RSA encryption relies primarily on what computational problem?",
    options: [
      "Discrete Logarithm Problem",
      "Integer Factorization of large prime products",
      "Lattice Shortest Vector Problem",
      "Elliptic Curve Point Addition",
    ],
    correctAnswer: 1,
    explanation:
      "Classical RSA security is associated with the difficulty of factoring a large composite modulus.",
    hint: "RSA's modulus is formed by multiplying large primes.",
    tags: ["rsa", "factoring", "math"],
  },

  {
    id: "asym-002",
    category: "asymmetric",
    difficulty: "easy",
    cipherId: "diffie-hellman",
    question: "What is the primary purpose of Diffie-Hellman?",
    options: [
      "Bulk data encryption",
      "Secure key exchange over an insecure channel",
      "Digital document signing",
      "Password hashing",
    ],
    correctAnswer: 1,
    explanation:
      "Diffie-Hellman allows parties to establish a shared secret over a public communication channel.",
    hint: "It establishes a shared secret rather than directly encrypting application data.",
    tags: ["diffie-hellman", "key-exchange"],
  },

  {
    id: "asym-003",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "ecc",
    question:
      "Why can ECC achieve strong security with significantly smaller keys than RSA?",
    options: [
      "The elliptic-curve discrete logarithm problem provides a different security-to-key-size tradeoff",
      "ECC uses 512-bit blocks",
      "ECC replaces cryptography with compression",
      "RSA keys contain CRC bytes",
    ],
    correctAnswer: 0,
    explanation:
      "Elliptic-curve cryptography provides strong security at smaller key sizes because of the computational hardness of the underlying elliptic-curve problem.",
    hint: "Compare the security assumptions behind ECC and RSA.",
    tags: ["ecc", "key-size", "ecdlp"],
  },

  {
    id: "asym-004",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "rsa",
    question:
      "For RSA N = p × q where p and q are distinct primes, what is φ(N)?",
    options: [
      "(p + 1)(q + 1)",
      "(p - 1)(q - 1)",
      "p × q - 1",
      "(p²)(q²)",
    ],
    correctAnswer: 1,
    explanation:
      "For two distinct primes p and q, Euler's totient is φ(N) = (p - 1)(q - 1).",
    hint: "Use the totient formula for a product of distinct primes.",
    tags: ["rsa", "totient", "math"],
  },

  {
    id: "asym-005",
    category: "asymmetric",
    difficulty: "hard",
    cipherId: "ecdsa",
    question:
      "What catastrophic security failure can occur if the same ECDSA nonce k is reused?",
    options: [
      "The signature becomes invalid",
      "The signer's private key can be recovered",
      "The generator point changes",
      "The public key is deleted",
    ],
    correctAnswer: 1,
    explanation:
      "Nonce reuse creates equations involving the same secret nonce and can allow recovery of the private signing key.",
    hint: "ECDSA requires secure, unique nonce generation.",
    tags: ["ecdsa", "nonce-reuse", "signatures"],
  },

  {
    id: "asym-006",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "post-quantum",
    question:
      "Which NIST-standardized post-quantum algorithm is specified as ML-KEM?",
    options: [
      "CRYSTALS-Kyber",
      "CRYSTALS-Dilithium",
      "SPHINCS+",
      "FALCON",
    ],
    correctAnswer: 0,
    explanation:
      "ML-KEM is the standardized key-encapsulation mechanism derived from Kyber.",
    hint: "ML-KEM is based on the Kyber design.",
    tags: ["pqc", "kyber", "ml-kem", "lattice"],
  },

  {
    id: "asym-007",
    category: "asymmetric",
    difficulty: "easy",
    cipherId: "rsa",
    question: "Which RSA key is normally used to verify a digital signature?",
    options: [
      "The signer's public key",
      "The signer's private key",
      "A shared AES key",
      "The TLS session nonce",
    ],
    correctAnswer: 0,
    explanation:
      "A verifier uses the signer's public key to verify a signature created with the corresponding private key.",
    hint: "Public keys are distributed for verification.",
    tags: ["rsa", "digital-signature", "public-key"],
  },

  {
    id: "asym-008",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "diffie-hellman",
    question:
      "What major security property does authenticated Diffie-Hellman help provide?",
    options: [
      "Protection against an active man-in-the-middle attacker",
      "Password hashing",
      "Data compression",
      "Block padding",
    ],
    correctAnswer: 0,
    explanation:
      "Plain Diffie-Hellman does not authenticate participants; authentication binds the exchanged keys to the intended parties.",
    hint: "Ask what happens if an attacker can impersonate both endpoints.",
    tags: ["diffie-hellman", "authentication", "mitm"],
  },

  {
    id: "asym-009",
    category: "asymmetric",
    difficulty: "hard",
    cipherId: "rsa",
    question:
      "Why should textbook RSA encryption not be used directly for application messages?",
    options: [
      "It is deterministic and lacks appropriate padding security",
      "RSA cannot represent numbers",
      "RSA only works with passwords",
      "RSA requires a symmetric key for every character",
    ],
    correctAnswer: 0,
    explanation:
      "Raw textbook RSA is deterministic and does not provide the security properties required for secure randomized encryption.",
    hint: "Modern RSA encryption uses a standardized padding scheme.",
    tags: ["rsa", "padding", "oaep"],
  },

  {
    id: "asym-010",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "ecc",
    question:
      "What operation is repeatedly used in elliptic-curve public-key cryptography?",
    options: [
      "Scalar multiplication of a curve point",
      "AES MixColumns",
      "SHA-256 padding",
      "Base64 encoding",
    ],
    correctAnswer: 0,
    explanation:
      "ECC systems commonly compute scalar multiples such as dG, where d is a scalar and G is a curve point.",
    hint: "Think about multiplying a point by a secret integer.",
    tags: ["ecc", "scalar-multiplication"],
  },

  // ===========================================================================
  // HASH FUNCTIONS AND KDFs
  // ===========================================================================

  {
    id: "hash-001",
    category: "hash",
    difficulty: "easy",
    cipherId: "sha256",
    question:
      "What is the output length of SHA-256?",
    options: [
      "128 bits (16 bytes)",
      "256 bits (32 bytes)",
      "512 bits (64 bytes)",
      "160 bits (20 bytes)",
    ],
    correctAnswer: 1,
    explanation:
      "SHA-256 produces a fixed 256-bit, or 32-byte, digest.",
    hint: "Divide 256 bits by 8 to get bytes.",
    tags: ["sha256", "hash-length"],
  },

  {
    id: "hash-002",
    category: "hash",
    difficulty: "easy",
    cipherId: "hash-properties",
    question:
      "What property makes finding two distinct inputs with the same hash computationally infeasible?",
    options: [
      "Pre-image resistance",
      "Second pre-image resistance",
      "Collision resistance",
      "Avalanche resistance",
    ],
    correctAnswer: 2,
    explanation:
      "Collision resistance concerns finding any two distinct inputs x and y such that H(x) = H(y).",
    hint: "The attacker chooses both messages.",
    tags: ["hash", "collision-resistance"],
  },

  {
    id: "hash-003",
    category: "hash",
    difficulty: "medium",
    cipherId: "hmac",
    question:
      "Why is HMAC preferable to simply computing H(K || M) with a Merkle-Damgård hash?",
    options: [
      "Simple keyed concatenation can be vulnerable to length-extension attacks",
      "Concatenation causes division by zero",
      "HMAC automatically doubles the key size",
      "Simple concatenation only works with ASCII",
    ],
    correctAnswer: 0,
    explanation:
      "A naive construction using H(K || M) can expose a length-extension vulnerability with certain hash designs. HMAC uses nested keyed hashing.",
    hint: "Think about Merkle-Damgård length extension.",
    tags: ["hmac", "length-extension"],
  },

  {
    id: "hash-004",
    category: "hash",
    difficulty: "medium",
    cipherId: "argon2id",
    question:
      "Why is Argon2id recommended for password storage instead of a fast hash such as SHA-256?",
    options: [
      "Argon2id uses shorter output digests",
      "Argon2id is memory-hard and makes large-scale password guessing more expensive",
      "SHA-256 cannot process salts",
      "Argon2id only runs on microcontrollers",
    ],
    correctAnswer: 1,
    explanation:
      "Argon2id can be configured to consume substantial memory and computation, increasing the cost of password cracking.",
    hint: "Password hashing should deliberately be expensive.",
    tags: ["argon2id", "kdf", "memory-hard"],
  },

  {
    id: "hash-005",
    category: "hash",
    difficulty: "hard",
    cipherId: "keccak",
    question:
      "What construction does SHA-3 / Keccak use?",
    options: [
      "Feistel Network",
      "Sponge Construction",
      "Substitution-Permutation Network",
      "Galois Counter Network",
    ],
    correctAnswer: 1,
    explanation:
      "Keccak uses a sponge construction with absorbing and squeezing phases around the Keccak-f permutation.",
    hint: "Think about absorbing input and squeezing output.",
    tags: ["sha3", "keccak", "sponge"],
  },

  {
    id: "hash-006",
    category: "hash",
    difficulty: "easy",
    cipherId: "sha256",
    question:
      "Which property means that a tiny change in the input should substantially change the resulting hash?",
    options: [
      "Avalanche effect",
      "Key exchange",
      "Forward secrecy",
      "Padding oracle",
    ],
    correctAnswer: 0,
    explanation:
      "The avalanche effect describes the significant change in output caused by a small input change.",
    hint: "One changed input bit should affect many output bits.",
    tags: ["sha256", "avalanche"],
  },

  {
    id: "hash-007",
    category: "hash",
    difficulty: "medium",
    cipherId: "pbkdf2",
    question: "What is the main purpose of PBKDF2?",
    options: [
      "Deriving cryptographic keys from passwords",
      "Encrypting network packets directly",
      "Generating RSA primes",
      "Compressing files",
    ],
    correctAnswer: 0,
    explanation:
      "PBKDF2 applies an expensive repeated pseudorandom-function computation to derive keys from passwords.",
    hint: "The name includes Password-Based Key Derivation.",
    tags: ["pbkdf2", "kdf", "passwords"],
  },

  {
    id: "hash-008",
    category: "hash",
    difficulty: "medium",
    cipherId: "hmac",
    question: "What additional input does HMAC require besides the message?",
    options: [
      "A secret key",
      "An RSA modulus",
      "A public certificate",
      "A compression dictionary",
    ],
    correctAnswer: 0,
    explanation:
      "HMAC combines a cryptographic hash with a shared secret key to authenticate messages.",
    hint: "The K in HMAC refers to a key.",
    tags: ["hmac", "mac", "authentication"],
  },

  // ===========================================================================
  // ATTACKS AND SECURITY
  // ===========================================================================

  {
    id: "atk-001",
    category: "attacks",
    difficulty: "easy",
    cipherId: "padding-oracle",
    question:
      "What information does a Padding Oracle vulnerability leak to an attacker?",
    options: [
      "Server CPU clock speed",
      "Whether decrypted ciphertext yields valid CBC padding",
      "The server's private IP address",
      "The TLS certificate length",
    ],
    correctAnswer: 1,
    explanation:
      "Different responses to valid and invalid padding can provide an attacker with an oracle for decrypting CBC ciphertext.",
    hint: "The attack relies on distinguishing padding errors.",
    tags: ["padding-oracle", "cbc", "attacks"],
  },

  {
    id: "atk-002",
    category: "attacks",
    difficulty: "medium",
    cipherId: "replay",
    question:
      "What cryptographic countermeasure helps prevent replay attacks?",
    options: [
      "Increasing key length alone",
      "Including unique nonces or timestamps in authenticated messages",
      "Using Base64 encoding",
      "Encrypting twice with AES",
    ],
    correctAnswer: 1,
    explanation:
      "Freshness mechanisms such as nonces, sequence numbers, or timestamps can prevent previously valid messages from being accepted again.",
    hint: "The receiver needs a way to detect an old message.",
    tags: ["replay-attack", "nonce", "countermeasure"],
  },

  {
    id: "atk-003",
    category: "attacks",
    difficulty: "hard",
    cipherId: "side-channel",
    question:
      "How can timing side-channel attacks leak secret information during comparisons?",
    options: [
      "By reading GPU RAM directly",
      "By measuring execution-time differences caused by early comparison failures",
      "By sending corrupted packets",
      "By forcing process crashes",
    ],
    correctAnswer: 1,
    explanation:
      "A non-constant-time comparison may return earlier for an incorrect prefix, creating measurable timing differences.",
    hint: "Different execution paths can reveal information.",
    tags: ["side-channel", "timing-attack", "constant-time"],
  },

  {
    id: "atk-004",
    category: "attacks",
    difficulty: "medium",
    cipherId: "birthday-attack",
    question:
      "Approximately how many evaluations are needed to find a collision in an ideal N-bit hash function?",
    options: ["2^N", "2^(N/2)", "N^2", "2 × N"],
    correctAnswer: 1,
    explanation:
      "The birthday bound means collision searches require roughly 2^(N/2) evaluations for an ideal N-bit hash.",
    hint: "The collision complexity is approximately half the hash's bit length in the exponent.",
    tags: ["birthday-attack", "collisions", "complexity"],
  },

  {
    id: "atk-005",
    category: "attacks",
    difficulty: "medium",
    cipherId: "mitm",
    question:
      "What is the defining characteristic of a man-in-the-middle attack?",
    options: [
      "An attacker secretly intercepts and potentially alters communication between parties",
      "An attacker only guesses passwords offline",
      "An attacker replaces AES with DES",
      "An attacker changes hash output length",
    ],
    correctAnswer: 0,
    explanation:
      "A MITM attacker positions themselves between communicating parties and can relay or manipulate messages.",
    hint: "The attacker sits between the two endpoints.",
    tags: ["mitm", "authentication", "network"],
  },

  {
    id: "atk-006",
    category: "attacks",
    difficulty: "easy",
    cipherId: "brute-force",
    question:
      "What does a brute-force attack attempt to do?",
    options: [
      "Try possible keys or passwords until the correct one is found",
      "Find a mathematical proof of security",
      "Compress the ciphertext",
      "Replace a hash with Base64",
    ],
    correctAnswer: 0,
    explanation:
      "Brute force systematically tests candidate secrets until one produces the expected result.",
    hint: "The attacker searches the possible key space.",
    tags: ["brute-force", "keyspace", "passwords"],
  },

  {
    id: "atk-007",
    category: "attacks",
    difficulty: "medium",
    cipherId: "nonce-reuse",
    question:
      "Why is nonce reuse dangerous for stream-cipher-style encryption?",
    options: [
      "Reusing the same keystream can expose relationships between plaintexts",
      "It increases the block size",
      "It makes the key public immediately",
      "It disables authentication certificates",
    ],
    correctAnswer: 0,
    explanation:
      "If the same keystream is reused, XOR relationships between ciphertexts can reveal relationships between their plaintexts.",
    hint: "Never reuse a keystream under the same secret key.",
    tags: ["nonce-reuse", "stream-cipher", "keystream"],
  },

  {
    id: "atk-008",
    category: "attacks",
    difficulty: "hard",
    cipherId: "chosen-plaintext",
    question: "What is a chosen-plaintext attack?",
    options: [
      "The attacker can obtain ciphertexts for plaintexts of their choice",
      "The attacker only observes encrypted traffic",
      "The attacker steals a private key from memory",
      "The attacker randomly changes passwords",
    ],
    correctAnswer: 0,
    explanation:
      "In a chosen-plaintext attack, the adversary can submit selected plaintexts and observe the corresponding cryptographic outputs.",
    hint: "The attacker controls the input to the encryption process.",
    tags: ["chosen-plaintext", "cryptanalysis"],
  },

  {
    id: "atk-009",
    category: "attacks",
    difficulty: "medium",
    cipherId: "dictionary",
    question:
      "What distinguishes a dictionary attack from a pure exhaustive brute-force attack?",
    options: [
      "It prioritizes likely passwords or words from a prepared list",
      "It requires quantum computing",
      "It only targets encrypted images",
      "It modifies the encryption algorithm",
    ],
    correctAnswer: 0,
    explanation:
      "Dictionary attacks use lists of likely passwords, words, patterns, and previously observed credentials.",
    hint: "The attacker uses likely candidates instead of every possible string.",
    tags: ["dictionary-attack", "passwords", "brute-force"],
  },

  {
    id: "atk-010",
    category: "attacks",
    difficulty: "hard",
    cipherId: "length-extension",
    question:
      "Which type of hash construction is historically associated with length-extension vulnerabilities?",
    options: [
      "Merkle-Damgård constructions",
      "One-time pads",
      "Elliptic curves",
      "Feistel networks",
    ],
    correctAnswer: 0,
    explanation:
      "Certain Merkle-Damgård hash designs expose an internal chaining state that can enable length-extension attacks.",
    hint: "HMAC was designed in part to avoid naive keyed-hash constructions suffering from this problem.",
    tags: ["length-extension", "merkle-damgard", "hash"],
  },

  {
    id: "atk-011",
    category: "attacks",
    difficulty: "easy",
    cipherId: "frequency-analysis",
    question:
      "Why is frequency analysis effective against many simple substitution ciphers?",
    options: [
      "Language preserves statistical patterns in symbol frequencies",
      "Substitution ciphers use public RSA keys",
      "The ciphertext always contains the plaintext",
      "The cipher automatically reveals its key",
    ],
    correctAnswer: 0,
    explanation:
      "Simple substitution preserves frequency relationships between plaintext letters, allowing statistical analysis.",
    hint: "Common letters remain common after substitution.",
    tags: ["frequency-analysis", "classical", "cryptanalysis"],
  },

  {
    id: "atk-012",
    category: "attacks",
    difficulty: "medium",
    cipherId: "downgrade",
    question:
      "What is the goal of a cryptographic downgrade attack?",
    options: [
      "Force communication to use a weaker protocol or algorithm",
      "Increase the encryption key size",
      "Replace a hash with a stronger hash",
      "Add additional authentication",
    ],
    correctAnswer: 0,
    explanation:
      "Downgrade attacks attempt to make endpoints select weaker security options that are easier to attack.",
    hint: "The attacker wants the connection to move backward to weaker security.",
    tags: ["downgrade", "protocol", "security"],
  },

  {
    id: "atk-013",
    category: "attacks",
    difficulty: "hard",
    cipherId: "chosen-ciphertext",
    question: "What is a chosen-ciphertext attack?",
    options: [
      "The attacker can submit selected ciphertexts and observe decryptions or related responses",
      "The attacker only chooses plaintext before encryption",
      "The attacker guesses a hash collision",
      "The attacker changes a certificate's expiration date",
    ],
    correctAnswer: 0,
    explanation:
      "A chosen-ciphertext adversary obtains information by submitting selected ciphertexts to a decryption interface or oracle.",
    hint: "The attacker controls ciphertext inputs to a decryption process.",
    tags: ["chosen-ciphertext", "cryptanalysis", "oracle"],
  },

  {
    id: "atk-014",
    category: "attacks",
    difficulty: "medium",
    cipherId: "nonce-reuse",
    question:
      "What is a primary defense against nonce-reuse vulnerabilities?",
    options: [
      "Use a construction and nonce-generation strategy that guarantees required nonce uniqueness",
      "Encode every nonce using Base64",
      "Use a longer username",
      "Disable message authentication",
    ],
    correctAnswer: 0,
    explanation:
      "Protocols must ensure nonce uniqueness whenever their security construction requires it.",
    hint: "Encoding does not make a repeated nonce unique.",
    tags: ["nonce", "nonce-reuse", "countermeasure"],
  },

  // ===========================================================================
  // FINAL QUESTIONS — CROSS-CATEGORY
  // ===========================================================================

  {
    id: "cross-001",
    category: "classical",
    difficulty: "medium",
    cipherId: "hill",
    question:
      "What mathematical structure does the Hill cipher use to transform blocks of plaintext?",
    options: [
      "Matrix multiplication modulo the alphabet size",
      "Elliptic-curve scalar multiplication",
      "SHA-3 sponge permutations",
      "RSA modular exponentiation",
    ],
    correctAnswer: 0,
    explanation:
      "The Hill cipher represents plaintext blocks as vectors and multiplies them by an invertible key matrix modulo the alphabet size.",
    hint: "Think linear algebra over modular arithmetic.",
    tags: ["hill", "matrix", "classical"],
  },

  {
    id: "cross-002",
    category: "symmetric",
    difficulty: "medium",
    cipherId: "twofish",
    question:
      "What block size does Twofish use?",
    options: ["64 bits", "128 bits", "192 bits", "256 bits"],
    correctAnswer: 1,
    explanation:
      "Twofish is a symmetric block cipher with a 128-bit block size.",
    hint: "Twofish was one of the AES finalists.",
    tags: ["twofish", "block-size", "symmetric"],
  },

  {
    id: "cross-003",
    category: "asymmetric",
    difficulty: "medium",
    cipherId: "ecdsa",
    question:
      "What is the primary purpose of ECDSA?",
    options: [
      "Digital signatures",
      "Password hashing",
      "Bulk file compression",
      "Block cipher padding",
    ],
    correctAnswer: 0,
    explanation:
      "ECDSA is an elliptic-curve digital signature algorithm used to create and verify signatures.",
    hint: "The S in ECDSA refers to signatures.",
    tags: ["ecdsa", "digital-signature", "ecc"],
  },

  {
    id: "cross-004",
    category: "hash",
    difficulty: "easy",
    cipherId: "sha256",
    question:
      "Which statement about SHA-256 is correct?",
    options: [
      "It produces a fixed 256-bit digest",
      "It uses a 256-bit secret key for encryption",
      "It can be decrypted with a private key",
      "It produces a variable-length digest based on the input",
    ],
    correctAnswer: 0,
    explanation:
      "SHA-256 maps arbitrary-length input to a fixed 256-bit digest.",
    hint: "The number in SHA-256 describes the digest size.",
    tags: ["sha256", "digest", "hash"],
  },

  {
    id: "cross-005",
    category: "attacks",
    difficulty: "easy",
    cipherId: "mitm",
    question:
      "Which security property is especially important for preventing an unauthenticated man-in-the-middle attack?",
    options: [
      "Authentication",
      "Compression",
      "Larger screen resolution",
      "Base64 encoding",
    ],
    correctAnswer: 0,
    explanation:
      "Authentication allows communicating parties to establish who they are communicating with rather than blindly trusting an intercepted exchange.",
    hint: "Encryption alone does not necessarily identify the other endpoint.",
    tags: ["mitm", "authentication", "security"],
  },
];

/**
 * The question bank is intentionally explicit and static.
 *
 * Keeping the assertion close to the source data makes accidental changes
 * to the repository's advertised question volume easier to detect during
 * development and testing.
 */
if (QUESTION_BANK.length !== 67) {
  throw new Error(
    `Practice Challenge question bank must contain exactly 67 questions; found ${QUESTION_BANK.length}.`,
  );
}