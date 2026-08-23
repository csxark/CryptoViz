'use client';

import React, { useState, useEffect } from 'react';
import { TokenEconomicsServiceHandler } from '../../lib/TokenEconomicsService';
import { TokenEconomicsFilterOptions } from '../../lib/TokenEconomicsModel';
import {
  TokenCard,
  VestingCard,
  HolderCard,
  ProposalCard,
  SupplyEventRow,
  TokenEconomicsOverviewStats,
} from '../../components/token-economics/TokenEconomicsCard';
import {
  MarketCapTreemap,
  TokenTypePie,
  VestingAllocationBar,
  HolderDistributionBar,
  PriceVsMcapChart,
} from '../../components/token-economics/TokenEconomicsTimeline';
import { Search, Coins, Activity, FileText, Lock, Users } from 'lucide-react';

type Tab = 'overview' | 'tokens' | 'vesting' | 'governance' | 'holders';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'tokens', label: 'Tokens', icon: <Coins size={16} /> },
  { id: 'vesting', label: 'Vesting', icon: <Lock size={16} /> },
  { id: 'governance', label: 'Governance', icon: <FileText size={16} /> },
  { id: 'holders', label: 'Top Holders', icon: <Users size={16} /> },
];

export default function TokenEconomicsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [tokens, setTokens] = useState<ReturnType<typeof TokenEconomicsServiceHandler.fetchTokens>>([]);
  const [vesting, setVesting] = useState<ReturnType<typeof TokenEconomicsServiceHandler.fetchVesting>>([]);
  const [holders, setHolders] = useState<ReturnType<typeof TokenEconomicsServiceHandler.fetchHolders>>([]);
  const [proposals, setProposals] = useState<ReturnType<typeof TokenEconomicsServiceHandler.fetchProposals>>([]);
  const [events, setEvents] = useState<ReturnType<typeof TokenEconomicsServiceHandler.fetchEvents>>([]);
  const [stats, setStats] = useState(TokenEconomicsServiceHandler.getTotalStats());

  const [filters, setFilters] = useState<TokenEconomicsFilterOptions>({
    type: 'All', chain: 'All', sortBy: 'mcap', searchQuery: '',
  });

  const refresh = () => {
    setTokens(TokenEconomicsServiceHandler.fetchTokens(filters));
    setVesting(TokenEconomicsServiceHandler.fetchVesting());
    setHolders(TokenEconomicsServiceHandler.fetchHolders());
    setProposals(TokenEconomicsServiceHandler.fetchProposals());
    setEvents(TokenEconomicsServiceHandler.fetchEvents());
    setStats(TokenEconomicsServiceHandler.getTotalStats());
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setTokens(TokenEconomicsServiceHandler.fetchTokens(filters)); }, [filters]);

  const applyFilter = (updated: Partial<TokenEconomicsFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-500/10 p-3">
              <Coins size={24} className="text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Token Economics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Tokenomics analysis • {tokens.length} tokens • {vesting.length} vesting schedules • {proposals.length} proposals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6"><TokenEconomicsOverviewStats stats={stats} /></div>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-yellow-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}>{t.icon}{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <MarketCapTreemap tokens={tokens} />
              <TokenTypePie tokens={tokens} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <VestingAllocationBar vesting={vesting} />
              <HolderDistributionBar holders={holders} />
            </div>
            <PriceVsMcapChart tokens={tokens} />

            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📋 Recent Supply Events</h3>
              <div className="space-y-2">{events.slice(0, 5).map(e => <SupplyEventRow key={e.id} event={e} />)}</div>
            </div>
          </div>
        )}

        {tab === 'tokens' && (
          <div>
            <div className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Search tokens by name or symbol..." className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-yellow-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  value={filters.searchQuery} onChange={e => applyFilter({ searchQuery: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'type', options: ['All', 'Utility', 'Governance', 'Security', 'Stablecoin', 'NFT', 'Meme', 'DeFi', 'Layer 1', 'Layer 2'] },
                  { key: 'chain', options: ['All', 'Ethereum', 'Arbitrum', 'Polygon', 'BSC', 'Solana'] },
                  { key: 'sortBy', options: ['mcap', 'volume', 'holders', 'price', 'name'] },
                ].map(f => (
                  <select key={f.key} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    value={filters[f.key as keyof TokenEconomicsFilterOptions] as string}
                    onChange={e => applyFilter({ [f.key]: e.target.value })}>
                    {f.options.map(opt => <option key={opt} value={opt}>{f.key}: {opt}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tokens.map(t => <TokenCard key={t.id} token={t} />)}
            </div>
          </div>
        )}

        {tab === 'vesting' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vesting.map(v => <VestingCard key={v.id} vesting={v} />)}
          </div>
        )}

        {tab === 'governance' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        )}

        {tab === 'holders' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {holders.map(h => <HolderCard key={h.id} holder={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}
