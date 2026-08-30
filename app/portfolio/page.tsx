'use client';

import React, { useState } from 'react';
import { PortfolioManager, Asset } from '../../lib/portfolio/PortfolioManager';

export default function PortfolioAggregatorPage() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAssets(null);

    try {
      // Triggers concurrent cross-chain RPC fetches (mocked via PortfolioManager)
      const data = await PortfolioManager.fetchAggregatedPortfolio(address);
      setAssets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cross-chain data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalNetWorth = assets?.reduce((sum, asset) => sum + asset.totalValueUsd, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-950 p-8 text-gray-200 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Header & Lookup Bar */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Omni-Chain Portfolio Aggregator
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Instantly aggregate your decentralized assets across Ethereum, Solana, and Polygon L2s into a single, unified fiat valuation without switching RPC nodes.
          </p>
          
          <form onSubmit={handleLookup} className="flex justify-center gap-3">
            <input 
              type="text" 
              placeholder="Enter EVM or Solana Wallet Address (e.g. 0x... or 7b...)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            />
            <button 
              type="submit"
              disabled={isLoading || !address}
              className={\`px-6 py-3 rounded-lg font-bold transition-colors \${
                isLoading || !address
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'
              }\`}
            >
              {isLoading ? 'Scanning Chains...' : 'Analyze'}
            </button>
          </form>
          {error && <p className="text-red-400 mt-4 font-mono text-sm">Error: {error}</p>}
        </div>

        {/* Results Dashboard */}
        {assets && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Total Net Worth Banner */}
            <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-8 border-b border-gray-800 text-center">
              <h2 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Total Unified Net Worth</h2>
              <div className="text-6xl font-black text-white">
                $\{totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Asset Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/50 text-gray-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Asset</th>
                    <th className="p-4 font-medium">Network</th>
                    <th className="p-4 font-medium text-right">Balance</th>
                    <th className="p-4 font-medium text-right">Price (USD)</th>
                    <th className="p-4 font-medium text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {assets.map((asset, index) => (
                    <tr key={\`\${asset.chain}-\${asset.symbol}-\${index}\`} className="hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg shadow-inner">
                          {asset.logo}
                        </div>
                        <span className="font-bold text-white text-lg">{asset.symbol}</span>
                      </td>
                      <td className="p-4">
                        <span className={\`px-2 py-1 rounded text-xs font-bold \${
                          asset.chain === 'Ethereum' ? 'bg-blue-900/50 text-blue-300' :
                          asset.chain === 'Solana' ? 'bg-purple-900/50 text-purple-300' :
                          'bg-indigo-900/50 text-indigo-300'
                        }\`}>
                          {asset.chain}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono">
                        {asset.normalizedBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="p-4 text-right font-mono text-gray-400">
                        $\{asset.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 text-lg">
                        $\{asset.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
