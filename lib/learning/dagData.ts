/**
 * DAG Knowledge Graph Data
 *
 * Defines vertices V (concepts/skills) and directed edges E (prerequisite relations)
 * representing cryptography learning progression.
 *
 * Status states:
 *   - 'Completed': User has finished the corresponding lesson
 *   - 'Available': All prerequisites are completed, ready to learn
 *   - 'Locked': At least one prerequisite is not completed
 */

export interface DAGNode {
  id: string
  title: string
  description: string
  /** The target URL for this topic, e.g. path or visualizer */
  href: string
  /** The track category this node belongs to */
  track: 'Fundamentals' | 'Symmetric' | 'Asymmetric' | 'Math'
  /** Optional mapping to a learning path ID + lesson ID for status checking */
  lessonRef?: {
    pathId: string
    lessonId: string
  }
}

export interface DAGEdge {
  from: string
  to: string
}

export interface DAGTrackPreset {
  id: string
  label: string
  description: string
  nodes: string[] // Node IDs in this track
}

export const DAG_NODES: DAGNode[] = [
  // Math Foundations
  {
    id: 'modular-arithmetic',
    title: 'Modular Arithmetic',
    description: 'Understand modular addition, multiplication, and equivalence classes.',
    href: '/finite-field',
    track: 'Math',
  },
  {
    id: 'prime-numbers',
    title: 'Primes & GCD',
    description: 'Prime factorization, greatest common divisor, and Euclidean algorithm.',
    href: '/finite-field',
    track: 'Math',
  },
  {
    id: 'polynomial-rings',
    title: 'Polynomial Rings',
    description: 'Polynomial arithmetic over finite fields, irreducible polynomials.',
    href: '/finite-field',
    track: 'Math',
  },
  {
    id: 'lwe-math',
    title: 'Learning with Errors (LWE)',
    description: 'The LWE lattice problem and polynomial noise distributions.',
    href: '/docs/architecture', // Fallback to docs/visualizer
    track: 'Math',
  },

  // Fundamentals
  {
    id: 'security-goals',
    title: 'Core Security Goals',
    description: 'Confidentiality, Integrity, Availability, and Authentication (CIA).',
    href: '/learning-paths/cryptography-fundamentals/intro-security-goals',
    track: 'Fundamentals',
    lessonRef: {
      pathId: 'cryptography-fundamentals',
      lessonId: 'intro-security-goals',
    },
  },
  {
    id: 'encoding-vs-encryption',
    title: 'Encoding vs. Encryption',
    description: 'Differentiating binary, hex, Base64, encryption, and hashing.',
    href: '/learning-paths/cryptography-fundamentals/encoding-vs-encryption',
    track: 'Fundamentals',
    lessonRef: {
      pathId: 'cryptography-fundamentals',
      lessonId: 'encoding-vs-encryption',
    },
  },

  // Symmetric Ciphers
  {
    id: 'stream-ciphers',
    title: 'Stream Ciphers & XOR',
    description: 'One-Time Pads, LFSRs, RC4, and keystream generation.',
    href: '/learning-paths/symmetric-cryptography/stream-ciphers-otp',
    track: 'Symmetric',
    lessonRef: {
      pathId: 'symmetric-cryptography',
      lessonId: 'stream-ciphers-otp',
    },
  },
  {
    id: 'block-cipher-core',
    title: 'Block Cipher Core',
    description: 'Feistel Networks, Substitution-Permutation Networks (SPN).',
    href: '/learning-paths/symmetric-cryptography/block-ciphers-aes',
    track: 'Symmetric',
    lessonRef: {
      pathId: 'symmetric-cryptography',
      lessonId: 'block-ciphers-aes',
    },
  },
  {
    id: 'sbox-cryptanalysis',
    title: 'S-Box Cryptanalysis',
    description: 'Difference Distribution Tables (DDT) and Linear Approximation Tables (LAT).',
    href: '/cryptanalysis/sbox',
    track: 'Symmetric',
  },
  {
    id: 'block-cipher-modes',
    title: 'Block Cipher Modes',
    description: 'ECB, CBC, CFB, OFB, CTR, and initialization vectors.',
    href: '/cipher-sandbox',
    track: 'Symmetric',
  },
  {
    id: 'aes-gcm',
    title: 'AES-GCM & AEAD',
    description: 'Authenticated encryption with associated data, Galois Counter Mode.',
    href: '/learning-paths/symmetric-cryptography/aead-gcm',
    track: 'Symmetric',
    lessonRef: {
      pathId: 'symmetric-cryptography',
      lessonId: 'aead-gcm',
    },
  },

  // Asymmetric Ciphers
  {
    id: 'diffie-hellman',
    title: 'Diffie-Hellman',
    description: 'Key exchange using discrete logarithms over finite fields.',
    href: '/learning-paths/asymmetric-cryptography/diffie-hellman',
    track: 'Asymmetric',
    lessonRef: {
      pathId: 'asymmetric-cryptography',
      lessonId: 'diffie-hellman',
    },
  },
  {
    id: 'rsa-encryption',
    title: 'RSA Cryptosystem',
    description: 'RSA key generation, encryption, decryption, and Euler totient function.',
    href: '/learning-paths/asymmetric-cryptography/rsa-basics',
    track: 'Asymmetric',
    lessonRef: {
      pathId: 'asymmetric-cryptography',
      lessonId: 'rsa-basics',
    },
  },
  {
    id: 'rsa-padding',
    title: 'RSA OAEP & PSS Padding',
    description: 'Optimal Asymmetric Encryption Padding to prevent chosen-ciphertext attacks.',
    href: '/padding',
    track: 'Asymmetric',
  },
  {
    id: 'digital-certificates',
    title: 'Digital Certificates & PKI',
    description: 'X.509 certificates, certificate authorities, trust chains, and SSL/TLS.',
    href: '/certificate-validation',
    track: 'Asymmetric',
  },
  {
    id: 'ml-kem',
    title: 'ML-KEM (Kyber)',
    description: 'Post-quantum key encapsulation mechanism based on Module-LWE.',
    href: '/docs/standards',
    track: 'Asymmetric',
  },
]

export const DAG_EDGES: DAGEdge[] = [
  // Fundamentals -> Symmetric
  { from: 'security-goals', to: 'encoding-vs-encryption' },
  { from: 'encoding-vs-encryption', to: 'stream-ciphers' },
  { from: 'encoding-vs-encryption', to: 'block-cipher-core' },

  // Math foundations -> Symmetric & Asymmetric
  { from: 'modular-arithmetic', to: 'prime-numbers' },
  { from: 'prime-numbers', to: 'diffie-hellman' },
  { from: 'prime-numbers', to: 'rsa-encryption' },
  { from: 'polynomial-rings', to: 'lwe-math' },
  { from: 'lwe-math', to: 'ml-kem' },

  // Symmetric progression
  { from: 'block-cipher-core', to: 'sbox-cryptanalysis' },
  { from: 'block-cipher-core', to: 'block-cipher-modes' },
  { from: 'block-cipher-modes', to: 'aes-gcm' },

  // Asymmetric progression
  { from: 'rsa-encryption', to: 'rsa-padding' },
  { from: 'rsa-padding', to: 'digital-certificates' },
  { from: 'diffie-hellman', to: 'digital-certificates' },
]

export const DAG_PRESETS: DAGTrackPreset[] = [
  {
    id: 'all',
    label: 'All Topics',
    description: 'The entire dependency map of cryptographic concepts.',
    nodes: DAG_NODES.map((n) => n.id),
  },
  {
    id: 'symmetric-track',
    label: 'Symmetric Specialist',
    description: 'Focus on stream ciphers, block cipher internals, modes of operation, and AEAD.',
    nodes: [
      'security-goals',
      'encoding-vs-encryption',
      'stream-ciphers',
      'block-cipher-core',
      'sbox-cryptanalysis',
      'block-cipher-modes',
      'aes-gcm',
    ],
  },
  {
    id: 'pqc-track',
    label: 'Post-Quantum Pathway',
    description: 'Understand modular math, polynomial rings, lattice LWE problems, and ML-KEM.',
    nodes: ['modular-arithmetic', 'polynomial-rings', 'lwe-math', 'ml-kem'],
  },
  {
    id: 'public-key-track',
    label: 'Public Key Infrastructure',
    description: 'Prerequisites leading to public key cryptography, signatures, and TLS trust.',
    nodes: [
      'modular-arithmetic',
      'prime-numbers',
      'rsa-encryption',
      'rsa-padding',
      'diffie-hellman',
      'digital-certificates',
    ],
  },
]

/**
 * Perform a Breadth-First Search (BFS) starting from target node ID up
 * the prerequisite chain (parents) to resolve the full upstream path.
 */
export function getUpstreamPrerequisites(nodeId: string): Set<string> {
  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (!visited.has(current)) {
      visited.add(current)
      // Find all edges leading *into* the current node
      const parents = DAG_EDGES.filter((e) => e.to === current).map((e) => e.from)
      for (const parent of parents) {
        if (!visited.has(parent)) {
          queue.push(parent)
        }
      }
    }
  }

  // Remove the node itself from the prerequisite list
  visited.delete(nodeId)
  return visited
}

/**
 * Returns the status of a node ('Completed' | 'Available' | 'Locked') based on
 * the user's progress record.
 */
export function getNodeStatus(
  nodeId: string,
  completedLessons: Record<string, boolean>,
  customCompletions: Record<string, boolean>
): 'Completed' | 'Available' | 'Locked' {
  const node = DAG_NODES.find((n) => n.id === nodeId)
  if (!node) return 'Locked'

  // Check if self is completed
  const isSelfComplete = node.lessonRef
    ? completedLessons[`${node.lessonRef.pathId}:${node.lessonRef.lessonId}`]
    : customCompletions[node.id]

  if (isSelfComplete) return 'Completed'

  // Check parents' completion status
  const parents = DAG_EDGES.filter((e) => e.to === nodeId).map((e) => e.from)
  if (parents.length === 0) return 'Available'

  const allParentsCompleted = parents.every((pId) => {
    const parentNode = DAG_NODES.find((n) => n.id === pId)
    if (!parentNode) return false
    return parentNode.lessonRef
      ? completedLessons[`${parentNode.lessonRef.pathId}:${parentNode.lessonRef.lessonId}`]
      : customCompletions[pId]
  })

  return allParentsCompleted ? 'Available' : 'Locked'
}
