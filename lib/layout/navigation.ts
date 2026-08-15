export type NavigationItem = {
  name: string
  href: string
  translationKey?: string
  devOnly?: boolean
}

export type NavigationCategory = {
  name: string
  href?: string
  translationKey?: string
  items?: NavigationItem[]
}

export const NAVIGATION_CONFIG: NavigationCategory[] = [
  {
    name: 'Home',
    href: '/',
    translationKey: 'nav.home',
  },
  {
    name: 'Learn',
    translationKey: 'nav.learn',
    items: [
      { name: 'Learning Paths', href: '/learning-paths' },
      {
        name: 'Cipher Lifecycle',
        href: '/cipher-lifecycle',
        translationKey: 'nav.lifecycle',
      },
      { name: 'Docs & Guides', href: '/docs' },
      {
        name: 'Myth Busters',
        href: '/myth-busters',
        translationKey: 'nav.mythBusters',
      },
      {
        name: 'Encoding Errors',
        href: '/encoding-errors',
        translationKey: 'nav.encodingErrors',
      },
      {
        name: 'Merkle Tree',
        href: '/merkle',
        translationKey: 'nav.merkle',
      },
      {
        name: 'Padding',
        href: '/padding',
        translationKey: 'nav.padding',
      },
      { name: 'Case Studies', href: '/case-studies' },
      { name: 'Timeline', href: '/timeline' },
    ],
  },
  {
    name: 'Practice',
    translationKey: 'nav.practice',
    items: [
      { name: 'Interactive Visualizers', href: '/visualizer' },
      {
        name: 'Playground',
        href: '/visualizer/caesar/',
        translationKey: 'nav.playground',
      },
      {
        name: 'Cipher Sandbox',
        href: '/cipher-sandbox',
        translationKey: 'nav.cipherSandbox',
      },
      { name: 'Attack Simulators', href: '/attacks' },
      { name: 'Cipher Pipeline', href: '/pipeline' },
      { name: 'OpenPGP Explorer', href: '/openpgp' },
      {
        name: 'Challenge',
        href: '/challenge',
        translationKey: 'nav.challenge',
      },
      {
        name: 'Advisor',
        href: '/advisor',
        translationKey: 'nav.advisor',
      },
    ],
  },
  {
    name: 'Reference',
    translationKey: 'nav.reference',
    items: [
      { name: 'Reference Hub', href: '/reference' },
      {
        name: 'Glossary',
        href: '/glossary',
        translationKey: 'nav.glossary',
      },
      {
        name: 'Modes',
        href: '/modes',
        translationKey: 'nav.modes',
      },
      {
        name: 'Compare',
        href: '/compare',
        translationKey: 'nav.compare',
      },
      {
        name: 'Collections',
        href: '/collections',
        translationKey: 'nav.collections',
      },
      {
        name: 'Matrix',
        href: '/matrix',
        translationKey: 'nav.matrix',
      },
      {
        name: 'Benchmark',
        href: '/benchmark',
        translationKey: 'nav.benchmark',
      },
      {
        name: 'Avalanche',
        href: '/avalanche',
        translationKey: 'nav.avalanche',
      },
      {
        name: 'Certificate Validation',
        href: '/certificate-validation',
        translationKey: 'nav.certificateValidation',
      },
      { name: 'S-Box Explorer', href: '/sbox' },
      { name: 'Rainbow Table', href: '/rainbow-table' },
    ],
  },
  {
    name: 'More',
    translationKey: 'nav.more',
    items: [
      {
        name: 'Reference',
        href: '/reference',
        translationKey: 'nav.reference',
      },
      { name: 'Learning Notes', href: '/notes' },
      {
        name: 'Offline',
        href: '/offline',
        translationKey: 'nav.offline',
      },
      {
        name: 'Resources',
        href: '/resources',
        translationKey: 'nav.resources',
      },
      {
        name: 'Integration Tests',
        href: '/tests/integration',
        devOnly: true,
      },
      {
        name: 'Snapshot Tests',
        href: '/tests/snapshots',
        devOnly: true,
      },
      {
        name: 'Worker Tests',
        href: '/tests/worker',
        devOnly: true,
      },
      {
        name: 'Benchmark History',
        href: '/benchmarks/history',
        devOnly: true,
      },
    ],
  },
]

export function getNavigationCategories(
  t: (key: string) => string,
  includeDeveloperItems = false
): NavigationCategory[] {
  return NAVIGATION_CONFIG.map((category) => ({
    ...category,
    name: category.translationKey
      ? t(category.translationKey) || category.name
      : category.name,
    items: category.items
      ?.filter((item) => includeDeveloperItems || !item.devOnly)
      .map((item) => ({
        ...item,
        name: item.translationKey
          ? t(item.translationKey) || item.name
          : item.name,
      })),
  })).filter(
    (category) =>
      category.href ||
      (category.items && category.items.length > 0)
  )
}

export function getDeveloperNavigationItems(
  t: (key: string) => string
): NavigationItem[] {
  return NAVIGATION_CONFIG.flatMap((category) =>
    category.items ?? []
  )
    .filter((item) => item.devOnly)
    .map((item) => ({
      ...item,
      name: item.translationKey
        ? t(item.translationKey) || item.name
        : item.name,
    }))
}