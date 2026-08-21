import React from 'react';
import DomainOperationVisualizer from '@/components/domain/DomainOperationVisualizer';

export const metadata = {
  title: 'Domain Operation State Machine & Safety Engine | CryptoViz',
  description:
    'Eliminates fabricated execution, transaction, oracle, and settlement states across financial domain operations.',
};

export default function DomainOperationsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Domain Operation State Safety Laboratory
          </h1>
          <p className="text-zinc-400 text-sm max-w-3xl">
            This module provides verified domain operation state management for financial & cryptographic workflows (arbitrage, cross-chain bridge, custody, RWA/Proof-of-Reserve, yield distribution, validator rewards). All operations enforce explicit state transitions, server authorization, idempotency, evidence verification, and educational simulation isolation (#1315).
          </p>
        </div>

        <DomainOperationVisualizer />
      </div>
    </div>
  );
}
