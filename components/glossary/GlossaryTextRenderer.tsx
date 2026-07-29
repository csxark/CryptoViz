'use client';

import React, { useMemo } from 'react';
import { parseTextWithGlossary } from '@/lib/glossary/crossLinker';
import GlossaryTermTooltip from './GlossaryTermTooltip';
import { GlossaryTerm, CrossLinkOptions } from '@/lib/glossary/types';

interface GlossaryTextRendererProps {
  content: string;
  options?: CrossLinkOptions;
  className?: string;
  onTermClick?: (term: GlossaryTerm) => void;
}

export default function GlossaryTextRenderer({
  content,
  options,
  className = '',
  onTermClick,
}: GlossaryTextRendererProps) {
  const tokens = useMemo(() => {
    return parseTextWithGlossary(content, options);
  }, [content, options]);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <React.Fragment key={idx}>{token.content}</React.Fragment>;
        }
        return (
          <GlossaryTermTooltip
            key={idx}
            term={token.term}
            matchedText={token.content}
            onTermClick={onTermClick}
          />
        );
      })}
    </span>
  );
}
