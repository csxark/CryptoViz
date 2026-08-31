import { CIPHER_REGISTRY, CipherDefinition } from '../cipher/registry'

export type SecurityGoal =
  | 'all'
  | 'confidentiality'
  | 'integrity'
  | 'password'
  | 'signature'
  | 'key_exchange'
  | 'post_quantum'

export type TargetEnvironment =
  | 'all'
  | 'web_server'
  | 'mobile'
  | 'iot_embedded'
  | 'database'
  | 'quantum_safe'

export interface UseCasePreset {
  id: string
  title: string
  icon: string
  category: string
  description: string
  recommendedCipherIds: string[]
  goal: SecurityGoal
  environment: TargetEnvironment
  highlights: string[]
}

export interface RecommendationQuery {
  goal?: SecurityGoal
  environment?: TargetEnvironment
  searchQuery?: string
  onlyRecommended?: boolean
}

export interface CipherRecommendation {
  cipher: CipherDefinition
  matchScore: number // 0 to 100
  badgeLabel: string
  rationale: string
  tradeOffs: string
  bestFor: string
  sampleCode: {
    javascript: string
    python: string
  }
}

export const USE_CASE_PRESETS: UseCasePreset[] = [
  {
    id: 'web_api',
    title: 'Web & API Security',
    icon: '🌐',
    category: 'Network & Web',
    description: 'Encrypting REST APIs, web traffic, and HTTPS/TLS session communications.',
    recommendedCipherIds: ['aes', 'chacha20-poly1305'],
    goal: 'confidentiality',
    environment: 'web_server',
    highlights: ['AEAD Mode Required', 'Hardware AES-NI Supported', 'TLS 1.3 Compatible'],
  },
  {
    id: 'password_storage',
    title: 'Password Hashing & Key Derivation',
    icon: '🔑',
    category: 'Auth & Identity',
    description: 'Safely storing user passwords in databases using memory-hard KDF functions and password hashing algorithms.',
    recommendedCipherIds: ['argon2', 'bcrypt', 'pbkdf2'],
    goal: 'password',
    environment: 'web_server',
    highlights: ['Memory-Hard Hashing', 'Salting & Work Factor', 'Brute-Force Resistant'],
  },
  {
    id: 'iot_embedded',
    title: 'IoT & Embedded Microcontrollers',
    icon: '📱',
    category: 'Hardware Constrained',
    description: 'Low-memory microcontrollers or mobile chips lacking AES hardware acceleration.',
    recommendedCipherIds: ['chacha20-poly1305', 'ascon', 'speck'],
    goal: 'confidentiality',
    environment: 'iot_embedded',
    highlights: ['Fast in Pure Software', 'Low Energy Footprint', 'Constant Time Execution'],
  },
  {
    id: 'database_fde',
    title: 'File & Database Storage',
    icon: '💾',
    category: 'Storage & Disk',
    description: 'Encrypting databases, cloud backups, and disk partitions (BitLocker/FileVault).',
    recommendedCipherIds: ['aes', 'aes-xts'],
    goal: 'confidentiality',
    environment: 'database',
    highlights: ['Sector-level XTS Mode', 'FIPS 140-3 Compliant', 'High Throughput'],
  },
  {
    id: 'digital_signatures',
    title: 'Digital Signatures & Identity',
    icon: '✍️',
    category: 'Auth & Integrity',
    description: 'Authenticating software releases, API JWT tokens, and TLS certificates.',
    recommendedCipherIds: ['ecdsa', 'rsa', 'ed25519'],
    goal: 'signature',
    environment: 'web_server',
    highlights: ['Asymmetric Keypair', 'Non-Repudiation', 'Compact Key Sizes'],
  },
  {
    id: 'post_quantum',
    title: 'Post-Quantum Preparedness',
    icon: '⚛️',
    category: 'Next-Gen Cryptography',
    description: 'Future-proofing data against quantum computer decryption attacks (NIST PQC).',
    recommendedCipherIds: ['ml-kem', 'ml-dsa'],
    goal: 'post_quantum',
    environment: 'quantum_safe',
    highlights: ['NIST FIPS 203/204 Standard', 'Lattice-Based Cryptography', 'Quantum Resistant'],
  },
]

const SAMPLE_CODE_DATABASE: Record<string, { javascript: string; python: string }> = {
  aes: {
    javascript: `import { webcrypto } from 'node:crypto';
const key = await webcrypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const ciphertext = await webcrypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode('Sensitive Payload')
);`,
    python: `from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
ciphertext = aesgcm.encrypt(nonce, b"Sensitive Payload", None)`,
  },
  'chacha20-poly1305': {
    javascript: `import { createCipheriv, randomBytes } from 'crypto';
const key = randomBytes(32);
const nonce = randomBytes(12);
const cipher = createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
let encrypted = cipher.update('Payload data', 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');`,
    python: `from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
import os

key = ChaCha20Poly1305.generate_key()
chacha = ChaCha20Poly1305(key)
nonce = os.urandom(12)
ciphertext = chacha.encrypt(nonce, b"Payload data", None)`,
  },
  hmac: {
    javascript: `import { createHmac } from 'crypto';

const hmac = createHmac('sha256', 'SecretKey123');
hmac.update('UserPasswordOrToken');
const digest = hmac.digest('hex');`,
    python: `import hmac
import hashlib

digest = hmac.new(b'SecretKey123', b'UserPasswordOrToken', hashlib.sha256).hexdigest()`,
  },
  rsa: {
    javascript: `import { generateKeyPairSync, publicEncrypt, privateDecrypt } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const encrypted = publicEncrypt(publicKey, Buffer.from('Secret Token'));
const decrypted = privateDecrypt(privateKey, encrypted);`,
    python: `from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = private_key.public_key()
ciphertext = public_key.encrypt(b"Secret Token", padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))`,
  },
  argon2: {
    javascript: `import argon2 from 'argon2';
const hash = await argon2.hash('UserPassword', {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2
});`,
    python: `from argon2 import PasswordHasher
ph = PasswordHasher()
hash = ph.hash("UserPassword")`,
  },
  bcrypt: {
    javascript: `import bcrypt from 'bcrypt';
const saltRounds = 12;
const hash = await bcrypt.hash('UserPassword', saltRounds);`,
    python: `import bcrypt
hashed = bcrypt.hashpw(b"UserPassword", bcrypt.gensalt(rounds=12))`,
  },
  pbkdf2: {
    javascript: `import { pbkdf2 } from 'crypto';
pbkdf2('UserPassword', 'salt', 600000, 32, 'sha256', (err, derivedKey) => {
  console.log(derivedKey.toString('hex'));
});`,
    python: `import hashlib
key = hashlib.pbkdf2_hmac('sha256', b'UserPassword', b'salt', 600000)`,
  },
}

export function recommendCiphersByUseCase(
  query: RecommendationQuery = {}
): CipherRecommendation[] {
  const { goal = 'all', environment = 'all', searchQuery = '', onlyRecommended = false } = query
  const searchLower = searchQuery.toLowerCase().trim()

  const recommendations: CipherRecommendation[] = []

  CIPHER_REGISTRY.forEach((cipher) => {
    if (onlyRecommended && cipher.securityStatus !== 'recommended' && cipher.securityStatus !== 'secure') {
      return
    }

    if (
      searchLower &&
      !cipher.name.toLowerCase().includes(searchLower) &&
      !cipher.id.toLowerCase().includes(searchLower) &&
      !cipher.category.toLowerCase().includes(searchLower) &&
      !cipher.description.toLowerCase().includes(searchLower)
    ) {
      return
    }

    let matchScore = 70
    let badgeLabel = 'Suitable Option'
    let rationale = cipher.description
    let tradeOffs = 'Standard cryptographic trade-offs apply.'
    let bestFor = 'General cryptographic tasks'

    // Calculate suitability score based on category & security status
    if (cipher.securityStatus === 'recommended') {
      matchScore += 20
      badgeLabel = 'Top Industry Pick'
    } else if (cipher.securityStatus === 'secure') {
      matchScore += 10
      badgeLabel = 'Secure Choice'
    } else if (cipher.securityStatus === 'legacy') {
      matchScore -= 20
      badgeLabel = 'Legacy System Use'
    } else if (cipher.securityStatus === 'broken' || cipher.securityStatus === 'deprecated') {
      matchScore -= 50
      badgeLabel = 'Educational Only'
    }

    // Goal matching adjustments
    if (goal === 'confidentiality' && (cipher.category === 'symmetric' || cipher.category === 'asymmetric')) {
      matchScore += 10
    } else if (
      goal === 'password' &&
      (cipher.id === 'argon2' || cipher.id === 'bcrypt' || cipher.id === 'pbkdf2' || cipher.id === 'scrypt')
    ) {
      matchScore += 25
      badgeLabel = 'Password Hashing'
    } else if (
      goal === 'password' &&
      (cipher.id === 'hmac' || cipher.id === 'sha256' || cipher.id === 'sha512')
    ) {
      matchScore -= 35
      badgeLabel = 'Fast Hash Warning'
      rationale =
        'Fast general-purpose hashes (SHA-256, SHA-512) and HMAC are NOT suitable for password storage because they lack memory hardness and work factors, making them highly vulnerable to offline GPU brute-force attacks. Use dedicated password KDFs like Argon2id, Bcrypt, or PBKDF2.'
      tradeOffs =
        'Fast hash throughput allows attackers to test billions of candidate passwords per second. Slow, salted KDFs are required.'
    } else if (goal === 'post_quantum' && (cipher.id.includes('ml-') || cipher.id.includes('kyber') || cipher.id.includes('dilithium'))) {
      matchScore += 30
      badgeLabel = 'Quantum-Resistant'
    }

    // Environment matching adjustments
    if (environment === 'iot_embedded' && (cipher.id.includes('chacha') || cipher.id === 'ascon' || cipher.id === 'speck' || cipher.id === 'simon')) {
      matchScore += 20
      badgeLabel = 'Optimized for IoT'
    } else if (environment === 'web_server' && (cipher.id === 'aes' || cipher.id === 'chacha20-poly1305' || cipher.id === 'hmac')) {
      matchScore += 15
    }

    // Special rationale & code snippets overrides
    if (cipher.id === 'aes') {
      rationale = 'AES (GCM/XTS) is the gold standard for symmetric encryption worldwide. It features dedicated CPU hardware acceleration (AES-NI) on modern x86 and ARM processors.'
      tradeOffs = 'Requires hardware acceleration for top performance; without AES-NI, software-only performance can be slower than ChaCha20.'
      bestFor = 'Web applications, TLS/HTTPS, BitLocker/LUKS disk encryption, AWS KMS.'
    } else if (cipher.id === 'chacha20-poly1305' || cipher.id === 'chacha20') {
      rationale = 'ChaCha20-Poly1305 is a high-speed AEAD stream cipher designed to run extremely fast in software without requiring specialized hardware instructions.'
      tradeOffs = 'Requires strict 96-bit nonce uniqueness per key to prevent security compromises.'
      bestFor = 'Mobile devices, IoT microcontrollers, WireGuard VPN, Android apps.'
    } else if (cipher.id === 'hmac' && goal !== 'password') {
      rationale = 'HMAC-SHA256 provides keyed message authentication and integrity verification, ensuring data cannot be altered by an unauthorized party.'
      tradeOffs = 'Requires both parties to hold the pre-shared secret key securely.'
      bestFor = 'API authentication tokens, JWT signatures, session integrity, password MAC.'
    } else if (cipher.id === 'rsa') {
      rationale = 'Widely adopted public-key cryptosystem used for key transport and digital signatures.'
      tradeOffs = 'Requires large key sizes (minimum 2048/3072 bits) compared to ECC.'
      bestFor = 'HTTPS SSL certificates, SSH authentication, legacy PKI systems.'
    }

    const sampleCode = SAMPLE_CODE_DATABASE[cipher.id] || {
      javascript: `// Implementation example for ${cipher.name}\n// Refer to standard CryptoViz visualizer / Web Crypto API`,
      python: `# Implementation example for ${cipher.name}\n# Use standard cryptography or hashlib library`,
    }

    recommendations.push({
      cipher,
      matchScore: Math.min(100, Math.max(10, matchScore)),
      badgeLabel,
      rationale,
      tradeOffs,
      bestFor,
      sampleCode,
    })
  })

  return recommendations.sort((a, b) => b.matchScore - a.matchScore)
}
