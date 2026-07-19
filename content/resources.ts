/**
 * Curated cryptography learning resource registry.
 * Every entry must conform to the Resource interface defined below.
 * @see GUIDELINES.md "Resource Registry Rules"
 */

export type ResourceTag =
  | 'symmetric'
  | 'asymmetric'
  | 'classical'
  | 'hash'
  | 'attacks'
  | 'standard'
  | 'tls'
  | 'signatures'
  | 'pki'
  | 'certificates'
  | 'course'
  | 'tool'

export interface Resource {
  id: string
  title: string
  url: string
  source: string
  description: string
  tags: ResourceTag[]
  readingTime: number
  type: 'article' | 'paper' | 'tool' | 'video' | 'course'
  addedAt: string
}

export const RESOURCES: Resource[] = [
  {
    id: 'nist-fips-197-aes',
    title: 'NIST FIPS 197: Advanced Encryption Standard',
    url: 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197-upd1.pdf',
    source: 'NIST',
    description:
      'Official AES specification defining the Rijndael algorithm, S-Box construction, key expansion schedule, and round operations for 128/192/256-bit key sizes.',
    tags: ['symmetric', 'standard'],
    readingTime: 45,
    type: 'paper',
    addedAt: '2026-07-19',
  },
  {
    id: 'rfc-8446-tls13',
    title: 'RFC 8446: The Transport Layer Security Protocol Version 1.3',
    url: 'https://www.rfc-editor.org/rfc/rfc8446',
    source: 'IETF',
    description:
      'Full specification of TLS 1.3 — the protocol securing most HTTPS traffic. Covers the handshake protocol, record layer, and supported cipher suites.',
    tags: ['tls', 'asymmetric', 'standard'],
    readingTime: 120,
    type: 'paper',
    addedAt: '2026-07-19',
  },
  {
    id: 'boneh-shoup-grad-crypto',
    title: 'A Graduate Course in Applied Cryptography',
    url: 'https://toc.cryptobook.us/',
    source: 'Dan Boneh & Victor Shoup (Stanford)',
    description:
      'Free textbook covering symmetric encryption, MACs, hash functions, public-key cryptography, and authenticated protocols. Seminal reference freely available online.',
    tags: ['symmetric', 'asymmetric', 'hash', 'course'],
    readingTime: 600,
    type: 'course',
    addedAt: '2026-07-19',
  },
  {
    id: 'cryptopals-challenges',
    title: 'Cryptopals Crypto Challenges',
    url: 'https://cryptopals.com/',
    source: 'Cryptopals',
    description:
      'Hands-on cryptography attack challenges. Implement and break real-world constructions: CBC padding oracle, MT19937 cloning, RSA e=3 broadcast attack, and more.',
    tags: ['symmetric', 'classical', 'attacks'],
    readingTime: 480,
    type: 'tool',
    addedAt: '2026-07-19',
  },
  {
    id: 'nist-sp-800-175b',
    title: 'NIST SP 800-175B: Guideline for Using Cryptographic Standards',
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-175Br1.pdf',
    source: 'NIST',
    description:
      'Practical guidance on selecting approved cryptographic algorithms, key lengths, and modes of operation. Ideal companion to the AES and SHA visualizers.',
    tags: ['standard', 'symmetric', 'hash'],
    readingTime: 60,
    type: 'article',
    addedAt: '2026-07-19',
  },
  {
    id: 'rfc-3174-sha1',
    title: 'RFC 3174: US Secure Hash Algorithm 1 (SHA1)',
    url: 'https://www.rfc-editor.org/rfc/rfc3174',
    source: 'IETF',
    description:
      'Official SHA-1 specification defining the 160-bit hash function with test vectors and a C reference implementation. Historical reference — SHA-1 is broken.',
    tags: ['hash', 'standard'],
    readingTime: 20,
    type: 'paper',
    addedAt: '2026-07-19',
  },
  {
    id: 'shattered-collision-attack',
    title: 'SHAttered — First Practical SHA-1 Collision',
    url: 'https://shattered.io/',
    source: 'CWI Amsterdam & Google Security',
    description:
      'Official site for the first practical SHA-1 collision (2017). Includes the two colliding PDFs, a technical overview of the differential path attack, and detection tools.',
    tags: ['hash', 'attacks'],
    readingTime: 15,
    type: 'article',
    addedAt: '2026-07-19',
  },
  {
    id: 'nist-fips-186-5-dss',
    title: 'NIST FIPS 186-5: Digital Signature Standard',
    url: 'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf',
    source: 'NIST',
    description:
      'Current DSS standard approving RSA, ECDSA, and EdDSA for digital signatures. Defines approved curves, minimum key sizes, and hash function pairings.',
    tags: ['asymmetric', 'signatures', 'standard'],
    readingTime: 40,
    type: 'paper',
    addedAt: '2026-07-19',
  },
  {
    id: 'rfc-5280-x509-pki',
    title: 'RFC 5280: X.509 PKI Certificate and CRL Profile',
    url: 'https://www.rfc-editor.org/rfc/rfc5280',
    source: 'IETF',
    description:
      'Specification for X.509 certificate structure, certificate chains, trust anchors, and certificate revocation lists (CRLs) used in TLS and code signing.',
    tags: ['pki', 'certificates', 'asymmetric', 'standard'],
    readingTime: 90,
    type: 'paper',
    addedAt: '2026-07-19',
  },
  {
    id: 'cyberchef-gchq',
    title: 'CyberChef — The Cyber Swiss Army Knife',
    url: 'https://gchq.github.io/CyberChef/',
    source: 'GCHQ',
    description:
      'Browser-based tool for encoding, encrypting, compressing, and analysing data. Supports AES, DES, XOR, Base64, hex encoding, and dozens of other cipher operations.',
    tags: ['symmetric', 'classical', 'tool'],
    readingTime: 5,
    type: 'tool',
    addedAt: '2026-07-19',
  },
]