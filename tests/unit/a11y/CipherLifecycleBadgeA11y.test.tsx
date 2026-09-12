import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'jest-axe';
import CipherLifecycleBadge from '@/components/cipher/CipherLifecycleBadge';
import CipherLifecyclePage from '@/app/cipher-lifecycle/page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/cipher-lifecycle',
}));

describe('Cipher Lifecycle Accessibility (a11y)', () => {
  it('has zero axe accessibility violations on CipherLifecycleBadge', async () => {
    const { container } = render(
      <div>
        <CipherLifecycleBadge status="recommended" />
        <CipherLifecycleBadge status="secure" />
        <CipherLifecycleBadge status="experimental" />
        <CipherLifecycleBadge status="legacy" />
        <CipherLifecycleBadge status="deprecated" />
        <CipherLifecycleBadge status="broken" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has zero axe accessibility violations on CipherLifecyclePage', async () => {
    const { container } = render(<CipherLifecyclePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }, 20_000);
});
