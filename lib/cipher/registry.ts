export interface CipherDefinition {
  id: string
  name: string
  category: 'classical' | 'symmetric' | 'hash' | 'asymmetric'
  description: string
  defaultKey: string
  defaultInput: string
  securityStatus: 'secure' | 'deprecated' | 'broken'
  keyPlaceholder?: string
  options?: {
    name: string
    id: string
    type: 'number' | 'text' | 'boolean' | 'select'
    default: any
    choices?: { label: string; value: any }[]
  }[]
}

export const CIPHER_REGISTRY: CipherDefinition[] = [
  // Classical
  {
    id: 'caesar',
    name: 'Caesar Cipher',
    category: 'classical',
    description: 'A simple shift substitution cipher where each letter in the plaintext is shifted by a fixed number of positions.',
    defaultKey: '3',
    defaultInput: 'Hello, World!',
    securityStatus: 'broken',
    keyPlaceholder: 'Shift (e.g. 3)',
  },
  {
    id: 'rot13',
    name: 'ROT13',
    category: 'classical',
    description: 'A special case of Caesar cipher with a fixed shift value of 13.',
    defaultKey: '',
    defaultInput: 'Hello, World!',
    securityStatus: 'broken',
  },
  {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    category: 'classical',
    description: 'A polyalphabetic substitution cipher that uses a keyword to shift characters in repeating cycles.',
    defaultKey: 'LEMON',
    defaultInput: 'ATTACKATDAWN',
    securityStatus: 'broken',
    keyPlaceholder: 'Keyword (e.g. LEMON)',
  },
  {
    id: 'atbash',
    name: 'Atbash Cipher',
    category: 'classical',
    description: 'A monoalphabetic substitution cipher formed by reversing the alphabet (A becomes Z, B becomes Y, etc.).',
    defaultKey: '',
    defaultInput: 'Hello, World!',
    securityStatus: 'broken',
  },
  {
    id: 'playfair',
    name: 'Playfair Cipher',
    category: 'classical',
    description: 'A polygraphic substitution cipher that encrypts pairs of letters using a dynamic 5x5 key matrix.',
    defaultKey: 'PLAYFAIR EXAMPLE',
    defaultInput: 'HIDE THE GOLD IN THE TREE STUMP',
    securityStatus: 'broken',
    keyPlaceholder: 'Key phrase',
  },
  {
    id: 'railfence',
    name: 'Rail Fence Cipher',
    category: 'classical',
    description: 'A transposition cipher where plaintext is written diagonally down and up on successive "rails" of a fence.',
    defaultKey: '3',
    defaultInput: 'WE ARE DISCOVERED FLEE AT ONCE',
    securityStatus: 'broken',
    keyPlaceholder: 'Number of rails (e.g. 3)',
  },
  // Symmetric
  {
    id: 'xor',
    name: 'XOR Cipher',
    category: 'symmetric',
    description: 'A simple stream cipher performing byte-wise XOR operations between plaintext and key.',
    defaultKey: 'secret',
    defaultInput: 'Hello, World!',
    securityStatus: 'deprecated',
    keyPlaceholder: 'Secret key string',
  },
  {
    id: 'otp',
    name: 'One-Time Pad (OTP)',
    category: 'symmetric',
    description: 'An unbreakable cipher when used with a truly random, single-use key of equal length to the plaintext.',
    defaultKey: 'supersecretkeystring',
    defaultInput: 'Hello, World!',
    securityStatus: 'secure',
    keyPlaceholder: 'Key (must match or exceed input length)',
  },
  {
    id: 'des',
    name: 'DES',
    category: 'symmetric',
    description: 'Data Encryption Standard. A legacy 64-bit block cipher utilizing a 56-bit key size.',
    defaultKey: '133457799BBCDDF1',
    defaultInput: '0123456789ABCDEF',
    securityStatus: 'broken',
    keyPlaceholder: '16-character hex key',
    options: [
      {
        name: 'Hex Input Mode',
        id: 'hexInput',
        type: 'boolean',
        default: true,
      },
    ],
  },
  {
    id: '3des',
    name: '3DES (Triple DES)',
    category: 'symmetric',
    description: 'Applies the DES algorithm three times to each data block with two or three keys to increase security.',
    defaultKey: '0123456789ABCDEF0123456789ABCDEF',
    defaultInput: 'Hello, World!',
    securityStatus: 'deprecated',
    keyPlaceholder: '32-character hex key (2-Key) or 48-character (3-Key)',
    options: [
      {
        name: 'Hex Input Mode',
        id: 'hexInput',
        type: 'boolean',
        default: false,
      },
    ],
  },
  {
    id: 'aes',
    name: 'AES',
    category: 'symmetric',
    description: 'Advanced Encryption Standard. A highly secure, standard block cipher supporting key sizes of 128, 192, or 256 bits.',
    defaultKey: '000102030405060708090a0b0c0d0e0f',
    defaultInput: '00112233445566778899aabbccddeeff',
    securityStatus: 'secure',
    keyPlaceholder: '32/48/64-character hex key',
    options: [
      {
        name: 'Hex Input Mode',
        id: 'hexInput',
        type: 'boolean',
        default: true,
      },
    ],
  },
  // Hash
  {
    id: 'sha256',
    name: 'SHA-256',
    category: 'hash',
    description: 'Secure Hash Algorithm 2. Produces a unique 256-bit (32-byte) hash output representing the input message.',
    defaultKey: '',
    defaultInput: 'abc',
    securityStatus: 'secure',
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    category: 'hash',
    description: 'Secure Hash Algorithm 2 with 64-bit words, producing a secure 512-bit (64-byte) digest.',
    defaultKey: '',
    defaultInput: 'abc',
    securityStatus: 'secure',
  },
  {
    id: 'md5',
    name: 'MD5',
    category: 'hash',
    description: 'A widely used legacy hash producing a 128-bit output. Cryptographically broken due to collision vulnerabilities.',
    defaultKey: '',
    defaultInput: 'abc',
    securityStatus: 'broken',
  },
  {
    id: 'hmac',
    name: 'HMAC-SHA256',
    category: 'hash',
    description: 'Keyed-hash Message Authentication Code. Combines SHA-256 with a cryptographic secret key.',
    defaultKey: 'Jefe',
    defaultInput: 'what do ya want for nothing?',
    securityStatus: 'secure',
    keyPlaceholder: 'HMAC Secret Key',
  },
  {
    id: 'bcrypt',
    name: 'Bcrypt',
    category: 'hash',
    description: 'A password hashing function incorporating a salt and cost factor, designed to be slow to prevent brute force.',
    defaultKey: 'password',
    defaultInput: 'password',
    securityStatus: 'secure',
    options: [
      {
        name: 'Rounds (Cost)',
        id: 'rounds',
        type: 'number',
        default: 4,
      },
    ],
  },
  // Asymmetric
  {
    id: 'rsa',
    name: 'RSA-2048',
    category: 'asymmetric',
    description: 'An asymmetric cipher based on the difficulty of factoring large semiprimes. Supports key generation, encryption, and decryption.',
    defaultKey: '61,53,17',
    defaultInput: 'HELLO',
    securityStatus: 'secure',
    keyPlaceholder: 'Enter: 3 values (p,q,e) or 2 values (n,e / n,d) if you already have n',
    options: [
      {
        name: 'Demo Mode (Small Primes)',
        id: 'demoMode',
        type: 'boolean',
        default: true,
      },
    ],
  },
  {
    id: 'dh',
    name: 'Diffie-Hellman',
    category: 'asymmetric',
    description: 'A key exchange protocol enabling two parties to establish a shared secret over an insecure channel.',
    defaultKey: '23,5',
    defaultInput: '6,15',
    securityStatus: 'secure',
    keyPlaceholder: 'p,g parameters (e.g. 23,5)',
    options: [
      {
        name: 'Bob Secret input (demo)',
        id: 'bobSecret',
        type: 'text',
        default: '15',
      },
    ],
  },
  {
    id: 'ecc',
    name: 'ECC (ECDSA P-256)',
    category: 'asymmetric',
    description: 'Elliptic Curve Cryptography. Implements ECDSA signing and verification over the NIST P-256 curve.',
    defaultKey: '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20',
    defaultInput: 'hello',
    securityStatus: 'secure',
    keyPlaceholder: '32-byte private key hex (64 chars)',
  },
]
