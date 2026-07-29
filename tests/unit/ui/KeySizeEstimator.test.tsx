import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import KeySizeEstimator from '../../../components/key-size/KeySizeEstimator';
import { getNistStatus, getSearchSpaceString } from '../../../lib/utils/keyEquivalence';

describe('KeySizeEstimator Utility', () => {
  it('correctly maps NIST status below 112', () => {
    const status = getNistStatus(80);
    expect(status.label).toContain('Insecure');
    expect(status.color).toContain('text-red');
  });

  it('correctly maps NIST status for 112', () => {
    const status = getNistStatus(112);
    expect(status.label).toContain('Legacy');
  });

  it('correctly maps NIST status for 128', () => {
    const status = getNistStatus(128);
    expect(status.label).toContain('Recommended');
  });

  it('correctly formats small search spaces', () => {
    expect(getSearchSpaceString(40)).toBe('1,099,511,627,776');
  });

  it('correctly formats large search spaces', () => {
    const space = getSearchSpaceString(128);
    expect(space).toContain('2^128');
    expect(space).toContain('10^38');
  });
});

describe('KeySizeEstimator Component', () => {
  beforeEach(() => {
    render(<KeySizeEstimator />);
  });

  it('renders default Symmetric AES-128', () => {
    // Should default to Symmetric 128-bit
    expect(screen.getByText('128-bit')).toBeDefined();
    expect(screen.getByText('AES-128 (Standard modern minimum)')).toBeDefined();
  });

  it('switches to RSA and updates key sizes', () => {
    const rsaButton = screen.getByRole('button', { name: 'RSA' });
    fireEvent.click(rsaButton);

    // Default for RSA should be 3072-bit (index 2)
    expect(screen.getByText('3072-bit')).toBeDefined();
    expect(screen.getByText('Standard minimum (NIST recommended)')).toBeDefined();
    
    // Check if relative security is still 128-bit equivalent
    expect(screen.getByText('128-bit Equivalent')).toBeDefined();
  });

  it('switches to ECC and updates key sizes', () => {
    const eccButton = screen.getByRole('button', { name: 'ECC' });
    fireEvent.click(eccButton);

    // Default for ECC should be 256-bit (index 2)
    expect(screen.getByText('256-bit')).toBeDefined();
    expect(screen.getByText('P-256 (Standard modern minimum)')).toBeDefined();
    
    // Check if relative security is 128-bit equivalent
    expect(screen.getByText('128-bit Equivalent')).toBeDefined();
  });

  it('handles slider updates', () => {
    const slider = screen.getByRole('slider');
    // Change to index 4 (Symmetric 256-bit)
    fireEvent.change(slider, { target: { value: '4' } });

    expect(screen.getByText('256-bit')).toBeDefined();
    expect(screen.getByText('AES-256 (Top secret / Quantum resistant)')).toBeDefined();
  });
});
