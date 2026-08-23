'use client';

import React from 'react';
import {
  MpcSigningSession,
  MpcKeyGenerationSession,
  MpcAuditRecord,
  MpcProtocolStats,
  PROTOCOL_COLORS,
  PROTOCOL_ICONS,
  NETWORK_COLORS,
  STATUS_COLORS,
  SECURITY_COLORS,
} from '../../lib/MpcModel';

function formatTime(ms: number): string {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

/* ── Signing Session Card ── */
export function MpcSigningCard({ session }: { session: MpcSigningSession }) {
  const psColor = PROTOCOL_COLORS[session.protocol];
  const psIcon = PROTOCOL_ICONS[session.protocol];
  const statusColor = STATUS_COLORS[session.status];
  const netColor = NETWORK_COLORS[session.network];
  const secColor = SECURITY_COLORS[session.securityLevel];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{psIcon}</span>
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: psColor + '22', color: psColor }}>
            {session.protocol}
          </span>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: statusColor + '22', color: statusColor }}>
          {session.status}
        </span>
      </div>

      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{session.sessionName}</h3>
      <p className="mt-1 text-[11px] text-zinc-500">{session.useCase}</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Threshold</p>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">{session.threshold}/{session.totalParties}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Signing</p>
          <p className="text-base font-bold text-teal-500">{session.partialSignatures}/{session.requiredParties}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Time</p>
          <p className="text-base font-bold text-blue-500">{session.totalSigningTimeMs ? formatTime(session.totalSigningTimeMs) : '—'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px]">
        <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: netColor + '22', color: netColor }}>{session.network}</span>
        <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: secColor + '22', color: secColor }}>{session.securityLevel}</span>
        <span className="text-zinc-400">RT: {session.roundTrips}</span>
        <span className="text-zinc-400">{session.communicationCostKb}KB</span>
      </div>

      {/* Participants */}
      <div className="mt-3 flex flex-wrap gap-1">
        {session.participants.map(p => (
          <span
            key={p.partyId}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${
              p.contributedPartialSig ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              p.status === 'offline' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${p.status === 'online' ? 'bg-green-500' : p.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            {p.partyName}
          </span>
        ))}
      </div>

      {session.failureReason && (
        <div className="mt-3 rounded-lg bg-red-50 p-2 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ {session.failureReason}
        </div>
      )}
    </div>
  );
}

/* ── Key Generation Card ── */
export function MpcKeygenCard({ session }: { session: MpcKeyGenerationSession }) {
  const psColor = PROTOCOL_COLORS[session.protocol];
  const psIcon = PROTOCOL_ICONS[session.protocol];
  const netColor = NETWORK_COLORS[session.network];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{psIcon}</span>
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: psColor + '22', color: psColor }}>
            {session.protocol}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          session.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {session.status}
        </span>
      </div>

      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{session.sessionName}</h3>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Threshold</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{session.threshold}/{session.totalParties}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Gen Time</p>
          <p className="text-sm font-bold text-teal-500">{session.totalGenerationTimeMs ? formatTime(session.totalGenerationTimeMs) : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Shards</p>
          <p className="text-sm font-bold text-blue-500">{session.shards.length}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: netColor + '22', color: netColor }}>{session.network}</span>
        <span className="text-zinc-400">RT: {session.roundTrips}</span>
        <span className="text-zinc-400">{session.communicationCostKb}KB</span>
      </div>

      {/* Shard Status */}
      <div className="mt-3 grid grid-cols-5 gap-1">
        {session.shards.map(shard => (
          <div key={shard.id} className={`rounded p-1 text-center text-[8px] font-medium ${
            shard.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            shard.status === 'rotated' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <div>{shard.partyName.slice(0, 3)}</div>
            <div>{shard.signingCount}×</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[9px] text-zinc-400">
        Address: <span className="font-mono">{session.address}</span>
      </div>
    </div>
  );
}

/* ── Protocol Stats Card ── */
export function MpcProtocolStatsCard({ stats }: { stats: MpcProtocolStats }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{stats.icon}</span>
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{stats.protocol}</h4>
          <span className="text-[10px] text-zinc-400">{stats.totalSessions} sessions</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Completed</p>
          <p className="text-sm font-bold text-green-500">{stats.completedCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Failed</p>
          <p className="text-sm font-bold text-red-500">{stats.failedCount}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Sign Time</p>
          <p className="text-sm font-bold" style={{ color: stats.color }}>{formatTime(stats.avgSigningTimeMs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-zinc-400">Avg Comm</p>
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{stats.avgCommunicationCostKb}KB</p>
        </div>
      </div>
    </div>
  );
}

/* ── Audit Record Row ── */
export function MpcAuditRow({ record }: { record: MpcAuditRecord }) {
  const actionColors: Record<string, string> = { KEYGEN: '#22c55e', SIGN: '#3b82f6', RESHARE: '#a855f7', ROTATE: '#f97316', REVOKE: '#ef4444' };
  const color = actionColors[record.action] || '#888';

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 transition dark:border-zinc-800 dark:bg-zinc-900/20">
      <span className="rounded-md px-2 py-1 text-[10px] font-bold uppercase" style={{ backgroundColor: color + '22', color }}>
        {record.action}
      </span>
      <div className="flex-1">
        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{record.sessionName}</p>
        <p className="text-[10px] text-zinc-400">{record.protocol} • {record.network} • {record.parties} parties (T:{record.threshold})</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{formatTime(record.durationMs)}</p>
        <p className="text-[10px] text-zinc-400">{record.communicationCostKb}KB • {new Date(record.timestamp).toLocaleDateString()}</p>
      </div>
      <span className={`text-[10px] font-semibold ${record.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>
        {record.status === 'SUCCESS' ? '✓' : '✗'}
      </span>
    </div>
  );
}

/* ── Stats Overview ── */
export function MpcOverviewStats({ stats }: { stats: { totalSigningSessions: number; totalKeygenSessions: number; completedCount: number; totalParties: number; avgSigningTime: number } }) {
  const items = [
    { label: 'Signing Sessions', value: stats.totalSigningSessions, accent: false },
    { label: 'Keygen Sessions', value: stats.totalKeygenSessions, accent: false },
    { label: 'Completed', value: stats.completedCount, accent: true },
    { label: 'Total Particles', value: stats.totalParties, accent: false },
    { label: 'Avg Sign Time', value: formatTime(stats.avgSigningTime), accent: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
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
