import type { CipherMetadata } from '../cipher/types'

export interface CitationMetadata {
  citationKey: string;
  entryType?: 'techreport' | 'article' | 'book' | 'misc';
  title: string;
  author: string;
  year: number;
  journal?: string;
  volume?: string;
  pages?: string;
  publisher?: string;
  institution?: string;
  number?: string;
  url?: string;
}

export const CITATION_REGISTRY: Record<string, CitationMetadata> = {
  'aes': {
    citationKey: 'FIPS197',
    entryType: 'techreport',
    title: 'Advanced Encryption Standard (AES)',
    author: 'National Institute of Standards and Technology',
    year: 2001,
    institution: 'National Institute of Standards and Technology',
    number: 'FIPS PUB 197',
    url: 'https://csrc.nist.gov/publications/detail/fips/197/final',
  },
  'rsa': {
    citationKey: 'RSA1978',
    entryType: 'article',
    title: 'A Method for Obtaining Digital Signatures and Public-Key Cryptosystems',
    author: 'Rivest, R. L. and Shamir, A. and Adleman, L.',
    year: 1978,
    journal: 'Communications of the ACM',
    volume: '21',
    number: '2',
    pages: '120--126',
    publisher: 'Association for Computing Machinery',
    url: 'https://doi.org/10.1145/359340.359342',
  },
  'hill': {
    citationKey: 'Hill1929',
    entryType: 'article',
    title: 'Cryptography in an Algebraic Alphabet',
    author: 'Hill, Lester S.',
    year: 1929,
    journal: 'The American Mathematical Monthly',
    volume: '36',
    number: '6',
    pages: '306--312',
    publisher: 'Mathematical Association of America',
    url: 'https://doi.org/10.2307/2299285',
  }
}

/**
 * Generates a standard BibTeX citation string for a given cipher if
 * verified metadata is available in the centralized registry.
 * Does not fabricate metadata.
 */
export function citationToBibtex(cipherId: string, metadata?: CipherMetadata): string | null {
  const verified = CITATION_REGISTRY[cipherId]
  if (!verified) {
    return null
  }

  // Use the verified year if available, else fallback to CipherMetadata.yearDesigned if appropriate,
  // but verified is preferred.
  const year = verified.year || metadata?.yearDesigned || 'Unknown'
  const entryType = verified.entryType || 'techreport'

  let bibtex = `@${entryType}{${verified.citationKey},
  title = {${verified.title}},
  author = {${verified.author}},
  year = {${year}},`

  if (verified.journal) {
    bibtex += `\n  journal = {${verified.journal}},`
  }
  if (verified.volume) {
    bibtex += `\n  volume = {${verified.volume}},`
  }
  if (verified.pages) {
    bibtex += `\n  pages = {${verified.pages}},`
  }
  if (verified.institution) {
    bibtex += `\n  institution = {${verified.institution}},`
  }
  if (verified.publisher) {
    bibtex += `\n  publisher = {${verified.publisher}},`
  }
  if (verified.number) {
    bibtex += `\n  number = {${verified.number}},`
  }
  if (verified.url) {
    bibtex += `\n  url = {${verified.url}},`
  }

  // Remove trailing comma from the last entry and close the bracket.
  bibtex = bibtex.replace(/,$/, '') + '\n}'

  return bibtex
}
