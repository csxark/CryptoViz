import { describe, it, expect } from 'vitest';
import { parseTextWithGlossary } from '@/lib/glossary/crossLinker';
import { GLOSSARY_TERMS, searchGlossaryTerms } from '@/lib/glossary/glossaryData';

describe('Glossary Cross-Linker Parser & Data', () => {
  it('contains registered cryptographic terms in dataset', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(10);
    const aes = GLOSSARY_TERMS.find(t => t.id === 'aes');
    expect(aes).toBeDefined();
    expect(aes?.term).toContain('Advanced Encryption Standard');
  });

  it('searches terms by query keyword correctly', () => {
    const results = searchGlossaryTerms('SHA-256');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].term).toBe('SHA-256');
  });

  it('parses plain text and extracts matched glossary terms', () => {
    const text = 'The Caesar Cipher is a classical shift cipher that uses an Initialization Vector in block cipher modes.';
    const tokens = parseTextWithGlossary(text);

    expect(tokens.length).toBeGreaterThan(1);
    const termTokens = tokens.filter(t => t.type === 'term');
    expect(termTokens.length).toBeGreaterThanOrEqual(2);
  });

  it('handles text without any glossary terms gracefully', () => {
    const text = 'Plain simple sentences without technical jargon.';
    const tokens = parseTextWithGlossary(text);

    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe('text');
    expect(tokens[0].content).toBe(text);
  });
});
