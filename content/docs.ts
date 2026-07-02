export interface DocMeta {
  id: string
  title: string
  description: string
  readingTime: string
  category: 'General' | 'Ciphers'
  filePath: string
}

export const DOC_METAS: DocMeta[] = [
  {
    id: 'introduction',
    title: 'Introduction to Cryptography',
    description: 'A beginner-friendly overview of cryptography, its history, and why visualizing algorithms helps you learn faster.',
    readingTime: '8 min',
    category: 'General',
    filePath: 'content/docs/introduction.mdx',
  },
  {
    id: 'symmetric-vs-asymmetric',
    title: 'Symmetric vs Asymmetric Cryptography',
    description: 'A detailed comparison of symmetric and asymmetric encryption, including how they work, their trade-offs, and common use cases.',
    readingTime: '10 min',
    category: 'General',
    filePath: 'content/docs/symmetric-vs-asymmetric.mdx',
  },
  {
    id: 'common-attacks',
    title: 'Common Cryptographic Attacks',
    description: 'An overview of the most important attacks on cryptographic systems, from brute force to side-channel analysis.',
    readingTime: '9 min',
    category: 'General',
    filePath: 'content/docs/common-attacks.mdx',
  },
  {
    id: 'caesar',
    title: 'Caesar Cipher',
    description: 'One of the simplest and most widely known encryption techniques, used by Julius Caesar for private correspondence.',
    readingTime: '5 min',
    category: 'Ciphers',
    filePath: 'content/docs/ciphers/caesar.mdx',
  },
  {
    id: 'aes',
    title: 'AES (Advanced Encryption Standard)',
    description: 'The global standard for symmetric encryption, AES is a block cipher used worldwide by governments and organizations.',
    readingTime: '10 min',
    category: 'Ciphers',
    filePath: 'content/docs/ciphers/aes.mdx',
  },
  {
    id: 'sha256',
    title: 'SHA-256',
    description: 'Part of the SHA-2 family, SHA-256 is a cryptographic hash function widely used in blockchain, TLS, and integrity verification.',
    readingTime: '9 min',
    category: 'Ciphers',
    filePath: 'content/docs/ciphers/sha256.mdx',
  },
  {
    id: 'rsa',
    title: 'RSA (Rivest-Shamir-Adleman)',
    description: 'One of the first practical public-key cryptosystems, RSA is widely used for secure data transmission and digital signatures.',
    readingTime: '9 min',
    category: 'Ciphers',
    filePath: 'content/docs/ciphers/rsa.mdx',
  },
]
