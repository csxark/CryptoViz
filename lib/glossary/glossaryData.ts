import { GlossaryTerm } from './types';

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'caesar-cipher',
    term: 'Caesar Cipher',
    aliases: ['Shift Cipher', 'Caesar Shift'],
    category: 'Symmetric',
    summary: 'Classical substitution cipher shifting alphabet characters by a fixed integer offset.',
    definition: 'A monoalphabetic substitution cipher where each character in plaintext is shifted a fixed number of positions down the alphabet. Named after Julius Caesar.',
    formula: 'E_k(x) = (x + k) \\pmod{26}',
    relatedCipherId: 'caesar',
    relatedDocSlug: 'caesar-cipher',
    tags: ['Classical', 'Substitution', 'Monoalphabetic']
  },
  {
    id: 'vigenere-cipher',
    term: 'Vigenère Cipher',
    aliases: ['Vigenere', 'Polyalphabetic Cipher'],
    category: 'Symmetric',
    summary: 'Polyalphabetic substitution cipher repeating a secret keyword to shift characters.',
    definition: 'A method of encrypting alphabetic text using a series of interwoven Caesar ciphers based on the letters of a keyword.',
    formula: 'C_i = (P_i + K_{i \\bmod m}) \\pmod{26}',
    relatedCipherId: 'vigenere',
    relatedDocSlug: 'vigenere-cipher',
    tags: ['Classical', 'Polyalphabetic', 'Keyword']
  },
  {
    id: 'aes',
    term: 'Advanced Encryption Standard',
    aliases: ['AES', 'Rijndael', 'AES-256', 'AES-128'],
    category: 'Symmetric',
    summary: 'Symmetric block cipher standard using 128-bit blocks and 128/192/256-bit keys.',
    definition: 'A specification for the encryption of electronic data established by the U.S. National Institute of Standards and Technology (NIST) in 2001, based on the Rijndael cipher.',
    formula: 'SubBytes \\rightarrow ShiftRows \\rightarrow MixColumns \\rightarrow AddRoundKey',
    relatedCipherId: 'aes',
    relatedDocSlug: 'aes-encryption',
    tags: ['Block Cipher', 'NIST', 'Symmetric']
  },
  {
    id: 'rsa',
    term: 'RSA Cryptosystem',
    aliases: ['RSA', 'RSA Encryption'],
    category: 'Asymmetric',
    summary: 'Public-key cryptosystem based on the mathematical difficulty of factoring large composite primes.',
    definition: 'An asymmetric cryptographic algorithm developed by Rivest, Shamir, and Adleman that relies on the practical difficulty of factoring the product of two large prime numbers.',
    formula: 'c = m^e \\pmod{n}, \\quad m = c^d \\pmod{n}',
    relatedCipherId: 'rsa',
    relatedDocSlug: 'rsa-cryptosystem',
    tags: ['Public Key', 'Factoring', 'Asymmetric']
  },
  {
    id: 'sha256',
    term: 'SHA-256',
    aliases: ['SHA256', 'Secure Hash Algorithm 256'],
    category: 'Hashing',
    summary: '256-bit cryptographic hash function belonging to the SHA-2 family.',
    definition: 'A cryptographic hash function designed by the NSA that outputs a fixed 256-bit (32-byte) digest. Widely used in TLS, digital signatures, and Bitcoin.',
    formula: 'H^{(i)} = h_0 + \\sum_{t=0}^{63} T_1 + T_2',
    relatedCipherId: 'sha256',
    relatedDocSlug: 'sha256-compression',
    tags: ['Hash', '256-bit', 'SHA-2']
  },
  {
    id: 'initialization-vector',
    term: 'Initialization Vector',
    aliases: ['IV', 'Init Vector'],
    category: 'Symmetric',
    summary: 'Arbitrary block of input used to randomize block cipher encryption modes.',
    definition: 'A fixed-size input to a cryptographic primitive that is typically required to be random or non-repeating to prevent identical plaintexts from yielding identical ciphertexts.',
    relatedCipherId: 'modes',
    relatedDocSlug: 'block-cipher-modes',
    tags: ['IV', 'Randomness', 'Cipher Modes']
  },
  {
    id: 'nonce',
    term: 'Nonce',
    aliases: ['Number Used Once'],
    category: 'Protocols',
    summary: 'An arbitrary number used only once in a cryptographic communication or protocol.',
    definition: 'A unique identifier or number used once to ensure that old communications cannot be reused in replay attacks.',
    relatedCipherId: 'chacha20',
    relatedDocSlug: 'block-cipher-modes',
    tags: ['Replay Attack', 'Uniqueness', 'Protocol']
  },
  {
    id: 'salt',
    term: 'Cryptographic Salt',
    aliases: ['Salt'],
    category: 'Hashing',
    summary: 'Random data added as an additional input to a one-way function that hashes passwords.',
    definition: 'Random bytes combined with a password before hashing to defend against dictionary attacks and pre-computed rainbow table lookups.',
    relatedCipherId: 'pbkdf2',
    relatedDocSlug: 'key-derivation',
    tags: ['Password Security', 'Rainbow Tables', 'KDF']
  },
  {
    id: 'diffie-hellman',
    term: 'Diffie-Hellman Key Exchange',
    aliases: ['Diffie-Hellman', 'DH', 'ECDH'],
    category: 'Asymmetric',
    summary: 'Mathematical protocol enabling two parties to establish a shared secret over an insecure channel.',
    definition: 'A method of securely exchanging cryptographic keys over a public channel without prior shared secrets, based on the discrete logarithm problem.',
    formula: 'g^{ab} \\pmod{p} = (g^a)^b \\pmod{p} = (g^b)^a \\pmod{p}',
    relatedCipherId: 'dh',
    relatedDocSlug: 'diffie-hellman',
    tags: ['Key Agreement', 'Discrete Log', 'Asymmetric']
  },
  {
    id: 'merkle-tree',
    term: 'Merkle Tree',
    aliases: ['Hash Tree', 'Merkle Proof'],
    category: 'Hashing',
    summary: 'Binary tree of hashes used for efficient and secure verification of large data structures.',
    definition: 'A tree in which every leaf node is labelled with the cryptographic hash of a data block, and every non-leaf node is labelled with the cryptographic hash of its child nodes.',
    relatedCipherId: 'merkle',
    relatedDocSlug: 'merkle-trees',
    tags: ['Binary Tree', 'Data Integrity', 'Blockchain']
  },
  {
    id: 'brute-force',
    term: 'Brute Force Attack',
    aliases: ['Brute Force', 'Exhaustive Key Search'],
    category: 'Attacks',
    summary: 'Cryptanalytic attack systematically checking all possible keys until the correct one is found.',
    definition: 'An attack method consisting of trying every possible combination or key until the correct secret is discovered.',
    relatedCipherId: 'brute-force',
    relatedDocSlug: 'brute-force-attack',
    tags: ['Cryptanalysis', 'Key Search', 'Exhaustive']
  },
  {
    id: 'avalanche-effect',
    term: 'Avalanche Effect',
    aliases: ['Strict Avalanche Criterion', 'SAC'],
    category: 'Symmetric',
    summary: 'Property where flipping a single input bit changes approximately 50% of output bits.',
    definition: 'A desirable property of cryptographic algorithms (ciphers and hashes) where a small change in input results in a drastic, unpredictable change in output.',
    relatedCipherId: 'avalanche',
    relatedDocSlug: 'avalanche-effect',
    tags: ['Diffusion', 'Confusion', 'Bit Flip']
  },
  {
    id: 'kdf',
    term: 'Key Derivation Function',
    aliases: ['KDF', 'PBKDF2', 'Argon2', 'HKDF'],
    category: 'Hashing',
    summary: 'Function deriving one or more secret keys from a master secret or password.',
    definition: 'A cryptographic algorithm that derives one or more secret keys from a secret value such as a master key or password using pseudorandom functions.',
    relatedCipherId: 'pbkdf2',
    relatedDocSlug: 'key-derivation',
    tags: ['Key Derivation', 'Password Hashing', 'PBKDF2']
  },
  {
    id: 'pqc',
    term: 'Post-Quantum Cryptography',
    aliases: ['PQC', 'Quantum-Resistant', 'Kyber', 'Dilithium'],
    category: 'Asymmetric',
    summary: 'Cryptographic algorithms resistant to cryptanalysis by quantum computers.',
    definition: 'Cryptographic algorithms (usually public-key algorithms) that are thought to be secure against attack by quantum computers, such as lattice-based cryptography.',
    relatedCipherId: 'kyber',
    relatedDocSlug: 'pqc-standards',
    tags: ['Quantum', 'Lattice Cryptography', 'NIST PQC']
  },
  {
    id: 'mac',
    term: 'Message Authentication Code',
    aliases: ['MAC', 'HMAC'],
    category: 'Protocols',
    summary: 'Short piece of information used to authenticate a message and confirm its integrity.',
    definition: 'A cryptographic code used to verify the integrity and authenticity of a message using a shared secret key.',
    formula: 'HMAC(K, m) = H((K\' \\oplus opad) \\parallel H((K\' \\oplus ipad) \\parallel m))',
    tags: ['Integrity', 'Authenticity', 'HMAC']
  }
];

export function getGlossaryTermById(id: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find(t => t.id === id);
}

export function searchGlossaryTerms(query: string): GlossaryTerm[] {
  const q = query.toLowerCase().trim();
  if (!q) return GLOSSARY_TERMS;
  return GLOSSARY_TERMS.filter(t =>
    t.term.toLowerCase().includes(q) ||
    t.summary.toLowerCase().includes(q) ||
    t.definition.toLowerCase().includes(q) ||
    (t.aliases && t.aliases.some(a => a.toLowerCase().includes(q))) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
}
