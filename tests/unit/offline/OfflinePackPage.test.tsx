import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OfflineLearningPackPage from '@/app/offline/page';
import OfflineVisualizer from '@/components/offline/OfflineVisualizer';
import OfflineStatusBadge from '@/components/offline/OfflineStatusBadge';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/offline',
}));

describe('Offline Learning Pack Page & Components', () => {
  it('renders hero title and status badge correctly', () => {
    render(<OfflineLearningPackPage />);
    expect(screen.getByText(/Learn Cryptography/i)).toBeInTheDocument();
expect(screen.getByText(/OFFLINE LEARNING PACK ENGINE/i)).toBeInTheDocument();  });

  it('filters learning packs based on search input', () => {
    render(<OfflineLearningPackPage />);
    const searchInput = screen.getByPlaceholderText(/Search packs or topics/i);

    fireEvent.change(searchInput, { target: { value: 'Symmetric' } });
    expect(screen.getByText('Symmetric & Classical Ciphers Pack')).toBeInTheDocument();
  });

  it('renders status badge with online status and storage stats', () => {
    const sampleStatus = {
      isSupported: true,
      isOnline: true,
      isServiceWorkerActive: true,
      cachedPackIds: ['symmetric-classical'],
      storageUsedBytes: 2000000,
      storageQuotaBytes: 50000000,
      isCachingInProgress: false,
      cachingProgressPct: 0,
    };

    render(<OfflineStatusBadge status={sampleStatus} onClearCache={() => {}} />);
    expect(screen.getByText(/Online Mode Active/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Pack\(s\) Cached/i)).toBeInTheDocument();
  });

  it('computes Caesar cipher offline in OfflineVisualizer component', () => {
    render(<OfflineVisualizer />);

    const inputArea = screen.getByLabelText(/Input Plaintext /i);
    fireEvent.change(inputArea, { target: { value: 'ABC' } });

    const computeBtn = screen.getByRole('button', { name: /Compute Offline Result/i });
    fireEvent.click(computeBtn);

    expect(screen.getByText('DEF')).toBeInTheDocument();
  });
});
