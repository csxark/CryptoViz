'use client';

import React from 'react';
import { YieldPool, YieldFarmingPosition, ProtocolStats, RISK_COLORS, PROTOCOL_COLORS, PROTOCOL_ICONS, ASSET_CATEGORY_COLORS } from '../../lib/DefiYieldModel';

function formatUsd(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

/* ── Pool Card ── */
export function YieldPoolCard({ pool, onSelect }: { pool: YieldPool; onSelect?: (p: YieldPool) => void }) {
  const riskColor = RISK_COLORS[pool.riskLevel];
  const protoColor = PROTOCOL_COLORS[pool.protocol];
  const protoIcon = PROTOCOL_ICONS[pool.protocol];
  const catColor = ASSET_CATEGORY_COLORS[pool.assetCategory];

  return (
    <div
      onClick={() => onSelect?.(pool)}
      className="group relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-teal-500/40"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{protoIcon}</span>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: protoColor + '22', color: protoColor }}
          >
            {pool.protocol}
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: riskColor + '22', color: riskColor }}
        >
          {pool.riskLevel}
        </span>
      </div>

      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{pool.poolName}</h3>
      <div className="mt-1 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: catColor + '22', color: catColor }}
        >
          {pool.assetCategory}
        </span>
        <span className="text-[11px] text-zinc-400">{pool.chain}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">APY</p>
          <p className="text-lg font-bold text-teal-500">{pool.apyPercent.toFixed(2)}%</p>
          <p className="text-[10px] text-zinc-400">
            Base {pool.apyBase.toFixed(1)}% + Reward {pool.apyReward.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">TVL</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{formatUsd(pool.tvlUsd)}</p>
        </div>
      </div>

      {pool.impermanentLossRisk > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400">IL Risk</span>
            <span style={{ color: riskColor }}>{pool.impermanentLossRisk}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(pool.impermanentLossRisk * 3, 100)}%`, backgroundColor: riskColor }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-zinc-400">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${pool.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
          {pool.status}
        </span>
        <span className="text-zinc-400">{pool.auditStatus === 'audited' ? '✅ Audited' : '⚠️ Unaudited'}</span>
      </div>
    </div>
  );
}

/* ── Position Card ── */
export function YieldPositionCard({
  position,
  onHarvest,
  onWithdraw,
}: {
  position: YieldFarmingPosition;
  onHarvest?: (id: string) => void;
  onWithdraw?: (id: string) => void;
}) {
  const protoColor = PROTOCOL_COLORS[position.protocol];
  const protoIcon = PROTOCOL_ICONS[position.protocol];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{protoIcon}</span>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{position.poolName}</h4>
            <span className="text-[10px] text-zinc-400">{position.protocol}</span>
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: protoColor + '22', color: protoColor }}
        >
          {position.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Deposited</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatUsd(position.depositedAmountUsd)}</p>
          <p className="text-[10px] text-zinc-400">{position.depositedAmountToken.toFixed(4)} {position.assetSymbol}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Earned</p>
          <p className="text-base font-bold text-green-500">+{formatUsd(position.earnedUsd)}</p>
          <p className="text-[10px] text-zinc-400">APY: {position.currentApy.toFixed(2)}%</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Entry: {new Date(position.entryDate).toLocaleDateString()}</span>
        <span className="flex items-center gap-1">
          {position.autoCompound ? '🔄 Auto' : '✋ Manual'}
        </span>
      </div>

      {position.status === 'active' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onHarvest?.(position.id); }}
            className="flex-1 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
          >
            🌾 Harvest
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onWithdraw?.(position.id); }}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            ↩ Withdraw
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Protocol Stats Card ── */
export function ProtocolStatsCard({ stats }: { stats: ProtocolStats }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{stats.icon}</span>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{stats.protocol}</h4>
          <span className="text-[10px] text-zinc-400">{stats.poolCount} pools</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">TVL</p>
          <p className="text-sm font-bold" style={{ color: stats.color }}>{formatUsd(stats.totalTvlUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg APY</p>
          <p className="text-sm font-bold text-teal-500">{stats.avgApy.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

/* ── Audit Record Row ── */
export function YieldAuditRow({ record }: { record: import('../../lib/DefiYieldModel').YieldAuditRecord }) {
  const actionColors: Record<string, string> = {
    DEPOSIT: '#22c55e',
    WITHDRAW: '#f97316',
    HARVEST: '#3b82f6',
    COMPOUND: '#a855f7',
  };
  const color = actionColors[record.action] || '#888';

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 transition dark:border-zinc-800 dark:bg-zinc-900/20">
      <span
        className="rounded-md px-2 py-1 text-[10px] font-bold uppercase"
        style={{ backgroundColor: color + '22', color }}
      >
        {record.action}
      </span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{record.poolName}</p>
        <p className="text-[10px] text-zinc-400">{record.protocol} • {record.assetSymbol}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatUsd(record.amountUsd)}</p>
        <p className="text-[10px] text-zinc-400">{new Date(record.timestamp).toLocaleDateString()}</p>
      </div>
      <span className={`text-[10px] font-semibold ${record.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
        {record.status === 'SUCCESS' ? '✓' : '✗'}
      </span>
    </div>
  );
}

/* ── Stats Overview Card ── */
export function YieldOverviewStats({ stats }: { stats: { totalTvl: number; avgApy: number; poolCount: number; positionCount: number; totalPositionValue: number; totalEarned: number } }) {
  const items = [
    { label: 'Total TVL', value: formatUsd(stats.totalTvl), accent: true },
    { label: 'Avg APY', value: `${stats.avgApy}%`, accent: true },
    { label: 'Pools', value: stats.poolCount, accent: false },
    { label: 'My Positions', value: stats.positionCount, accent: false },
    { label: 'Position Value', value: formatUsd(stats.totalPositionValue), accent: false },
    { label: 'Total Earned', value: `+${formatUsd(stats.totalEarned)}`, accent: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
            item.accent
              ? 'border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10'
              : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{item.label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${item.accent ? 'text-teal-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
