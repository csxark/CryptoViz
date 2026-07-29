import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'jest-axe';
import GlossaryTermTooltip from '@/components/glossary/GlossaryTermTooltip';
import GlossaryModal from '@/components/glossary/GlossaryModal';
import { GLOSSARY_TERMS } from '@/lib/glossary/glossaryData';

vi.mock('next/navigation', () => ({
  usePathname: () => '/glossary',
}));

describe('Glossary Accessibility (a11y)', () => {
  it('has zero axe accessibility violations on GlossaryTermTooltip', async () => {
    const term = GLOSSARY_TERMS[0];
    const { container } = render(<GlossaryTermTooltip term={term} matchedText="Caesar Cipher" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has zero axe accessibility violations on GlossaryModal', async () => {
    const term = GLOSSARY_TERMS[0];
    const { container } = render(<GlossaryModal term={term} isOpen={true} onClose={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
