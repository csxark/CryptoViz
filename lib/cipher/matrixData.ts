import { CIPHER_REGISTRY } from './registry'

export interface MatrixEntry {
  id: string
  name: string
  category: 'classical' | 'symmetric' | 'hash' | 'asymmetric'
  blockSize: string
  keySize: string
  securityStatus: 'secure' | 'legacy' | 'deprecated' | 'broken'
  speed: string
  applications: string[]
}

const getCipherAttr = (id: string, key: keyof MatrixEntry) => {
  const cipher = CIPHER_REGISTRY.find((c) => c.id === id)
  return cipher ? cipher[key as keyof typeof cipher] : ''
}

export const ALGORITHM_MATRIX_DATA: MatrixEntry[] = [
  // Symmetric
  {
    id: 'aes',
    name: 'AES',
    category: 'symmetric',
    blockSize: '128-bit',
    keySize: '128, 192, 256-bit',
    securityStatus: 'secure',
    speed: 'Very Fast (Hardware Accelerated)',
    applications: ['Disk Encryption', 'TLS', 'VPNs', 'General Purpose'],
  },
  {
    id: 'chacha20-poly1305',
    name: 'ChaCha20-Poly1305',
    category: 'symmetric',
    blockSize: '512-bit (internal)',
    keySize: '256-bit',
    securityStatus: 'secure',
    speed: 'Fast (Software)',
    applications: ['TLS 1.3', 'WireGuard', 'Mobile Devices'],
  },
  {
    id: '3des',
    name: '3DES',
    category: 'symmetric',
    blockSize: '64-bit',
    keySize: '112 or 168-bit',
    securityStatus: 'deprecated',
    speed: 'Slow',
    applications: ['Legacy Financial Systems'],
  },
  {
    id: 'des',
    name: 'DES',
    category: 'symmetric',
    blockSize: '64-bit',
    keySize: '56-bit',
    securityStatus: 'broken',
    speed: 'Moderate',
    applications: ['Legacy Systems', 'Educational'],
  },
  {
    id: 'aes-xts',
    name: 'AES-XTS',
    category: 'symmetric',
    blockSize: '128-bit',
    keySize: '256 or 512-bit (two keys)',
    securityStatus: 'secure',
    speed: 'Fast',
    applications: ['Disk Encryption (BitLocker, FileVault)'],
  },
  {
    id: 'camellia',
    name: 'Camellia',
    category: 'symmetric',
    blockSize: '128-bit',
    keySize: '128, 192, 256-bit',
    securityStatus: 'secure',
    speed: 'Fast',
    applications: ['TLS', 'IPsec', 'Smart Cards'],
  },
  {
    id: 'serpent',
    name: 'Serpent',
    category: 'symmetric',
    blockSize: '128-bit',
    keySize: '128, 192, 256-bit',
    securityStatus: 'secure',
    speed: 'Moderate (High Security Margin)',
    applications: ['High-Security Storage'],
  },
  // Hash
  {
    id: 'sha256',
    name: 'SHA-256',
    category: 'hash',
    blockSize: '512-bit (block)',
    keySize: 'N/A',
    securityStatus: 'secure',
    speed: 'Fast',
    applications: ['Digital Signatures', 'Certificates', 'Blockchain'],
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    category: 'hash',
    blockSize: '1024-bit (block)',
    keySize: 'N/A',
    securityStatus: 'secure',
    speed: 'Fast (64-bit Systems)',
    applications: ['High-Security Signatures', 'Key Derivation'],
  },
  {
    id: 'md5',
    name: 'MD5',
    category: 'hash',
    blockSize: '512-bit (block)',
    keySize: 'N/A',
    securityStatus: 'broken',
    speed: 'Very Fast',
    applications: ['Non-Cryptographic Checksums'],
  },
  {
    id: 'bcrypt',
    name: 'Bcrypt',
    category: 'hash',
    blockSize: 'N/A',
    keySize: 'N/A',
    securityStatus: 'secure',
    speed: 'Slow (Intentional)',
    applications: ['Password Hashing'],
  },
  {
    id: 'shake128',
    name: 'SHAKE128',
    category: 'hash',
    blockSize: '1344-bit (rate)',
    keySize: 'N/A',
    securityStatus: 'secure',
    speed: 'Fast',
    applications: ['Key Generation', 'Custom Hashes', 'Post-Quantum'],
  },
  // Asymmetric
  {
    id: 'rsa',
    name: 'RSA-2048',
    category: 'asymmetric',
    blockSize: '2048-bit (max input)',
    keySize: '2048 to 4096-bit',
    securityStatus: 'secure',
    speed: 'Slow',
    applications: ['Digital Signatures', 'Key Exchange'],
  },
  {
    id: 'ecc',
    name: 'ECC (P-256)',
    category: 'asymmetric',
    blockSize: 'N/A',
    keySize: '256-bit',
    securityStatus: 'secure',
    speed: 'Fast (compared to RSA)',
    applications: ['TLS', 'Mobile Cryptography', 'IoT'],
  },
  {
    id: 'dh',
    name: 'Diffie-Hellman',
    category: 'asymmetric',
    blockSize: 'N/A',
    keySize: '2048-bit+',
    securityStatus: 'secure',
    speed: 'Moderate',
    applications: ['Key Exchange (Forward Secrecy)'],
  },
  // Classical
  {
    id: 'caesar',
    name: 'Caesar Cipher',
    category: 'classical',
    blockSize: '1 char',
    keySize: '1 number',
    securityStatus: 'broken',
    speed: 'Instant',
    applications: ['Educational', 'Puzzle Games'],
  },
  {
    id: 'vigenere',
    name: 'Vigenère Cipher',
    category: 'classical',
    blockSize: '1 char',
    keySize: 'Variable length string',
    securityStatus: 'broken',
    speed: 'Instant',
    applications: ['Educational', 'Historical Context'],
  },
]
