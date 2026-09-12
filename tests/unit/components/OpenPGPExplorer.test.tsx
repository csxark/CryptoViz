import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OpenPGPExplorer from '@/components/openpgp/OpenPGPExplorer';

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

describe('OpenPGPExplorer Component', () => {
  it('renders OpenPGP Workflow Explorer header and top tabs', () => {
    render(<OpenPGPExplorer />);

    expect(screen.getByText(/OpenPGP Workflow Explorer/i)).toBeInTheDocument();
    expect(screen.getByText(/Pipeline Stepper/i)).toBeInTheDocument();
    expect(screen.getByText(/Packet Tree Inspector/i)).toBeInTheDocument();
    expect(screen.getByText(/Entropy & Compression Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/Decrypt & Verify Sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Standards & Security Theory/i)).toBeInTheDocument();
  });

  it('switches between tabs accurately', () => {
    render(<OpenPGPExplorer />);

    // Switch to Packet Tree Inspector
    const packetsTab = screen.getByRole('button', { name: /Packet Tree Inspector/i });
    fireEvent.click(packetsTab);
    expect(screen.getByText(/OpenPGP Binary Packet Hierarchy Explorer/i)).toBeInTheDocument();

    // Switch to Entropy & Compression Lab
    const entropyTab = screen.getByRole('button', { name: /Entropy & Compression Lab/i });
    fireEvent.click(entropyTab);
    expect(screen.getByText(/Shannon Entropy & Compression Science Lab/i)).toBeInTheDocument();

    // Switch to Decrypt & Verify Sandbox
    const sandboxTab = screen.getByRole('button', { name: /Decrypt & Verify Sandbox/i });
    fireEvent.click(sandboxTab);
    expect(screen.getByText(/Recipient Tamper Testing & Integrity Sandbox/i)).toBeInTheDocument();

    // Switch to Theory tab
    const theoryTab = screen.getByRole('button', { name: /Standards & Security Theory/i });
    fireEvent.click(theoryTab);
    expect(screen.getByText(/OpenPGP Architecture & Standards Guide/i)).toBeInTheDocument();
  });

  it('allows stepping through pipeline stages', () => {
    render(<OpenPGPExplorer />);

    // Click Next Stage button
    const nextBtn = screen.getByRole('button', { name: /Next Stage/i });
    fireEvent.click(nextBtn);

    // Stage 2 (Sign) should be visible
    expect(screen.getByText(/Stage 2: Sign Plaintext/i)).toBeInTheDocument();

    // Click Next Stage again -> Stage 3 (Compress)
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Stage 3: Compression Stage/i)).toBeInTheDocument();
  });

  it('allows changing parameter inputs', () => {
    render(<OpenPGPExplorer />);

    const textInput = screen.getByDisplayValue(/CONFIDENTIAL: Project Phoenix launch coordinates/i);
    fireEvent.change(textInput, { target: { value: 'New Secret Payload Test' } });

    expect(screen.getByDisplayValue('New Secret Payload Test')).toBeInTheDocument();
  });

  it('handles tamper simulation modes in sandbox tab', () => {
    render(<OpenPGPExplorer />);

    // Go to Sandbox
    const sandboxTab = screen.getByRole('button', { name: /Decrypt & Verify Sandbox/i });
    fireEvent.click(sandboxTab);

    // Click Corrupt Ciphertext
    const corruptBtn = screen.getByText(/2. Corrupt Ciphertext/i);
    fireEvent.click(corruptBtn);

    expect(screen.getByText(/Cryptographic Verification Failed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/SEIPD MDC/i)[0]).toBeInTheDocument();
  });
});
