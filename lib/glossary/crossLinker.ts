import { GLOSSARY_TERMS } from './glossaryData';
import { GlossaryTerm, CrossLinkOptions, ParsedToken } from './types';

/**
 * Intelligent text cross-linking parser.
 * Scans a string for registered cryptographic terms and splits it into tokens
 * of plain text and matched GlossaryTerm objects.
 */
export function parseTextWithGlossary(text: string, options?: CrossLinkOptions): ParsedToken[] {
  if (!text || options?.enabled === false) {
    return [{ type: 'text', content: text }];
  }

  const termsToSearch: { termObj: GlossaryTerm; phrase: string }[] = [];

  // Collect terms and aliases sorted by length descending so longer phrases match first
  GLOSSARY_TERMS.forEach(t => {
    if (options?.excludedTermIds?.includes(t.id)) return;

    termsToSearch.push({ termObj: t, phrase: t.term });
    if (t.aliases) {
      t.aliases.forEach(alias => {
        termsToSearch.push({ termObj: t, phrase: alias });
      });
    }
  });

  termsToSearch.sort((a, b) => b.phrase.length - a.phrase.length);

  // Track matched ranges in original string
  const matches: { start: number; end: number; termObj: GlossaryTerm; rawMatched: string }[] = [];
  const matchedTermCounts: Record<string, number> = {};
  const maxPerTerm = options?.maxReplacementsPerTerm ?? 2;

  termsToSearch.forEach(({ termObj, phrase }) => {
    const currentCount = matchedTermCounts[termObj.id] || 0;
    if (currentCount >= maxPerTerm) return;

    // Escape regex special characters in phrase
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Ensure this match does not overlap with an already matched range
      const overlaps = matches.some(m => (start >= m.start && start < m.end) || (end > m.start && end <= m.end));
      if (!overlaps) {
        if ((matchedTermCounts[termObj.id] || 0) < maxPerTerm) {
          matches.push({ start, end, termObj, rawMatched: match[0] });
          matchedTermCounts[termObj.id] = (matchedTermCounts[termObj.id] || 0) + 1;
        }
      }
    }
  });

  if (matches.length === 0) {
    return [{ type: 'text', content: text }];
  }

  // Sort matches by starting index
  matches.sort((a, b) => a.start - b.start);

  const tokens: ParsedToken[] = [];
  let currentIndex = 0;

  matches.forEach(m => {
    if (m.start > currentIndex) {
      tokens.push({ type: 'text', content: text.slice(currentIndex, m.start) });
    }
    tokens.push({
      type: 'term',
      content: m.rawMatched,
      term: m.termObj,
    });
    currentIndex = m.end;
  });

  if (currentIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(currentIndex) });
  }

  return tokens;
}
