import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GlossaryPage from '@/app/glossary/page';
import GlossaryTextRenderer from '@/components/glossary/GlossaryTextRenderer';
import GlossaryTermTooltip from '@/components/glossary/GlossaryTermTooltip';
import { GLOSSARY_TERMS } from '@/lib/glossary/glossaryData';

vi.mock('next/navigation', () => ({
  usePathname: () => '/glossary',
}));

describe('Glossary Components & Explorer Page', () => {
  it('renders Glossary Page hero and title correctly', () => {
    render(<GlossaryPage />);
    expect(screen.getByRole('heading', { name: /Glossary Explorer/i })).toBeInTheDocument();
  });

  it('filters glossary terms based on search input', () => {
    render(<GlossaryPage />);
    const searchInput = screen.getByPlaceholderText(/Search cryptographic terms/i);

    fireEvent.change(searchInput, { target: { value: 'Caesar' } });
    expect(screen.getByText('Caesar Cipher')).toBeInTheDocument();
  });

  it('renders GlossaryTextRenderer with auto-linked terms', () => {
    const text = 'Testing SHA-256 hash algorithm.';
    render(<GlossaryTextRenderer content={text} />);

    expect(screen.getByText('SHA-256')).toBeInTheDocument();
  });

  it('opens tooltip popover on term button click', () => {
    const term = GLOSSARY_TERMS[0];
    render(<GlossaryTermTooltip term={term} matchedText="Caesar Cipher" />);

    const button = screen.getByRole('button', { name: /Glossary definition for/i });
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
