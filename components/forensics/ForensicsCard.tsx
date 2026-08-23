'use client';

import React from 'react';
import {
  AddressProfile,
  TransactionTrace,
  ForensicsAlert,
  Investigation,
  RISK_CATEGORY_COLORS,
  SEVERITY_COLORS,
  CHAIN_COLORS,
  STATUS_COLORS,
} from '../../lib/ForensicsModel';

function formatUsd(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

/* ── Address Profile Card ── */
export function AddressCard({ address, onSelect }: { address: AddressProfile; onSelect?: (a: AddressProfile) => void }) {
  const riskColor = address.riskScore >= 80 ? '#dc2626' : address.riskScore >= 50 ? '#f97316' : address.riskScore >= 20 ? '#eab308' : '#22c55e';
  const catColor = RISK_CATEGORY_COLORS[address.riskCategory];
  const chainColor = CHAIN_COLORS[address.chain];

  return (
    <div onClick={() => onSelect?.(address)} className="cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{address.label}</h3>
          <p className="mt-0.5 text-[10px] font-mono text-zinc-400">{address.address.slice(0, 18)}...</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: riskColor }}>{address.riskScore}</div>
          <div className="text-[9px] text-zinc-400">Risk</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: catColor + '22', color: catColor }}>{address.riskCategory}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: chainColor + '22', color: chainColor }}>{address.chain}</span>
        {address.isContract && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">Contract</span>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Inflow</p>
          <p className="text-xs font-bold text-green-500">{formatUsd(address.totalInflowUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Outflow</p>
          <p className="text-xs font-bold text-red-500">{formatUsd(address.totalOutflowUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Balance</p>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatUsd(address.balanceUsd)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{address.transactionCount.toLocaleString()} txs</span>
        <span>Last: {new Date(address.lastSeen).toLocaleDateString()}</span>
      </div>

      {address.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {address.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-800">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Transaction Trace Card ── */
export function TransactionCard({ tx }: { tx: TransactionTrace }) {
  const chainColor = CHAIN_COLORS[tx.chain];

  return (
    <div className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
      tx.isSuspicious ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: chainColor + '22', color: chainColor }}>{tx.chain}</span>
          {tx.isSuspicious && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">⚠ SUSPICIOUS</span>}
        </div>
        <span className="text-[10px] text-zinc-400">Block #{tx.blockNumber}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{tx.fromLabel}</p>
          <p className="text-[9px] font-mono text-zinc-400">{tx.fromAddress.slice(0, 14)}...</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-teal-500">{formatUsd(tx.valueUsd)}</span>
          <span className="text-[10px] text-zinc-400">→</span>
          <span className="text-[9px] text-zinc-400">{tx.valueToken} {tx.tokenSymbol}</span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{tx.toLabel}</p>
          <p className="text-[9px] font-mono text-zinc-400">{tx.toAddress.slice(0, 14)}...</p>
        </div>
      </div>

      {tx.riskFlags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tx.riskFlags.map(flag => (
            <span key={flag} className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">{flag}</span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Depth: {tx.traceDepth}</span>
        <span>{new Date(tx.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ── Alert Card ── */
export function AlertCard({ alert, onAcknowledge, onResolve }: { alert: ForensicsAlert; onAcknowledge?: (id: string) => void; onResolve?: (id: string) => void }) {
  const sevColor = SEVERITY_COLORS[alert.severity];
  const catColor = RISK_CATEGORY_COLORS[alert.riskCategory];

  return (
    <div className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
      alert.status === 'active' ? 'border-l-4 bg-white dark:bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/20'
    }`} style={{ borderLeftColor: alert.status === 'active' ? sevColor : undefined }}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{alert.title}</h4>
          <p className="mt-0.5 text-[11px] text-zinc-500">{alert.description}</p>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: sevColor + '22', color: sevColor }}>
          {alert.severity}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: catColor + '22', color: catColor }}>{alert.riskCategory}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: CHAIN_COLORS[alert.chain] + '22', color: CHAIN_COLORS[alert.chain] }}>{alert.chain}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Score: {alert.riskScore}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
        {alert.acknowledgedBy && <span>Ack'd by {alert.acknowledgedBy}</span>}
      </div>

      {alert.status === 'active' && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => onAcknowledge?.(alert.id)} className="flex-1 rounded-lg bg-blue-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-600">Acknowledge</button>
          <button onClick={() => onResolve?.(alert.id)} className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Resolve</button>
        </div>
      )}
    </div>
  );
}

/* ── Investigation Card ── */
export function InvestigationCard({ investigation }: { investigation: Investigation }) {
  const statusColor = STATUS_COLORS[investigation.status];
  const priorityColors: Record<string, string> = { P1: '#dc2626', P2: '#f97316', P3: '#eab308', P4: '#22c55e' };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono text-zinc-400">{investigation.caseNumber}</span>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{investigation.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: (priorityColors[investigation.priority] || '#888') + '22', color: priorityColors[investigation.priority] || '#888' }}>{investigation.priority}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: statusColor + '22', color: statusColor }}>{investigation.status}</span>
        </div>
      </div>

      <p className="mb-3 text-[11px] text-zinc-500">{investigation.description}</p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Risk</p>
          <p className="text-sm font-bold" style={{ color: investigation.riskScore >= 80 ? '#dc2626' : investigation.riskScore >= 50 ? '#f97316' : '#22c55e' }}>{investigation.riskScore}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Alerts</p>
          <p className="text-sm font-bold text-blue-500">{investigation.alertCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Chain</p>
          <p className="text-sm font-bold" style={{ color: CHAIN_COLORS[investigation.chain] }}>{investigation.chain}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Lead: {investigation.leadAnalyst}</span>
        <span>{new Date(investigation.updatedAt).toLocaleDateString()}</span>
      </div>

      {investigation.findings && (
        <div className="mt-3 rounded-lg bg-green-50 p-2 text-[10px] text-green-700 dark:bg-green-900/20 dark:text-green-400">
          📋 {investigation.findings}
        </div>
      )}
    </div>
  );
}

/* ── Stats Overview ── */
export function ForensicsOverviewStats({ stats }: { stats: ForensicsStats }) {
  const items = [
    { label: 'Addresses', value: stats.totalAddresses, accent: false },
    { label: 'Total Alerts', value: stats.totalAlerts, accent: false },
    { label: 'Active Alerts', value: stats.activeAlerts, accent: true },
    { label: 'Investigations', value: stats.totalInvestigations, accent: false },
    { label: 'Open Cases', value: stats.openInvestigations, accent: true },
    { label: 'Avg Risk', value: stats.avgRiskScore, accent: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(item => (
        <div key={item.label} className={`rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
          item.accent ? 'border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{item.label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${item.accent ? 'text-teal-500' : 'text-zinc-900 dark:text-zinc-50'}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
