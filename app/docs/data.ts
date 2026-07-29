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
    content: "CryptoViz is a real-time cryptocurrency data visualization dashboard. It delivers an intuitive environment engineered to break down complex cryptographic concepts and cipher execution models into clear, human-readable algorithmic visualizations."
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
    type: 'general',
    title: "Glossary Cross-Linking",
    description: "Overview of automatic terminology detection, definition tooltips, and the interactive Glossary Explorer.",
    content: "CryptoViz automatically parses documentation content to detect cryptographic terminology such as Symmetric Encryption, Nonce, SHA-256, Initialization Vector, and KDF. Matched terms are highlighted with interactive definition popovers and direct links to the Glossary Explorer."
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
    title: "SM3 Hash",
    description: "Chinese Commercial Cryptography standard (GB/T 32905-2016) cryptographic hash function producing a 256-bit digest.",
    overview: {
      history: "Published in 2010 by the State Encryption Management Bureau (OSCCA) and formalized as Chinese National Standard GB/T 32905-2016 and ISO/IEC 10118-3:2018. SM3 is an integral member of China's commercial cryptographic algorithm suite (alongside SM2 and SM4).",
      description: "SM3 processes 512-bit message blocks through a Merkle-Damgård construction using 64 ARX (Addition, Rotation, XOR) compression rounds. Unlike SHA-256 which uses modular addition to combine block outputs, SM3 updates its intermediate 256-bit hash state using bitwise XOR operations (V^(i+1) = V^(i) ^ (A,B,C,D,E,F,G,H))."
    },
    mathematics: {
      encryptionFormula: "H(M) = \\text{SM3}(M)",
      decryptionFormula: "N/A (One-way deterministic cryptographic hash function)",
      explanation: [
        "Message Expansion: Generates 68 32-bit words W_0..W_{67} and 64 XOR-derived words W'_j = W_j \\oplus W_{j+4}.",
        "Permutation Functions: P_0(X) = X \\oplus (X \\lll 9) \\oplus (X \\lll 17) and P_1(X) = X \\oplus (X \\lll 15) \\oplus (X \\lll 23).",
        "Round Functions: FF_j(X,Y,Z) and GG_j(X,Y,Z) act as bitwise XOR for rounds 0-15 and majority/choice functions for rounds 16-63.",
        "Intermediate Variables: SS1 = ((A \\lll 12) + E + (T_j \\lll (j \\bmod 32))) \\lll 7, SS2 = SS1 \\oplus (A \\lll 12)."
      ]
    },
    workedExample: {
      plaintext: "abc",
      parameters: "64 Rounds, 512-bit Message Block",
      steps: [
        { description: "Message Padding", result: "Appends 0x80, zero-pads to 448 mod 512 bits, and appends 64-bit length (24 bits)." },
        { description: "Message Expansion", result: "Expands 16 block words into W[0..67] using P1 permutation and derives W'[0..63]." },
        { description: "64 Compression Rounds", result: "Mutates working registers A..H using FF_j, GG_j, P0, SS1, SS2, TT1, and TT2." },
        { description: "State Update (XOR)", result: "Updates IV registers V^(1) = V^(0) XOR (A,B,C,D,E,F,G,H)." },
        { description: "Digest Finalization", result: "Concatenates V0..V7 into a 256-bit hexadecimal digest." }
      ],
      finalCiphertext: "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
    },
    complexity: "O(n) time complexity where n is message length in 512-bit blocks. Space complexity is O(1) streaming state buffer.",
    securityAnalysis: {
      advantages: [
        "Cryptographically secure 256-bit digest with resistance to collision and preimage attacks.",
        "ARX design provides high hardware efficiency without relying on table lookups (S-boxes), mitigating cache-timing side channels."
      ],
      weaknesses: [
        "Like SHA-256, built on Merkle-Damgård construction and vulnerable to length extension attacks if raw hash is used directly as a MAC (use HMAC-SM3 instead)."
      ]
    },
    realWorldApplications: [
      "Chinese Commercial Cryptography (Guomi / Commercial Code) mandatory standards.",
      "Digital signatures with SM2 elliptic curve algorithm.",
      "GM/T standard TLS/SSL connections and banking applications in East Asia."
    ],
    codeSnippets: {
      python: "# Using pycryptodome or gmssl library\nfrom gmssl import sm3, func\n\ndef compute_sm3(text):\n    return sm3.sm3_hash(func.bytes_to_list(text.encode('utf-8')))",
      javascript: "import { encrypt as sm3Encrypt } from './lib/cipher/hash/sm3';\n\nconst digest = sm3Encrypt('abc').output;\nconsole.log(digest); // 66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
    },
    playgroundLink: "/visualizer/sm3",
    references: [
      { title: "GB/T 32905-2016: SM3 Cryptographic Hash Algorithm", url: "https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=022F9E5894101A094D26500F9514757C" },
      { title: "ISO/IEC 10118-3:2018 Dedicated Hash Functions (SM3)", url: "https://www.iso.org/standard/67918.html" }
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
  },
  {
    type: 'cipher',
    title: "Merkle Trees",
    description: "A cryptographic tree structure designed to securely and efficiently verify the contents of large data sets.",
    overview: {
      history: "Proposed by Ralph Merkle in 1979 and patented in 1980, Merkle Trees are a foundational concept in computer science. They are heavily utilized in peer-to-peer file systems like BitTorrent and IPFS, version control systems like Git, and modern blockchains like Bitcoin and Ethereum.",
      description: "A Merkle Tree is a binary tree where every leaf node is the hash of a data block, and every non-leaf (internal) node is the hash of its children concatenated together. It allows verifying that a specific data block exists inside a larger tree structure by providing only a logarithmic number of sibling hashes, known as a Merkle Proof."
    },
    mathematics: {
      encryptionFormula: "H_{Parent} = \\text{Hash}(H_{Left} \\parallel H_{Right})",
      decryptionFormula: "\\text{Verify}(H_{Leaf}, \\text{AuditPath}, H_{Root}) \\to \\{\\text{True}, \\text{False}\\}",
      explanation: [
        "H_Left and H_Right are the sibling hashes representing left and right nodes.",
        "\\parallel denotes the concatenation of the two byte arrays.",
        "If a node lacks a sibling at an odd-numbered level, it is either duplicated (Bitcoin strategy) or promoted directly (Git/IPFS strategy).",
        "Merkle Proof: A logarithmic list of sibling hashes (audit path) and directions that allows recalculating the root hash from a single leaf hash."
      ]
    },
    workedExample: {
      plaintext: "Tx0, Tx1, Tx2, Tx3",
      parameters: "SHA-256 Hashing Strategy",
      steps: [
        { description: "Leaf Hash Calculation", result: "Compute H0=Hash(Tx0), H1=Hash(Tx1), H2=Hash(Tx2), H3=Hash(Tx3)." },
        { description: "Level 1 Parent Pairing", result: "Pair children: H01=Hash(H0 + H1) and H23=Hash(H2 + H3)." },
        { description: "Level 2 Root Calculation", result: "Pair Level 1 parents: Root=Hash(H01 + H23)." }
      ],
      finalCiphertext: "[32-byte hexadecimal Merkle Root Hash]"
    },
    complexity: "Tree construction: O(N) hashes. Proof generation: O(log N). Proof verification: O(log N).",
    securityAnalysis: {
      advantages: [
        "Validates inclusion of data in O(log N) time and space complexity.",
        "A client only needs to store the 32-byte root hash to verify integrity of millions of transactions.",
        "Instantly isolates the location of modified data when comparing two different trees."
      ],
      weaknesses: [
        "Vulnerable to second-preimage attacks (pairing inner nodes as leaf hashes) if leaf and internal nodes are not explicitly distinguished using distinct byte prefixes (e.g., prefixing leaf data with 0x00 and internal hashes with 0x01 before hashing)."
      ]
    },
    realWorldApplications: [
      "Git: Verifying file and directory structure modifications.",
      "BitTorrent & IPFS: Validating individual data chunks downloaded from untrusted peers.",
      "Cryptocurrency & Blockchain: Storing transactions in blocks (e.g., Bitcoin Block Headers) to support Simple Payment Verification (SPV) wallets."
    ],
    codeSnippets: {
      python: "import hashlib\n\ndef compute_parent(left_hex, right_hex):\n    # Convert hex inputs to bytes, concatenate and hash\n    combined = bytes.fromhex(left_hex) + bytes.fromhex(right_hex)\n    return hashlib.sha256(combined).hexdigest()",
      javascript: "import { sha256 } from '@noble/hashes/sha2.js'\n\nfunction computeParent(leftHex, rightHex) {\n  const leftBytes = toByteArray(leftHex);\n  const rightBytes = toByteArray(rightHex);\n  const combined = new Uint8Array([...leftBytes, ...rightBytes]);\n  return fromByteArray(sha256(combined), 'hex');\n}"
    },
    playgroundLink: "/merkle",
    references: [
      { title: "Ralph Merkle's original patent", url: "https://patents.google.com/patent/US4309569A/en" },
      { title: "RFC 9162: Certificate Transparency (Merkle Trees)", url: "https://datatracker.ietf.org/doc/html/rfc9162" }
    ]
  },
  {
    type: 'cipher',
    title: "HMAC-SHA256",
    description: "Keyed-Hash Message Authentication Code using SHA-256 to verify data integrity and authenticity.",
    overview: {
      history: "First proposed in 1996 by Mihir Bellare, Ran Canetti, and Hugo Krawczyk, and formalized in RFC 2104. It was designed to solve the vulnerabilities of simple MAC designs like H(K || m) which are susceptible to length extension attacks.",
      description: "HMAC is a cryptographic construction for calculating a message authentication code involving a cryptographic hash function in combination with a secret key. It computes the hash twice using nested padding constants (ipad and opad) to bind the message state securely to the key."
    },
    mathematics: {
      encryptionFormula: "\\text{HMAC}(K, m) = H((K' \\oplus opad) \\parallel H((K' \\oplus ipad) \\parallel m))",
      decryptionFormula: "\\text{Verify}(K, m, \\text{Mac}) \\to [\\text{HMAC}(K, m) == \\text{Mac}]",
      explanation: [
        "K' is the block-sized prepared key. If K is longer than 64 bytes, K' = H(K). If K is shorter, K' is K padded with trailing zeros to 64 bytes.",
        "ipad is the inner padding constant (the byte 0x36 repeated 64 times).",
        "opad is the outer padding constant (the byte 0x5c repeated 64 times).",
        "\\parallel represents byte concatenation, and \\oplus represents bitwise XOR."
      ]
    },
    workedExample: {
      plaintext: "Hi There",
      parameters: "Key = 0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b (Hex format)",
      steps: [
        { description: "Key Preparation", result: "Original key is 20 bytes (<= 64). Pad key with zeros to block size: 0b0b...0000..." },
        { description: "Inner XOR Calculation", result: "Compute K' XOR ipad (0x36) resulting in: 3d3d...3636..." },
        { description: "Inner SHA-256 Hashing", result: "Concatenate Inner Key and 'Hi There' message and compute SHA-256: 3b344c61d8db..." },
        { description: "Outer XOR Calculation", result: "Compute K' XOR opad (0x5c) resulting in: 5757...5c5c..." },
        { description: "Outer SHA-256 (Final HMAC)", result: "Concatenate Outer Key and Inner Hash, compute final SHA-256 digest." }
      ],
      finalCiphertext: "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
    },
    complexity: "O(N) operations, equivalent to two standard SHA-256 updates.",
    securityAnalysis: {
      advantages: [
        "Provably immune to length extension attacks because the final outer hash hides the internal state of the inner hash.",
        "Provides both data integrity (tamper proofing) and authenticity (key ownership proof)."
      ],
      weaknesses: [
        "Cryptographic security relies entirely on the strength of the underlying hash function (e.g., HMAC-SHA256 is strong, whereas HMAC-MD5 is legacy due to MD5 weaknesses)."
      ]
    },
    realWorldApplications: [
      "API Request Signing: Standard authentication method for AWS (Signature Version 4) and Twilio request verification.",
      "Token-Based Authentication: Forming the signature part of JSON Web Tokens (JWT).",
      "Key Derivation Functions: Forms the core PRF (Pseudorandom Function) for HKDF in TLS 1.3."
    ],
    codeSnippets: {
      python: "import hmac\nimport hashlib\n\ndef generate_hmac(key_bytes, msg_bytes):\n    return hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()",
      javascript: "import { hmac } from '@noble/hashes/hmac.js'\nimport { sha256 } from '@noble/hashes/sha2.js'\n\nconst digestBytes = hmac(sha256, keyBytes, msgBytes);"
    },
    playgroundLink: "/visualizer/hmac",
    references: [
      { title: "RFC 2104: HMAC (Keyed-Hashing for Message Authentication)", url: "https://datatracker.ietf.org/doc/html/rfc2104" },
      { title: "NIST FIPS 198-1: The Keyed-Hash Message Authentication Code", url: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.198-1.pdf" }
    ]
  },
  {
    type: 'cipher',
    title: "Scrypt KDF",
    description: "A memory-hard key derivation function designed to prevent GPU/ASIC-based hardware brute-force attacks.",
    overview: {
      history: "Created by Colin Percival in 2009 for the Tarsnap secure backup service, Scrypt was designed to require significantly more memory than bcrypt or PBKDF2, making custom hardware implementations (ASICs) prohibitively expensive to build.",
      description: "Scrypt is a password-based key derivation function. It starts by stretching the password/salt using PBKDF2, mixes it with a sequential memory loop (ROMix) utilizing Salsa20/8 core steps, performs data-dependent random reads, and runs a final PBKDF2 step to derive the output key. This design enforces memory-hardness."
    },
    mathematics: {
      encryptionFormula: "\\text{Scrypt}(P, S, N, r, p, dkLen) = \\text{PBKDF2-HMAC-SHA256}(P, B', 1, dkLen)",
      decryptionFormula: "\\text{Verify}(P, S, N, r, p, \\text{Key}) \\to [\\text{Scrypt}(P, S, N, r, p, dkLen) == \\text{Key}]",
      explanation: [
        "P and S represent password and salt inputs.",
        "N is the CPU/memory cost parameter (must be a power of 2).",
        "r is the block size parameter, dictating the sequential memory footprint.",
        "p is the parallelization parameter, controlling active threads."
      ]
    },
    workedExample: {
      plaintext: "correct horse battery staple",
      parameters: "N = 16384, r = 8, p = 1, dkLen = 32",
      steps: [
        { description: "Parameter Parsing", result: "Validate N=16384 (power of 2), r=8, p=1, dkLen=32." },
        { description: "Memory Allocation", result: "Allocate (128 * r * N * p) = 16 MB of workspace memory." },
        { description: "Initial Stretch", result: "Stretches password with PBKDF2 into block array B of size 1024 bytes." },
        { description: "Salsa20 ROMix Loop", result: "Compute Salsa20/8 core mix blocks sequentially to populate array V." },
        { description: "Integerify Querying", result: "Retrieve random blocks from V based on data state, XORing blocks." },
        { description: "Final Hashing", result: "Pass final block array through PBKDF2 to derive 32-byte key." }
      ],
      finalCiphertext: "[32-byte hexadecimal derived key]"
    },
    complexity: "Time complexity: O(N * r). Space complexity: O(N * r).",
    securityAnalysis: {
      advantages: [
        "Extremely high protection against specialized hardware (ASICs/GPUs) due to memory-hard constraints.",
        "Tunable parameters allow adjusting security based on hardware improvements over time."
      ],
      weaknesses: [
        "High memory usage can lead to denial-of-service (DoS) vulnerabilities on authentication servers if parameters are configured too high."
      ]
    },
    realWorldApplications: [
      "Password hashing in Unix-like systems and secure database setups.",
      "Key derivation in cryptocurrency wallets (Litecoin, Dogecoin, Ethereum).",
      "Securing file-level backups (Tarsnap backup service)."
    ],
    codeSnippets: {
      python: "import hashlib\n\n# Uses hashlib's scrypt implementation (Python 3.6+)\ndef derive_scrypt(password, salt, N=16384, r=8, p=1, dkLen=32):\n    return hashlib.scrypt(password.encode(), salt=salt.encode(), n=N, r=r, p=p, dklen=dkLen).hex()",
      javascript: "import { scrypt } from '@noble/hashes/scrypt.js'\n\nconst keyBytes = scrypt(passwordBytes, saltBytes, { N: 16384, r: 8, p: 1, dkLen: 32 });"
    },
    playgroundLink: "/kdf/scrypt",
    references: [
      { title: "RFC 7914: The scrypt Password-Based Key Derivation Function", url: "https://datatracker.ietf.org/doc/html/rfc7914" },
      { title: "Tarsnap: Scrypt algorithm description by Colin Percival", url: "https://www.tarsnap.com/scrypt.html" }
    ]
  },
  {
    type: 'cipher',
    title: "ROT13",
    description: "A simple letter substitution cipher that replaces a letter with the 13th letter after it in the alphabet.",
    overview: {
      history: "Developed in ancient Rome as a variant of the Caesar cipher, ROT13 gained prominence in the early internet era on Usenet in the 1980s as a means of hiding spoilers, punchlines, and offensive material.",
      description: "ROT13 (Rotate by 13 places) is a special case of the Caesar cipher. Because there are 26 letters in the basic Latin alphabet, applying ROT13 twice restores the original text, meaning encryption and decryption are identical."
    },
    mathematics: {
      encryptionFormula: "E(x) = (x + 13) \\pmod{26}",
      decryptionFormula: "D(x) = (x + 13) \\pmod{26}",
      explanation: [
        "x is the alphabetical index of the character (0-25).",
        "Adding 13 and taking the modulo 26 wraps the index around the alphabet.",
        "Because 13 is exactly half of 26, the encryption and decryption operations are the exact same function."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Shift = 13 (Fixed)",
      steps: [
        { description: "H (7) + 13 mod 26 = 20", result: "U" },
        { description: "E (4) + 13 mod 26 = 17", result: "R" },
        { description: "L (11) + 13 mod 26 = 24", result: "Y" },
        { description: "L (11) + 13 mod 26 = 24", result: "Y" },
        { description: "O (14) + 13 mod 26 = 1", result: "B" }
      ],
      finalCiphertext: "URYYB"
    },
    complexity: "O(n) time complexity where n is the length of the string. Space complexity is O(n).",
    securityAnalysis: {
      advantages: [
        "Requires no key management since the shift is fixed.",
        "Encryption and decryption use the exact same algorithm.",
        "Extremely fast to compute."
      ],
      weaknesses: [
        "Provides absolutely zero cryptographic security.",
        "Vulnerable to frequency analysis and simple inspection.",
        "Easily broken since the algorithm is public and has no key."
      ]
    },
    realWorldApplications: [
      "Obscuring joke punchlines or movie spoilers on forums.",
      "Hiding email addresses from basic scraping bots.",
      "Geocaching hint obfuscation."
    ],
    codeSnippets: {
      python: "import codecs\n\ndef rot13(text):\n    return codecs.encode(text, 'rot_13')",
      javascript: "function rot13(str) {\n  return str.replace(/[a-zA-Z]/g, function(c) {\n    return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);\n  });\n}"
    },
    playgroundLink: "/visualizer/rot13",
    references: [
      { title: "Wikipedia: ROT13", url: "https://en.wikipedia.org/wiki/ROT13" }
    ]
  },
  {
    type: 'cipher',
    title: "Atbash Cipher",
    description: "An ancient monoalphabetic substitution cipher formed by mapping the alphabet to its reverse.",
    overview: {
      history: "Originally created for the Hebrew alphabet in biblical times (around 500 BC), Atbash is found in several books of the Bible, including Jeremiah. The name derives from the first, last, second, and second-to-last Hebrew letters.",
      description: "Atbash maps the first letter of the alphabet to the last, the second to the second-to-last, and so on. In English, A becomes Z, B becomes Y, etc. It is its own inverse."
    },
    mathematics: {
      encryptionFormula: "E(x) = (25 - x)",
      decryptionFormula: "D(x) = (25 - x)",
      explanation: [
        "x is the alphabetical index (0-25).",
        "Subtracting x from 25 effectively mirrors the index across the center of the alphabet.",
        "Like ROT13, encryption and decryption are identical operations."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "None (Fixed Mapping)",
      steps: [
        { description: "H (7) -> 25 - 7 = 18", result: "S" },
        { description: "E (4) -> 25 - 4 = 21", result: "V" },
        { description: "L (11) -> 25 - 11 = 14", result: "O" },
        { description: "L (11) -> 25 - 11 = 14", result: "O" },
        { description: "O (14) -> 25 - 14 = 11", result: "L" }
      ],
      finalCiphertext: "SVOOL"
    },
    complexity: "O(n) time complexity, O(n) space complexity.",
    securityAnalysis: {
      advantages: [
        "Simple to implement by hand.",
        "Self-reciprocal: encryption and decryption are the same."
      ],
      weaknesses: [
        "No key space; the mapping is entirely fixed.",
        "Fully vulnerable to frequency analysis.",
        "Provides no real security."
      ]
    },
    realWorldApplications: [
      "Historical biblical texts and theological study.",
      "Recreational puzzles and geocaching.",
      "Basic data obfuscation."
    ],
    codeSnippets: {
      python: "def atbash(text):\n    result = ''\n    for char in text:\n        if char.isalpha():\n            offset = 65 if char.isupper() else 97\n            result += chr(25 - (ord(char) - offset) + offset)\n        else:\n            result += char\n    return result",
      javascript: "function atbash(text) {\n  return text.replace(/[a-zA-Z]/g, (char) => {\n    const base = char <= 'Z' ? 65 : 97;\n    return String.fromCharCode(25 - (char.charCodeAt(0) - base) + base);\n  });\n}"
    },
    playgroundLink: "/visualizer/atbash",
    references: [
      { title: "Wikipedia: Atbash", url: "https://en.wikipedia.org/wiki/Atbash" }
    ]
  },
  {
    type: 'cipher',
    title: "Playfair Cipher",
    description: "A polygraphic substitution cipher that encrypts pairs of letters using a 5x5 key matrix.",
    overview: {
      history: "Invented by Charles Wheatstone in 1854 but named after Lord Playfair who promoted its use. It was used by British forces in the Second Boer War and World War I for tactical secrecy because it could be quickly computed without special equipment.",
      description: "Playfair operates on digrams (pairs of letters). It constructs a 5x5 grid using a keyword, filling the rest of the matrix with the remaining alphabet letters (usually merging I and J). Digrams are then substituted based on their rectangular relationship in the grid."
    },
    mathematics: {
      encryptionFormula: "Based on 5x5 matrix geometric substitution rules",
      decryptionFormula: "Reverse geometric substitution rules",
      explanation: [
        "If the letters are in the same row, replace them with letters to their immediate right.",
        "If they are in the same column, replace them with letters immediately below.",
        "If they form a rectangle, replace each with the letter on the same row but in the other corner of the rectangle.",
        "If the letters are identical, a filler letter (usually X) is inserted between them before encryption."
      ]
    },
    workedExample: {
      plaintext: "HE LL OX",
      parameters: "Keyword = 'PLAYFAIR'",
      steps: [
        { description: "Matrix generated with PLAYFAIR (I/J combined).", result: "Grid formed." },
        { description: "Digram HE forms a rectangle", result: "KU" },
        { description: "Digram LL requires a filler X -> LX", result: "YV" },
        { description: "Remaining LO forms a rectangle", result: "RN" }
      ],
      finalCiphertext: "KUYVRN"
    },
    complexity: "O(n) time complexity where n is plaintext length. O(1) space for the 5x5 matrix.",
    securityAnalysis: {
      advantages: [
        "Obscures single-letter frequencies, defeating standard frequency analysis.",
        "Can be performed entirely by hand in the field."
      ],
      weaknesses: [
        "Digram frequencies are still preserved and can be analyzed.",
        "Vulnerable to known-plaintext attacks.",
        "Small key space (5x5 matrix combinations) easily broken by modern computers."
      ]
    },
    realWorldApplications: [
      "Historically used in WWI military communications.",
      "Amateur radio and cryptographic puzzles."
    ],
    codeSnippets: {
      python: "# Conceptual snippet due to algorithm length\ndef generate_playfair_matrix(key):\n    # Generate 5x5 grid skipping J and handling duplicates\n    pass\n\ndef playfair_encrypt(text, matrix):\n    # Apply geometric substitution rules to digrams\n    pass",
      javascript: "// Playfair logic requires grid generation and pairing rules\nfunction playfairEncrypt(text, keyword) {\n  // 1. Generate 5x5 grid\n  // 2. Format text into pairs (adding X if duplicate)\n  // 3. Apply Row/Column/Rectangle rules\n  return 'IMPLEMENTATION_STUB';\n}"
    },
    playgroundLink: "/visualizer/playfair",
    references: [
      { title: "Wikipedia: Playfair Cipher", url: "https://en.wikipedia.org/wiki/Playfair_cipher" }
    ]
  },
  {
    type: 'cipher',
    title: "XOR Cipher",
    description: "A simple additive stream cipher that applies a bitwise exclusive OR (XOR) operation to the plaintext and key.",
    overview: {
      history: "The XOR operation is a fundamental logic gate in computing. Its use in cryptography dates back to the advent of digital logic, forming the foundation of many modern symmetric stream and block ciphers.",
      description: "The cipher iterates over the plaintext and applies the bitwise XOR operation against a repeating key. Because XOR is its own inverse, applying the same key to the ciphertext recovers the original plaintext."
    },
    mathematics: {
      encryptionFormula: "C = P \\oplus K",
      decryptionFormula: "P = C \\oplus K",
      explanation: [
        "P is the plaintext byte, K is the key byte, and C is the ciphertext byte.",
        "\\oplus represents the bitwise exclusive OR logic operation.",
        "If the key is shorter than the plaintext, it is repeated cyclically.",
        "A bitwise XOR evaluates to 1 if the bits are different, and 0 if they are the same."
      ]
    },
    workedExample: {
      plaintext: "Cat",
      parameters: "Key = 'k'",
      steps: [
        { description: "'C' (0x43) XOR 'k' (0x6B)", result: "0x28" },
        { description: "'a' (0x61) XOR 'k' (0x6B)", result: "0x0A" },
        { description: "'t' (0x74) XOR 'k' (0x6B)", result: "0x1F" }
      ],
      finalCiphertext: "0x28 0x0A 0x1F"
    },
    complexity: "O(n) time complexity where n is the length of the plaintext.",
    securityAnalysis: {
      advantages: [
        "Extremely fast and simple to implement in hardware or software.",
        "Perfectly secure (information-theoretic security) if the key is truly random, as long as the plaintext, and never reused (forming a One-Time Pad)."
      ],
      weaknesses: [
        "If the key is short and repeats, it is highly vulnerable to frequency analysis and known-plaintext attacks.",
        "Provides no integrity checking; vulnerable to bit-flipping attacks."
      ]
    },
    realWorldApplications: [
      "A foundational component inside complex algorithms like AES, DES, and ChaCha20.",
      "Malware obfuscation to evade basic static signature analysis.",
      "Simple data masking where high security is not required."
    ],
    codeSnippets: {
      python: "def xor_encrypt_decrypt(data, key):\n    return bytearray([b ^ key[i % len(key)] for i, b in enumerate(data)])",
      javascript: "function xorEncryptDecrypt(dataString, keyString) {\n  let output = '';\n  for (let i = 0; i < dataString.length; i++) {\n    const charCode = dataString.charCodeAt(i) ^ keyString.charCodeAt(i % keyString.length);\n    output += String.fromCharCode(charCode);\n  }\n  return output;\n}"
    },
    playgroundLink: "/visualizer/xor",
    references: [
      { title: "Wikipedia: XOR cipher", url: "https://en.wikipedia.org/wiki/XOR_cipher" }
    ]
  },
  {
    type: 'cipher',
    title: "One-Time Pad (OTP)",
    description: "An unbreakable encryption technique that requires a truly random, single-use key that is at least as long as the message.",
    overview: {
      history: "Patented by Gilbert Vernam in 1919 and proven to be perfectly secure by Claude Shannon in 1945, OTP was used heavily during the Cold War by intelligence agencies via physical paper pads.",
      description: "OTP is an additive cipher (often using XOR in digital contexts). Its absolute security relies on four strict rules: the key must be completely random, as long as the plaintext, never reused, and kept entirely secret."
    },
    mathematics: {
      encryptionFormula: "C_i = P_i \\oplus K_i",
      decryptionFormula: "P_i = C_i \\oplus K_i",
      explanation: [
        "P_i is the ith character of the plaintext.",
        "K_i is the ith character of the perfectly random key.",
        "In digital systems, the operation is typically bitwise XOR.",
        "Shannon proved that if K is uniformly distributed, C is perfectly uniformly distributed and yields zero information about P."
      ]
    },
    workedExample: {
      plaintext: "HELLO",
      parameters: "Random Key = 'XMCKL'",
      steps: [
        { description: "H (7) + X (23) mod 26 = 4", result: "E" },
        { description: "E (4) + M (12) mod 26 = 16", result: "Q" },
        { description: "L (11) + C (2) mod 26 = 13", result: "N" },
        { description: "L (11) + K (10) mod 26 = 21", result: "V" },
        { description: "O (14) + L (11) mod 26 = 25", result: "Z" }
      ],
      finalCiphertext: "EQNVZ"
    },
    complexity: "O(n) time complexity.",
    securityAnalysis: {
      advantages: [
        "Provides perfect, information-theoretic secrecy.",
        "Immune to all brute-force and quantum computing attacks."
      ],
      weaknesses: [
        "Key management is extremely difficult (the key distribution problem).",
        "If a key is reused (a 'two-time pad'), the system immediately fails.",
        "Requires a true random number generator (TRNG).",
        "No message integrity (vulnerable to malleability)."
      ]
    },
    realWorldApplications: [
      "Top-secret government and military communications.",
      "Numbers stations broadcasting espionage communications.",
      "Quantum key distribution (QKD) leverages OTP for its provable security."
    ],
    codeSnippets: {
      python: "import secrets\n\ndef generate_otp(length):\n    return [secrets.randbelow(256) for _ in range(length)]\n\ndef otp_encrypt(data_bytes, key_bytes):\n    assert len(data_bytes) == len(key_bytes)\n    return bytearray([d ^ k for d, k in zip(data_bytes, key_bytes)])",
      javascript: "function generateOTP(length) {\n  return crypto.getRandomValues(new Uint8Array(length));\n}\n\nfunction otpEncrypt(dataBytes, keyBytes) {\n  if (dataBytes.length !== keyBytes.length) throw new Error('Key length mismatch');\n  const out = new Uint8Array(dataBytes.length);\n  for (let i = 0; i < dataBytes.length; i++) {\n    out[i] = dataBytes[i] ^ keyBytes[i];\n  }\n  return out;\n}"
    },
    playgroundLink: "/visualizer/otp",
    references: [
      { title: "Wikipedia: One-time pad", url: "https://en.wikipedia.org/wiki/One-time_pad" },
      { title: "Claude Shannon: Communication Theory of Secrecy Systems", url: "https://archive.org/details/bellsystemtechni28amerrich/page/656/mode/2up" }
    ]
  }
];
