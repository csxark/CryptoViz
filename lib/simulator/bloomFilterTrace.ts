export interface BloomFilterPreset {
  name: string
  description: string
  size: number
  numHashes: number
  initialElements: string[]
  testElements: { element: string; expectedStatus: 'possibly_present' | 'definitely_not' }[]
}

export const BLOOM_FILTER_PRESETS: BloomFilterPreset[] = [
  {
    name: 'Malicious URL Blacklist',
    description: 'Simulates web browsers checking incoming URLs against a local Bloom filter before querying full remote reputation APIs.',
    size: 64,
    numHashes: 3,
    initialElements: [
      'phishing-bank-login.com',
      'malware-download-cdn.net',
      'crypto-stealer-app.org',
      'fake-support-ticket.xyz',
    ],
    testElements: [
      { element: 'phishing-bank-login.com', expectedStatus: 'possibly_present' },
      { element: 'github.com', expectedStatus: 'definitely_not' },
      { element: 'google.com', expectedStatus: 'definitely_not' },
    ],
  },
  {
    name: 'Network Device Address Filter',
    description: 'Simulates network switches and routers filtering incoming hardware MAC/IP addresses for membership in high-speed lookup tables.',
    size: 64,
    numHashes: 4,
    initialElements: [
      '00:1A:2B:3C:4D:5E',
      'A1:B2:C3:D4:E5:F6',
      '192.168.1.105',
    ],
    testElements: [
      { element: '00:1A:2B:3C:4D:5E', expectedStatus: 'possibly_present' },
      { element: '10.0.0.99', expectedStatus: 'definitely_not' },
    ],
  },
  {
    name: 'High Saturation (False Positive Demo)',
    description: 'Demonstrates how a small bit array with too many inserted elements leads to high saturation and false positive matches.',
    size: 32,
    numHashes: 2,
    initialElements: [
      'user_1',
      'user_2',
      'user_3',
      'user_4',
      'user_5',
      'user_6',
      'user_7',
      'user_8',
      'user_9',
      'user_10',
    ],
    testElements: [
      { element: 'user_1', expectedStatus: 'possibly_present' },
      { element: 'unseen_user_99', expectedStatus: 'possibly_present' }, // High probability of false positive
    ],
  },
]

export interface StepExplanation {
  title: string
  description: string
  codeSnippet?: string
}

export function explainBloomFilterConcept(): StepExplanation[] {
  return [
    {
      title: '1. Array Initialization',
      description: 'A bit array of size m is allocated with all bits set to 0. k independent hash functions are chosen.',
    },
    {
      title: '2. Element Insertion',
      description: 'To insert an element x, compute k hash values h_1(x), h_2(x), ..., h_k(x) mod m and set all those bits to 1.',
    },
    {
      title: '3. Membership Testing',
      description: 'To query an element y, compute the same k hash indices. If ANY bit is 0, y is DEFINITELY NOT in the set. If ALL bits are 1, y is POSSIBLY in the set.',
    },
    {
      title: '4. Zero False Negatives Guarantee',
      description: 'If an element was inserted, all its hash bits were set to 1 and will never be cleared. Therefore, false negatives are impossible.',
    },
  ]
}
