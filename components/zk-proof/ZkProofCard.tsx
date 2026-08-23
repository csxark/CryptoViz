'use client';

import React from 'react';
import {
  ZkCircuit,
  ZkProofRecord,
  ZkBenchmarkResult,
  ZkProtocolStats,
  PROOF_SYSTEM_COLORS,
  PROOF_SYSTEM_ICONS,
  CATEGORY_COLORS,
  STATUS_COLORS,
} from '../../lib/ZkProofModel';

function formatBytes(bytes: number): string {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

/* ── Circuit Card ── */
export function ZkCircuitCard({ circuit, onSelect }: { circuit: ZkCircuit; onSelect?: (c: ZkCircuit) => void }) {
  const psColor = PROOF_SYSTEM_COLORS[circuit.proofSystem];
  const psIcon = PROOF_SYSTEM_ICONS[circuit.proofSystem];
  const catColor = CATEGORY_COLORS[circuit.category];

  return (
    <div
      onClick={() => onSelect?.(circuit)}
      className="group cursor-pointer rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-teal-500/40"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{psIcon}</span>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: psColor + '22', color: psColor }}
          >
            {circuit.proofSystem}
          </span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: catColor + '22', color: catColor }}
        >
          {circuit.category}
        </span>
      </div>

      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{circuit.name}</h3>
      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{circuit.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Constraints</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">{circuit.constraints.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Prove Time</p>
          <p className="text-base font-bold text-teal-500">{formatTime(circuit.provingTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Verify Time</p>
          <p className="text-base font-bold text-blue-500">{formatTime(circuit.verificationTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Proof Size</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatBytes(circuit.proofSizeBytes)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <span className="text-zinc-400">Inputs: {circuit.publicInputs} pub / {circuit.privateInputs} priv</span>
        <span className="text-zinc-300">•</span>
        <span className="text-zinc-400">Memory: {circuit.memoryUsageMb}MB</span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="text-zinc-400">{circuit.curve} • {circuit.verificationLayer}</span>
        <span className={circuit.auditStatus === 'audited' ? 'text-green-500' : circuit.auditStatus === 'in-review' ? 'text-yellow-500' : 'text-red-400'}>
          {circuit.auditStatus === 'audited' ? '✅ Audited' : circuit.auditStatus === 'in-review' ? '🔍 Review' : '⚠️ Unaudited'}
        </span>
      </div>
    </div>
  );
}

/* ── Proof Record Card ── */
export function ZkProofRecordCard({ record }: { record: ZkProofRecord }) {
  const statusColor = STATUS_COLORS[record.status];
  const psColor = PROOF_SYSTEM_COLORS[record.proofSystem];
  const psIcon = PROOF_SYSTEM_ICONS[record.proofSystem];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{psIcon}</span>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{record.circuitName}</h4>
            <span className="text-[10px]" style={{ color: psColor }}>{record.proofSystem}</span>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: statusColor + '22', color: statusColor }}
        >
          {record.status}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Prove</p>
          <p className="text-xs font-bold text-teal-500">{formatTime(record.provingTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Verify</p>
          <p className="text-xs font-bold text-blue-500">{formatTime(record.verificationTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Size</p>
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatBytes(record.proofSizeBytes)}</p>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
        <p className="text-[9px] font-mono text-zinc-400 break-all">Proof: {record.proofHash.slice(0, 42)}...</p>
      </div>

      {record.failureReason && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ {record.failureReason}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{record.gasUsed ? `${(record.gasUsed / 1000).toFixed(0)}K gas` : 'N/A'}</span>
        <span>{new Date(record.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ── Benchmark Card ── */
export function ZkBenchmarkCard({ benchmark }: { benchmark: ZkBenchmarkResult }) {
  const psColor = PROOF_SYSTEM_COLORS[benchmark.proofSystem];
  const psIcon = PROOF_SYSTEM_ICONS[benchmark.proofSystem];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{psIcon}</span>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{benchmark.circuitName}</h4>
          <span className="text-[10px]" style={{ color: psColor }}>{benchmark.proofSystem} • {benchmark.curve}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Prove</p>
          <p className="text-sm font-bold text-teal-500">{formatTime(benchmark.avgProvingTimeMs)}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Verify</p>
          <p className="text-sm font-bold text-blue-500">{formatTime(benchmark.avgVerificationTimeMs)}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Throughput</p>
          <p className="text-sm font-bold text-purple-500">{benchmark.throughputProofsPerSec.toFixed(2)}/s</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Memory Peak</p>
          <p className="text-sm font-bold text-orange-500">{benchmark.memoryPeakMb}MB</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Batch: {benchmark.batchSize.toLocaleString()}</span>
        <span>Size: {formatBytes(benchmark.avgProofSizeBytes)}</span>
      </div>
    </div>
  );
}

/* ── Protocol Stats Card ── */
export function ZkProtocolStatsCard({ stats }: { stats: ZkProtocolStats }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{stats.icon}</span>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{stats.proofSystem}</h4>
          <span className="text-[10px] text-zinc-400">{stats.totalCircuits} circuits</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Total Proofs</p>
          <p className="text-sm font-bold" style={{ color: stats.color }}>{stats.totalProofs}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Verified</p>
          <p className="text-sm font-bold text-green-500">{stats.verifiedCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Prove</p>
          <p className="text-sm font-bold text-teal-500">{formatTime(stats.avgProvingTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Size</p>
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{formatBytes(stats.avgProofSizeBytes)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Stats Overview ── */
export function ZkOverviewStats({ stats }: { stats: { totalCircuits: number; totalProofs: number; verifiedCount: number; avgProvingTime: number; avgVerificationTime: number; totalConstraints: number } }) {
  const items = [
    { label: 'Total Circuits', value: stats.totalCircuits, accent: false },
    { label: 'Total Proofs', value: stats.totalProofs, accent: false },
    { label: 'Verified', value: stats.verifiedCount, accent: true },
    { label: 'Avg Prove Time', value: formatTime(stats.avgProvingTime), accent: false },
    { label: 'Avg Verify Time', value: formatTime(stats.avgVerificationTime), accent: true },
    { label: 'Total Constraints', value: stats.totalConstraints.toLocaleString(), accent: false },
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
