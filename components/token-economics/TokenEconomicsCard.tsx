'use client';

import React from 'react';
import {
  TokenProfile,
  VestingSchedule,
  TokenHolder,
  GovernanceProposal,
  SupplyEvent,
  TOKEN_TYPE_COLORS,
  VESTING_COLORS,
  PROPOSAL_STATUS_COLORS,
} from '../../lib/TokenEconomicsModel';

function formatNumber(val: number): string {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function formatSupply(val: number): string {
  if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  return val.toLocaleString();
}

/* ── Token Profile Card ── */
export function TokenCard({ token }: { token: TokenProfile }) {
  const typeColor = TOKEN_TYPE_COLORS[token.type];
  const changeColor = token.priceChange24h >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full" style={{ backgroundColor: token.color + '33' }}>
            <div className="flex h-full items-center justify-center text-xs font-bold" style={{ color: token.color }}>{token.symbol.slice(0, 2)}</div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{token.name}</h3>
            <span className="text-[10px] text-zinc-400">{token.symbol} • {token.chain}</span>
          </div>
        </div>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: typeColor + '22', color: typeColor }}>{token.type}</span>
      </div>

      <div className="mb-3 flex items-end gap-2">
        <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{formatNumber(token.currentPrice)}</span>
        <span className="text-xs font-semibold" style={{ color: changeColor }}>{token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Market Cap</p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatNumber(token.marketCap)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">FDV</p>
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatNumber(token.fullyDilutedValuation)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Volume 24h</p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatNumber(token.volume24h)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Holders</p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatSupply(token.holders)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-400">Circulating</span>
          <span className="text-zinc-500">{((token.circulatingSupply / token.totalSupply) * 100).toFixed(1)}%</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full" style={{ width: `${(token.circulatingSupply / token.totalSupply) * 100}%`, backgroundColor: token.color }} />
        </div>
      </div>
    </div>
  );
}

/* ── Vesting Schedule Card ── */
export function VestingCard({ vesting }: { vesting: VestingSchedule }) {
  const catColor = VESTING_COLORS[vesting.category];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: catColor + '22', color: catColor }}>{vesting.category}</span>
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{vesting.tokenSymbol}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: catColor }}>{vesting.unlockedPercent}%</span>
      </div>

      <div className="mb-3">
        <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full transition-all" style={{ width: `${vesting.unlockedPercent}%`, backgroundColor: catColor }} />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-zinc-400">
          <span>{formatSupply(vesting.totalAllocation)} tokens</span>
          <span>{formatNumber(vesting.totalAllocationUsd)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Monthly Unlock</p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatSupply(vesting.monthlyUnlockAmount)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Next Unlock</p>
          <p className="text-xs font-bold text-teal-500">{vesting.nextUnlockDate ? new Date(vesting.nextUnlockDate).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-400">
        <span>Start: {new Date(vesting.startDate).toLocaleDateString()}</span>
        <span>End: {new Date(vesting.endDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ── Token Holder Card ── */
export function HolderCard({ holder }: { holder: TokenHolder }) {
  const typeColors: Record<string, string> = { whale: '#FF6B6B', exchange: '#627EEA', contract: '#22c55e', team: '#9333EA', retail: '#94a3b8' };
  const color = typeColors[holder.type];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{holder.label}</h4>
          <p className="text-[9px] font-mono text-zinc-400">{holder.address.slice(0, 18)}...</p>
        </div>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: color + '22', color }}>{holder.type}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Balance</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{formatSupply(holder.balance)}</p>
          <p className="text-[10px] text-zinc-400">{formatNumber(holder.balanceUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">% Supply</p>
          <p className="text-sm font-bold" style={{ color }}>{holder.percentOfSupply}%</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-400">
        <span>{holder.transferCount.toLocaleString()} transfers</span>
        <span>Last: {new Date(holder.lastActivity).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ── Governance Proposal Card ── */
export function ProposalCard({ proposal }: { proposal: GovernanceProposal }) {
  const statusColor = PROPOSAL_STATUS_COLORS[proposal.status] || '#888';
  const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono text-zinc-400">#{proposal.proposalNumber}</span>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{proposal.title}</h4>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: statusColor + '22', color: statusColor }}>{proposal.status}</span>
      </div>

      <p className="mb-3 text-[11px] text-zinc-500 line-clamp-2">{proposal.description}</p>

      <div className="mb-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="bg-green-500" style={{ width: `${forPercent}%` }} />
          <div className="bg-red-500" style={{ width: `${(proposal.votesAgainst / totalVotes) * 100}%` }} />
          <div className="bg-zinc-300" style={{ width: `${(proposal.votesAbstain / totalVotes) * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[9px]">
          <span className="text-green-600">For: {proposal.votesFor > 1e6 ? `${(proposal.votesFor / 1e6).toFixed(1)}M` : proposal.votesFor.toLocaleString()}</span>
          <span className="text-red-500">Against: {proposal.votesAgainst > 1e6 ? `${(proposal.votesAgainst / 1e6).toFixed(1)}M` : proposal.votesAgainst.toLocaleString()}</span>
          <span className="text-zinc-400">Abstain: {proposal.votesAbstain > 1e6 ? `${(proposal.votesAbstain / 1e6).toFixed(1)}M` : proposal.votesAbstain.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-zinc-400">
        <span>Quorum: {proposal.quorumPercent}% / {proposal.requiredQuorum}%</span>
        <span>{proposal.tokenSymbol} • {proposal.totalVoters.toLocaleString()} voters</span>
      </div>
    </div>
  );
}

/* ── Supply Event Row ── */
export function SupplyEventRow({ event }: { event: SupplyEvent }) {
  const eventColors: Record<string, string> = { burn: '#ef4444', mint: '#22c55e', lock: '#3b82f6', unlock: '#f97316', transfer: '#94a3b8' };
  const color = eventColors[event.eventType] || '#888';

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 transition dark:border-zinc-800 dark:bg-zinc-900/20">
      <span className="rounded-md px-2 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: color + '22', color }}>{event.eventType}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{event.description}</p>
        <p className="text-[10px] text-zinc-400">{event.tokenSymbol} • {new Date(event.timestamp).toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatSupply(event.amount)}</p>
        <p className="text-[10px] text-zinc-400">{formatNumber(event.amountUsd)}</p>
      </div>
    </div>
  );
}

/* ── Stats Overview ── */
export function TokenEconomicsOverviewStats({ stats }: { stats: TokenEconomicsStats }) {
  const items = [
    { label: 'Total Tokens', value: stats.totalTokens, accent: false },
    { label: 'Total MCap', value: formatNumber(stats.totalMarketCap), accent: true },
    { label: 'Volume 24h', value: formatNumber(stats.totalVolume24h), accent: false },
    { label: 'Total Holders', value: formatSupply(stats.totalHolders), accent: false },
    { label: 'Avg 24h Change', value: `${stats.avgPriceChange24h >= 0 ? '+' : ''}${stats.avgPriceChange24h}%`, accent: true },
    { label: 'Total Burned', value: formatNumber(stats.totalBurned), accent: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(item => (
        <div key={item.label} className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
          item.accent ? 'border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{item.label}</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${item.accent ? 'text-teal-500' : 'text-zinc-900 dark:text-zinc-50'}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
