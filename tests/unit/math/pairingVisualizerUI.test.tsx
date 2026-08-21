import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import PairingVisualizer from '@/components/math/PairingVisualizer';

describe('PairingVisualizer UI Component (#1043)', () => {
  it('renders header, title and tabs', () => {
    render(<PairingVisualizer />);
    expect(screen.getByText(/Bilinear Pairing Mathematics & IBE Formalism/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bilinear Map Verifier/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Miller's Algorithm Trace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Boneh-Franklin IBE Sandbox/i })).toBeInTheDocument();
  });

  it('allows switching between tabs', () => {
    render(<PairingVisualizer />);

    // Switch to Miller's algorithm tab
    fireEvent.click(screen.getByRole('button', { name: /Miller's Algorithm Trace/i }));
    expect(screen.getByText(/Miller's Algorithm Double-and-Add Line Function Trace/i)).toBeInTheDocument();

    // Switch to IBE tab
    fireEvent.click(screen.getByRole('button', { name: /Boneh-Franklin IBE Sandbox/i }));
    expect(screen.getByText(/Boneh-Franklin Identity-Based Encryption \(IBE\) Workflow/i)).toBeInTheDocument();
  });

  it('updates scalar multipliers when preset buttons are clicked', () => {
    render(<PairingVisualizer />);
    const presetBtn = screen.getByRole('button', { name: /a=5, b=2/i });
    fireEvent.click(presetBtn);
    expect(screen.getByText(/a = 5/i)).toBeInTheDocument();
    expect(screen.getByText(/b = 2/i)).toBeInTheDocument();
  });
});
