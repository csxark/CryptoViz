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
    name: 'Crypto Wallet Address Filter',
    description: 'Simulates SPV (Simplified Payment Verification) crypto wallets filtering blockchain transactions for relevant user addresses.',
    size: 64,
    numHashes: 4,
    initialElements: [
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      '0x1111111111111111111111111111111111111111',
      '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    ],
    testElements: [
      { element: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', expectedStatus: 'possibly_present' },
      { element: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', expectedStatus: 'definitely_not' },
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
