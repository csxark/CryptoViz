export type TermCategory =
  | 'Symmetric'
  | 'Asymmetric'
  | 'Hashing'
  | 'Attacks'
  | 'Protocols'
  | 'Mathematics';

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases?: string[];
  category: TermCategory;
  summary: string;
  definition: string;
  formula?: string;
  relatedCipherId?: string;
  relatedDocSlug?: string;
  tags: string[];
}

export interface CrossLinkOptions {
  enabled?: boolean;
  maxReplacementsPerTerm?: number;
  excludedTermIds?: string[];
  onTermClick?: (term: GlossaryTerm) => void;
}

export type ParsedToken =
  | { type: 'text'; content: string }
  | { type: 'term'; content: string; term: GlossaryTerm };
