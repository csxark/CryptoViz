'use client';

import React, { useState, useEffect } from 'react';
import { FifoTaxCalculator, Transaction, TaxEvent } from '../../lib/tax/FifoTaxCalculator';
import { CsvExporter } from '../../lib/tax/CsvExporter';

// Mock Ledger of historical transactions
const MOCK_LEDGER: Transaction[] = [
  { id: 'tx1', asset: 'BTC', type: 'BUY', amount: 1.0, pricePerUnit: 30000, timestamp: '2023-01-15T10:00:00Z' },
  { id: 'tx2', asset: 'BTC', type: 'BUY', amount: 0.5, pricePerUnit: 40000, timestamp: '2023-06-20T14:30:00Z' },
  { id: 'tx3', asset: 'ETH', type: 'AIRDROP', amount: 10, pricePerUnit: 2000, timestamp: '2023-08-01T09:00:00Z' },
  // This sell will exhaust the 1.0 BTC lot (Long Term) and take 0.2 from the 0.5 BTC lot (Short Term)
  { id: 'tx4', asset: 'BTC', type: 'SELL', amount: 1.2, pricePerUnit: 50000, timestamp: '2024-03-10T11:15:00Z' },
  { id: 'tx5', asset: 'ETH', type: 'SELL', amount: 5, pricePerUnit: 2500, timestamp: '2024-05-01T16:45:00Z' }
];

export default function TaxDashboardPage() {
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  
  useEffect(() => {
    // Process the ledger through the FIFO engine on load
    const events = FifoTaxCalculator.calculateLiability(MOCK_LEDGER);
    setTaxEvents(events);
  }, []);

  const handleDownload = () => {
    CsvExporter.downloadCsv(taxEvents, 'cryptoviz_tax_report_2024.csv');
  };

  // Aggregate Metrics
  const shortTermGains = taxEvents.filter(e => e.term === 'SHORT').reduce((sum, e) => sum + e.gainLoss, 0);
  const longTermGains = taxEvents.filter(e => e.term === 'LONG').reduce((sum, e) => sum + e.gainLoss, 0);
  const ordinaryIncome = taxEvents.filter(e => e.term === 'INCOME').reduce((sum, e) => sum + e.gainLoss, 0);

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-gray-200 font-sans flex justify-center">
      <div className="max-w-6xl w-full">
        
        <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
              Tax Liability Engine
            </h1>
            <p className="text-gray-400 max-w-xl">
              Automated First-In-First-Out (FIFO) cost basis tracking. We resolve complex partial fills and categorize events into IRS-compliant tax lots.
            </p>
          </div>
          <button 
            onClick={handleDownload}
            disabled={taxEvents.length === 0}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-blue-900/50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export Form 8949 CSV
          </button>
        </header>

        {/* Aggregate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Short-Term Capital Gains</h3>
            <p className={\`text-3xl font-black \${shortTermGains >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>
              $\{shortTermGains.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-2">Assets held &lt; 1 year</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Long-Term Capital Gains</h3>
            <p className={\`text-3xl font-black \${longTermGains >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>
              $\{longTermGains.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-2">Assets held &gt; 1 year (Tax Advantaged)</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Ordinary Income</h3>
            <p className="text-3xl font-black text-blue-400">
              $\{ordinaryIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-2">Airdrops, Staking, Mining</p>
          </div>
        </div>

        {/* Detailed Events Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 bg-gray-900">
            <h2 className="text-xl font-bold text-white">Chronological Tax Lots</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">Asset</th>
                  <th className="p-4">Acquired</th>
                  <th className="p-4">Sold</th>
                  <th className="p-4 text-right">Proceeds</th>
                  <th className="p-4 text-right">Cost Basis</th>
                  <th className="p-4 text-right">Gain / Loss</th>
                  <th className="p-4 text-center">Term</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 font-mono text-sm">
                {taxEvents.map((event, i) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {event.amount} {event.asset}
                    </td>
                    <td className="p-4 text-gray-400">{event.dateAcquired.split('T')[0]}</td>
                    <td className="p-4 text-gray-400">{event.dateSold.split('T')[0]}</td>
                    <td className="p-4 text-right text-gray-300">$\{event.proceeds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right text-gray-500">$\{event.costBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={\`p-4 text-right font-bold \${event.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>
                      {event.gainLoss >= 0 ? '+' : ''}${(event.gainLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={\`px-2 py-1 rounded text-xs font-bold \${
                        event.term === 'LONG' ? 'bg-purple-900/50 text-purple-300' :
                        event.term === 'SHORT' ? 'bg-orange-900/50 text-orange-300' :
                        'bg-blue-900/50 text-blue-300'
                      }\`}>
                        {event.term}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
