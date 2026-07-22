export type DocType = 'general' | 'cipher';

export interface BaseCategory {
  title: string;
  description: string;
  type?: DocType;
}

export interface GeneralDocCategory extends BaseCategory {
  type?: 'general';
  content: string;
}

export interface CipherDocCategory extends BaseCategory {
  type: 'cipher';
  overview: {
    history: string;
    description: string;
  };
  mathematics: {
    encryptionFormula: string;
    decryptionFormula: string;
    explanation: string[];
  };
  workedExample: {
    plaintext: string;
    parameters: string;
    steps: { description: string; result: string }[];
    finalCiphertext: string;
  };
  complexity: string;
  securityAnalysis: {
    advantages: string[];
    weaknesses: string[];
  };
  realWorldApplications: string[];
  codeSnippets: {
    python: string;
    javascript: string;
  };
  playgroundLink: string;
  references: { title: string; url: string }[];
}

export type DocCategory = GeneralDocCategory | CipherDocCategory;

export const docCategories: DocCategory[] = [
  {
    type: 'general',
    title: "Getting Started",
    description: "An overview of the CryptoViz visualization architecture and baseline requirements.",
    content: "CryptoViz is a real-time cryptography  data visualization dashboard. It delivers an intuitive environment engineered to break down complex cryptographic concepts and cipher execution models into clear, human-readable algorithmic visualizations."
  },
  {
    type: 'general',
    title: "Installation & Setup",
    description: "The execution scripts needed to clone, provision, and deploy the application locally.",
    content: "1. Clone the project code framework from the source repository:\ngit clone https://github.com/csxark/CryptoViz.git\n2. Initialize dependencies using the node package manager:\nnpm install\n3. Boot the local development proxy network environment:\nnpm run dev"
  },
  {
    type: 'general',
    title: "Features Overview",
    description: "A functional layout map of the underlying cipher playgrounds and dynamic grids.",
    content: "• Comprehensive algorithm simulation sandboxes covering symmetric and asymmetric logic profiles.\n• Step-by-step state animations tracking internal matrix transformations.\n• Performance-optimized charts graphing metric data without dropping UI frames."
  },
  {
    type: 'general',
    title: "Project Architecture",
    description: "An analytical breakdown of the system layout, module constraints, and thread offloading.",
    content: "The application relies on Next.js, React context modules, and Tailwind utility presets. High-latency cryptographic calculations are intelligently partitioned onto dedicated background execution scopes utilizing independent Web Workers (cipher.worker.ts) to guarantee zero rendering blockades."
  },
  {
    type: 'general',
    title: "Contribution Guide",
    description: "Standard workflow instructions for opening branches, testing code, and opening PRs.",
    content: "All codebase contributions must adhere to clean design patterns. Fork the repository, isolate changes into structural feature branches, run the vitest unit test suite to ensure strict compliance, and open a pull request targeting the main line."
  },
  {
    type: 'general',
    title: "Troubleshooting & FAQs",
    description: "Pre-documented diagnostic resolutions for package state anomalies and execution faults.",
    content: "Experiencing setup discrepancies? Run a strict 'npm ci' to ensure a complete and exact rebuild of the package lock definitions. Verify your local runtime environment strictly aligns with modern LTS node standards."
  },
  {
    type: 'cipher',
    title: "Caesar Cipher",
    description: "A classical substitution cipher that shifts characters by a fixed number of positions down the alphabet.",
    overview: {
      history: "Named after Julius Caesar, who used it to communicate securely with his generals, the Caesar cipher is one of the oldest and most famous encryption algorithms. While extremely simple by modern standards, it laid the foundational principles for symmetric encryption.",
      description: "The Caesar cipher is a substitution cipher where each letter in the plaintext is 'shifted' a certain number of places down the alphabet. For example, with a shift of 1, A would be replaced by B, B would become C, and so on."
    },
    mathematics: {
      encryptionFormula: "E_k(x) = (x + k) \\pmod{26}",
      decryptionFormula: "D_k(x) = (x - k) \\pmod{26}",
      explanation: [
        "x represents the numeric index of the plaintext character.",
        "k is the key (the shift value).",
        "The modulo operator ensures that the result wraps around the alphabet (e.g., shifting Z by 1 results in A).",
        "Alphabet Indexing: A=0, B=1, C=2, ..., Z=25."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Shift = 3",
      steps: [
        { description: "H (7) → (7 + 3) mod 26 = 10", result: "K" },
        { description: "E (4) → (4 + 3) mod 26 = 7", result: "H" },
        { description: "L (11) → (11 + 3) mod 26 = 14", result: "O" },
        { description: "L (11) → (11 + 3) mod 26 = 14", result: "O" },
        { description: "O (14) → (14 + 3) mod 26 = 17", result: "R" }
      ],
      finalCiphertext: "KHOOR"
    },
    complexity: "O(n) time complexity where n is the length of the plaintext. Space complexity is O(1) for in-place shifts or O(n) for string allocation.",
    securityAnalysis: {
      advantages: [
        "Extremely easy to implement and understand.",
        "Requires virtually zero computational power."
      ],
      weaknesses: [
        "Susceptible to brute-force attacks (only 25 possible keys in the English alphabet).",
        "Vulnerable to frequency analysis as it preserves the statistical distribution of letters."
      ]
    },
    realWorldApplications: [
      "Historically used in military communications by the Roman Empire.",
      "Used in ROT13 for obscuring punchlines, spoilers, or puzzle solutions online."
    ],
    codeSnippets: {
      python: "def caesar_encrypt(text, shift):\n    result = \"\"\n    for i in range(len(text)):\n        char = text[i]\n        if char.isupper():\n            result += chr((ord(char) + shift - 65) % 26 + 65)\n        elif char.islower():\n            result += chr((ord(char) + shift - 97) % 26 + 97)\n        else:\n            result += char\n    return result",
      javascript: "function caesarEncrypt(text, shift) {\n  return text.replace(/[a-zA-Z]/g, (char) => {\n    const base = char <= 'Z' ? 65 : 97;\n    return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);\n  });\n}"
    },
    playgroundLink: "/visualizer/caesar",
    references: [
      { title: "Wikipedia: Caesar Cipher", url: "https://en.wikipedia.org/wiki/Caesar_cipher" },
      { title: "MDN: String.fromCharCode()", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode" }
    ]
  },
  {
    type: 'cipher',
    title: "Rail Fence Cipher",
    description: "A classical transposition cipher that rearranges the plaintext characters in a zigzag pattern.",
    overview: {
      history: "The exact origins of the Rail Fence cipher are unknown, but it has been used historically as a rudimentary way to obscure messages without needing an alphabet shift. It belongs to the broader category of transposition ciphers, where the letters themselves aren't changed, just their positions.",
      description: "Also known as the zigzag cipher, the plaintext is written downwards on successive 'rails' of an imaginary fence, then moving up when we reach the bottom, and down again when we reach the top. The message is then read off in rows."
    },
    mathematics: {
      encryptionFormula: "N/A (Transposition based on periodic sequence)",
      decryptionFormula: "N/A (Reconstruction of zigzag grid pattern)",
      explanation: [
        "The Rail Fence cipher is not based on mathematical substitution but geometric transposition.",
        "The key parameter is 'Depth' (number of rails).",
        "The period (cycle length) of the zigzag pattern is given by (2 * Depth) - 2."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Depth = 3",
      steps: [
        { description: "H is placed on Rail 1", result: "H . . ." },
        { description: "E is placed on Rail 2", result: ". E . ." },
        { description: "L is placed on Rail 3", result: ". . L ." },
        { description: "L is placed on Rail 2 (moving up)", result: ". . . L" },
        { description: "O is placed on Rail 1 (moving down)", result: ". . . . O" }
      ],
      finalCiphertext: "HOELL"
    },
    complexity: "O(n) time complexity where n is the length of the plaintext. Space complexity is O(n) for the intermediate grid.",
    securityAnalysis: {
      advantages: [
        "Easy to perform by hand without complex tables.",
        "Can be combined with substitution ciphers to increase security."
      ],
      weaknesses: [
        "Extremely limited key space (Depth is bounded by the string length).",
        "Anagramming or examining periodic letter spacing can easily crack it."
      ]
    },
    realWorldApplications: [
      "Early recreational cryptography.",
      "Often used as a component in more complex, layered classical encryption schemes."
    ],
    codeSnippets: {
      python: "def rail_fence_encrypt(text, rails):\n    fence = [[] for _ in range(rails)]\n    rail = 0\n    direction = 1\n    \n    for char in text:\n        fence[rail].append(char)\n        rail += direction\n        if rail == 0 or rail == rails - 1:\n            direction *= -1\n            \n    return ''.join([''.join(rail) for rail in fence])",
      javascript: "function railFenceEncrypt(text, numRails) {\n  const rails = Array.from({ length: numRails }, () => []);\n  let rail = 0;\n  let direction = 1;\n\n  for (let char of text) {\n    rails[rail].push(char);\n    rail += direction;\n    if (rail === 0 || rail === numRails - 1) {\n      direction *= -1;\n    }\n  }\n  return rails.map(row => row.join('')).join('');\n}"
    },
    playgroundLink: "/visualizer/railfence",
    references: [
      { title: "Wikipedia: Rail Fence Cipher", url: "https://en.wikipedia.org/wiki/Rail_fence_cipher" }
    ]
  },
  {
    type: 'cipher',
    title: "AES",
    description: "Advanced Encryption Standard (AES) is a symmetric block cipher established by the U.S. NIST in 2001.",
    overview: {
      history: "Developed by two Belgian cryptographers, Joan Daemen and Vincent Rijmen (under the name Rijndael), AES was selected by NIST in 2001 to replace the older Data Encryption Standard (DES). It is now the globally accepted standard for symmetric encryption.",
      description: "AES is a block cipher that operates on 128-bit blocks of data. It relies on a Substitution-Permutation Network (SPN) architecture rather than a Feistel network. AES performs multiple 'rounds' of transformations to encrypt the data securely."
    },
    mathematics: {
      encryptionFormula: "C = AddRoundKey(MixColumns(ShiftRows(SubBytes(State))))",
      decryptionFormula: "P = InvSubBytes(InvShiftRows(InvMixColumns(AddRoundKey(State))))",
      explanation: [
        "State Matrix: The 128-bit block is represented as a 4x4 matrix of bytes.",
        "Galois Field Arithmetic: Operations (especially MixColumns) are performed in GF(2^8) modulo the irreducible polynomial x^8 + x^4 + x^3 + x + 1. Addition is XOR, and multiplication involves shifts and conditional XORs.",
        "10 Rounds are used for 128-bit keys, 12 for 192-bit keys, and 14 for 256-bit keys."
      ]
    },
    workedExample: {
      plaintext: "HELLO_WORLD_1234",
      parameters: "Key = 128-bit, 10 Rounds",
      steps: [
        { description: "SubBytes", result: "Each byte is replaced according to the non-linear S-box." },
        { description: "ShiftRows", result: "Row 0: unchanged. Row 1: shift 1. Row 2: shift 2. Row 3: shift 3." },
        { description: "MixColumns", result: "Each column is multiplied by a fixed matrix in GF(2^8)." },
        { description: "AddRoundKey", result: "The state is XORed with the corresponding round key derived from the Key Expansion schedule." },
        { description: "Final Round", result: "Performs SubBytes, ShiftRows, and AddRoundKey (MixColumns is omitted)." }
      ],
      finalCiphertext: "[16-byte encrypted binary block]"
    },
    complexity: "O(1) time per block since operations per round are constant and strictly bounded. Extremely fast in hardware due to parallelizability and AES-NI CPU instructions.",
    securityAnalysis: {
      advantages: [
        "Approved for top-secret classified information by the NSA.",
        "Resistant to known cryptographic attacks, including linear and differential cryptanalysis.",
        "High performance in both software and hardware implementations."
      ],
      weaknesses: [
        "Vulnerable to side-channel attacks (e.g., cache timing attacks) if implemented poorly in software.",
        "If used with insecure modes of operation (like ECB), the overall security is heavily compromised."
      ]
    },
    realWorldApplications: [
      "Wi-Fi security (WPA2/WPA3).",
      "VPN protocols (IPsec, OpenVPN, WireGuard).",
      "Disk encryption (BitLocker, FileVault).",
      "TLS/SSL for secure web browsing."
    ],
    codeSnippets: {
      python: "# Conceptual SubBytes operation using S-box\ndef sub_bytes(state_matrix, s_box):\n    for row in range(4):\n        for col in range(4):\n            byte = state_matrix[row][col]\n            state_matrix[row][col] = s_box[byte]\n    return state_matrix",
      javascript: "// Conceptual ShiftRows operation\nfunction shiftRows(state) {\n  // Row 1 shifted left by 1\n  state[1] = [state[1][1], state[1][2], state[1][3], state[1][0]];\n  // Row 2 shifted left by 2\n  state[2] = [state[2][2], state[2][3], state[2][0], state[2][1]];\n  // Row 3 shifted left by 3\n  state[3] = [state[3][3], state[3][0], state[3][1], state[3][2]];\n  return state;\n}"
    },
    playgroundLink: "/visualizer/aes",
    references: [
      { title: "NIST: FIPS 197 (AES Standard)", url: "https://csrc.nist.gov/publications/detail/fips/197/final" },
      { title: "Wikipedia: Advanced Encryption Standard", url: "https://en.wikipedia.org/wiki/Advanced_Encryption_Standard" }
    ]
  },
  {
    type: 'cipher',
    title: "Vigenère Cipher",
    description: "A method of encrypting alphabetic text by using a series of interwoven Caesar ciphers based on the letters of a keyword.",
    overview: {
      history: "Invented by Giovan Battista Bellaso in 1553, but later misattributed to Blaise de Vigenère in the 19th century, it was known as 'le chiffre indéchiffrable' (the indecipherable cipher) for over three centuries until Charles Babbage cracked it.",
      description: "It is a polyalphabetic substitution cipher. Instead of using a single shift like the Caesar cipher, it uses a keyword to determine a different shift for each letter of the plaintext. The keyword is repeated to match the length of the plaintext."
    },
    mathematics: {
      encryptionFormula: "E_k(M_i) = (M_i + K_i) \\pmod{26}",
      decryptionFormula: "D_k(C_i) = (C_i - K_i + 26) \\pmod{26}",
      explanation: [
        "M_i is the numeric index of the plaintext character.",
        "K_i is the numeric index of the keyword character.",
        "C_i is the resulting ciphertext character.",
        "Alphabet Indexing: A=0, B=1, ..., Z=25."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Keyword = KEY",
      steps: [
        { description: "H(7) + K(10) mod 26 = 17", result: "R" },
        { description: "E(4) + E(4) mod 26 = 8", result: "I" },
        { description: "L(11) + Y(24) mod 26 = 9", result: "J" },
        { description: "L(11) + K(10) mod 26 = 21", result: "V" },
        { description: "O(14) + E(4) mod 26 = 18", result: "S" }
      ],
      finalCiphertext: "RIJVS"
    },
    complexity: "O(n) time complexity where n is the length of the plaintext. Space complexity is O(n) for string allocation.",
    securityAnalysis: {
      advantages: [
        "Significantly more secure than single-alphabet substitution ciphers like Caesar.",
        "Obscures the frequency distribution of letters, defeating basic frequency analysis."
      ],
      weaknesses: [
        "Vulnerable to Kasiski examination and Babbage's method, which can deduce the keyword length.",
        "Once keyword length is known, it reduces to multiple Caesar ciphers."
      ]
    },
    realWorldApplications: [
      "Used extensively in historical diplomatic communications.",
      "Served as a stepping stone to the perfectly secure One-Time Pad."
    ],
    codeSnippets: {
      python: "def vigenere_encrypt(text, key):\n    result = \"\"\n    key = key.upper()\n    key_index = 0\n    for char in text:\n        if char.isalpha():\n            shift = ord(key[key_index % len(key)]) - 65\n            base = 65 if char.isupper() else 97\n            result += chr((ord(char) - base + shift) % 26 + base)\n            key_index += 1\n        else:\n            result += char\n    return result",
      javascript: "function vigenereEncrypt(text, key) {\n  let result = '';\n  let keyIndex = 0;\n  key = key.toUpperCase();\n  for (let i = 0; i < text.length; i++) {\n    let char = text[i];\n    if (/[a-zA-Z]/.test(char)) {\n      let shift = key.charCodeAt(keyIndex % key.length) - 65;\n      let base = char <= 'Z' ? 65 : 97;\n      result += String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);\n      keyIndex++;\n    } else {\n      result += char;\n    }\n  }\n  return result;\n}"
    },
    playgroundLink: "/visualizer/vigenere",
    references: [
      { title: "Wikipedia: Vigenère Cipher", url: "https://en.wikipedia.org/wiki/Vigen%C3%A8re_cipher" }
    ]
  },
  {
    type: 'cipher',
    title: "DES",
    description: "Data Encryption Standard (DES) is a symmetric-key block cipher published by NIST.",
    overview: {
      history: "Developed in the early 1970s at IBM and based on an earlier design by Horst Feistel, it was submitted to the National Bureau of Standards (NBS) and approved as a federal standard in 1977.",
      description: "DES operates on 64-bit blocks of plaintext using a 56-bit key. It relies on a Feistel network structure consisting of 16 identical rounds of substitution and permutation."
    },
    mathematics: {
      encryptionFormula: "IP^{-1}(F_{16}(F_{15}(...F_1(IP(M))...)))",
      decryptionFormula: "Same as encryption, but subkeys K_1 to K_{16} are applied in reverse order.",
      explanation: [
        "IP is the Initial Permutation, and IP^{-1} is the Final Permutation.",
        "F represents a single Feistel round involving expansion, XOR with subkey, S-box substitution, and permutation.",
        "The 64-bit block is split into two 32-bit halves (L, R) in each round."
      ]
    },
    workedExample: {
      plaintext: "HELLO_64",
      parameters: "Key = 56-bit, 16 Rounds",
      steps: [
        { description: "Initial Permutation", result: "Rearranges the 64 bits of the plaintext block." },
        { description: "Feistel Round 1", result: "Expands right half to 48 bits, XORs with subkey 1, applies S-boxes, XORs with left half." },
        { description: "Feistel Rounds 2-15", result: "Repeats the Feistel process with successive subkeys." },
        { description: "Feistel Round 16", result: "Final round of processing, halves are not swapped." },
        { description: "Final Permutation", result: "Applies the inverse of the initial permutation to produce the 64-bit ciphertext." }
      ],
      finalCiphertext: "[8-byte encrypted binary block]"
    },
    complexity: "O(1) time per block. Consists of a fixed number of operations (16 rounds) regardless of input size.",
    securityAnalysis: {
      advantages: [
        "Highly influential in modern cryptography and Feistel network designs.",
        "Extremely fast to execute in hardware."
      ],
      weaknesses: [
        "56-bit key length is too small to resist modern brute-force attacks (can be cracked in hours).",
        "Replaced by AES and Triple DES (3DES) in virtually all modern applications."
      ]
    },
    realWorldApplications: [
      "Historically used in ATM encryption and financial transactions.",
      "Legacy systems and protocols that haven't been upgraded to AES."
    ],
    codeSnippets: {
      python: "# Conceptual snippet utilizing a crypto library (pycryptodome)\nfrom Crypto.Cipher import DES\nfrom Crypto.Util.Padding import pad\n\ndef des_encrypt(plaintext, key):\n    cipher = DES.new(key, DES.MODE_ECB)\n    padded_text = pad(plaintext, DES.block_size)\n    return cipher.encrypt(padded_text)",
      javascript: "// Conceptual snippet utilizing Node.js crypto module\nconst crypto = require('crypto');\n\nfunction desEncrypt(plaintext, key) {\n  const cipher = crypto.createCipheriv('des-ecb', key, null);\n  let encrypted = cipher.update(plaintext, 'utf8', 'hex');\n  encrypted += cipher.final('hex');\n  return encrypted;\n}"
    },
    playgroundLink: "/visualizer/des",
    references: [
      { title: "Wikipedia: Data Encryption Standard", url: "https://en.wikipedia.org/wiki/Data_Encryption_Standard" }
    ]
  },
  {
    type: 'cipher',
    title: "SHA-256",
    description: "A cryptographic hash function that outputs a 256-bit digest, part of the SHA-2 family.",
    overview: {
      history: "Designed by the United States National Security Agency (NSA) and published in 2001 by NIST as a U.S. Federal Information Processing Standard (FIPS).",
      description: "Unlike encryption algorithms, SHA-256 is a one-way hash function. It takes an input of any size and deterministically produces a fixed-size 256-bit (32-byte) hash. It's built using the Merkle-Damgård construction."
    },
    mathematics: {
      encryptionFormula: "H(M) = SHA256(Message)",
      decryptionFormula: "N/A (One-way deterministic function, non-reversible)",
      explanation: [
        "M is the padded message, broken down into 512-bit blocks.",
        "Each block is processed through 64 rounds of non-linear functions (Ch, Maj), modular additions, and bitwise rotations (Sigma0, Sigma1).",
        "The output of each block updates an internal 256-bit state (H0-H7)."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Rounds = 64",
      steps: [
        { description: "Message Padding", result: "Appends '1', zero-pads, and adds the 64-bit message length to make the total length a multiple of 512 bits." },
        { description: "Message Schedule", result: "Expands the 16 32-bit words into 64 32-bit words for the rounds." },
        { description: "Compression Loop", result: "Executes 64 rounds mutating the working variables a,b,c,d,e,f,g,h." },
        { description: "State Update", result: "Adds the mutated variables to the current hash state." },
        { description: "Finalization", result: "Concatenates the final state (H0-H7) to form the 256-bit digest." }
      ],
      finalCiphertext: "d09a56c4293049... (256-bit Hexadecimal Digest)"
    },
    complexity: "O(n) time complexity where n is the length of the input message. Space complexity is O(1) for streaming hash calculation.",
    securityAnalysis: {
      advantages: [
        "Highly resistant to collision attacks.",
        "Irreversible (pre-image resistant) and computationally infeasible to spoof (second pre-image resistant)."
      ],
      weaknesses: [
        "Susceptible to length extension attacks when used improperly as a MAC (which is why HMAC-SHA256 is preferred for authentication)."
      ]
    },
    realWorldApplications: [
      "Bitcoin's Proof-of-Work (PoW) consensus algorithm.",
      "Digital Signatures and Certificate Authorities (TLS/SSL).",
      "File integrity verification."
    ],
    codeSnippets: {
      python: "import hashlib\n\ndef sha256_hash(text):\n    hasher = hashlib.sha256()\n    hasher.update(text.encode('utf-8'))\n    return hasher.hexdigest()",
      javascript: "async function sha256Hash(text) {\n  const msgBuffer = new TextEncoder().encode(text);\n  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);\n  const hashArray = Array.from(new Uint8Array(hashBuffer));\n  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');\n}"
    },
    playgroundLink: "/visualizer/sha256",
    references: [
      { title: "NIST: FIPS 180-4 (Secure Hash Standard)", url: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf" }
    ]
  },
  {
    type: 'cipher',
    title: "RSA-2048",
    description: "A widely used public-key cryptosystem for secure data transmission based on the factoring of large prime numbers.",
    overview: {
      history: "Developed in 1977 by Ron Rivest, Adi Shamir, and Leonard Adleman at MIT. The acronym RSA comes from their surnames. It revolutionized cryptography by introducing asymmetric public-key concepts into mainstream use.",
      description: "RSA uses two distinct keys: a public key for encryption (which can be shared openly) and a private key for decryption (which must be kept secret). RSA-2048 utilizes a 2048-bit modulus, which is currently considered highly secure against classical computing attacks."
    },
    mathematics: {
      encryptionFormula: "C = M^e \\pmod{n}",
      decryptionFormula: "M = C^d \\pmod{n}",
      explanation: [
        "n is the modulus, computed as n = p * q (where p and q are large prime numbers).",
        "e is the public exponent (often 65537). The public key is (n, e).",
        "d is the private exponent, computed as the modular multiplicative inverse of e modulo λ(n). The private key is (n, d).",
        "M is the plaintext message represented as an integer where 0 ≤ M < n."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Key = 2048-bit",
      steps: [
        { description: "Key Generation", result: "Generate large primes p, q. Calculate n = p*q. Choose e. Calculate d." },
        { description: "Message Formatting", result: "Convert 'HELLO' into a numerical representation (e.g., ASCII/Hex) and pad it (e.g., using PKCS#1 v1.5 or OAEP)." },
        { description: "Encryption", result: "Compute C = M^e mod n using the public key." },
        { description: "Transmission", result: "Send the numerical ciphertext C over the insecure channel." },
        { description: "Decryption", result: "Compute M = C^d mod n using the private key and unpad to retrieve 'HELLO'." }
      ],
      finalCiphertext: "[2048-bit numerical ciphertext]"
    },
    complexity: "O(k^3) for encryption and decryption, where k is the number of bits in the key. Slower than symmetric algorithms.",
    securityAnalysis: {
      advantages: [
        "Solves the key distribution problem inherent in symmetric cryptography.",
        "Can be used for both data encryption and digital signatures (non-repudiation)."
      ],
      weaknesses: [
        "Computationally expensive. Usually used to encrypt a symmetric session key rather than bulk data.",
        "Theoretically vulnerable to Shor's algorithm on a sufficiently powerful future quantum computer."
      ]
    },
    realWorldApplications: [
      "Establishing secure TLS/SSL connections for HTTPS.",
      "PGP/GPG for secure email communication.",
      "SSH key authentication."
    ],
    codeSnippets: {
      python: "# Conceptual snippet utilizing a crypto library (pycryptodome)\nfrom Crypto.PublicKey import RSA\nfrom Crypto.Cipher import PKCS1_OAEP\n\ndef rsa_encrypt(plaintext, public_key_der):\n    key = RSA.import_key(public_key_der)\n    cipher = PKCS1_OAEP.new(key)\n    return cipher.encrypt(plaintext.encode('utf-8'))",
      javascript: "async function rsaEncrypt(plaintext, publicKey) {\n  const encoded = new TextEncoder().encode(plaintext);\n  const encryptedBuffer = await crypto.subtle.encrypt(\n    { name: 'RSA-OAEP' },\n    publicKey,\n    encoded\n  );\n  return new Uint8Array(encryptedBuffer);\n}"
    },
    playgroundLink: "/visualizer/rsa",
    references: [
      { title: "Wikipedia: RSA (cryptosystem)", url: "https://en.wikipedia.org/wiki/RSA_(cryptosystem)" }
    ]
  }
];