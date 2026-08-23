'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  ZkCircuit,
  ZkProtocolStats,
  PROOF_SYSTEM_COLORS,
  CATEGORY_COLORS,
  PROOF_SYSTEM_ICONS,
} from '../../lib/ZkProofModel';

/* ── Proof System Comparison Bar ── */
export function ProofSystemBarChart({ stats }: { stats: ZkProtocolStats[] }) {
  const data = stats.map(s => ({
    name: s.proofSystem.replace(' (STARK)', ''),
    proveTime: s.avgProvingTimeMs,
    verifyTime: s.avgVerificationTimeMs,
    color: s.color,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">⏱ Prove vs Verify Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}s` : `${v}ms`} />
          <Tooltip
            formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`, '']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Bar dataKey="proveTime" fill="#00C2AE" radius={[4, 4, 0, 0]} name="Prove Time" />
          <Bar dataKey="verifyTime" fill="#627EEA" radius={[4, 4, 0, 0]} name="Verify Time" />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Category Distribution Pie ── */
export function CategoryPieChart({ circuits }: { circuits: ZkCircuit[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    circuits.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return Object.entries(counts).map(([cat, count]) => ({
      name: cat,
      value: count,
      color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#888',
    }));
  }, [circuits]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📂 Circuit Categories</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Constraints vs Prove Time Scatter ── */
export function ConstraintsProveTimeScatter({ circuits }: { circuits: ZkCircuit[] }) {
  const data = circuits.map(c => ({
    name: c.name,
    constraints: c.constraints,
    proveTime: c.provingTimeMs,
    proofSize: c.proofSizeBytes,
    color: PROOF_SYSTEM_COLORS[c.proofSystem],
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🔬 Constraints vs Prove Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="constraints"
            type="number"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            name="Constraints"
          />
          <YAxis
            dataKey="proveTime"
            type="number"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}s` : `${v}ms`}
            name="Prove Time"
          />
          <ZAxis dataKey="proofSize" range={[40, 400]} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Constraints') return [value.toLocaleString(), name];
              if (name === 'Prove Time') return [value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`, name];
              return [`${value} bytes`, name];
            }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Scatter data={data} fill="#00C2AE" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Proof System Radar ── */
export function ProofSystemRadar({ stats }: { stats: ZkProtocolStats[] }) {
  const radarData = stats.map(s => ({
    system: s.proofSystem.replace(' (STARK)', ''),
    provingSpeed: Math.max(0, 100 - s.avgProvingTimeMs / 100),
    verificationSpeed: Math.max(0, 100 - s.avgVerificationTimeMs),
    proofSize: Math.max(0, 100 - s.avgProofSizeBytes / 10),
    reliability: s.totalProofs > 0 ? (s.verifiedCount / s.totalProofs) * 100 : 50,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🕸 Protocol Comparison Radar</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(0,0,0,0.05)" />
          <PolarAngleAxis dataKey="system" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <PolarRadiusAxis tick={{ fontSize: 8, fill: '#94a3b8' }} />
          <Radar name="Proving Speed" dataKey="provingSpeed" stroke="#00C2AE" fill="#00C2AE" fillOpacity={0.15} />
          <Radar name="Reliability" dataKey="reliability" stroke="#627EEA" fill="#627EEA" fillOpacity={0.15} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Proof Size Comparison ── */
export function ProofSizeBarChart({ stats }: { stats: ZkProtocolStats[] }) {
  const data = stats.map(s => ({
    name: s.proofSystem.replace(' (STARK)', ''),
    size: s.avgProofSizeBytes,
    color: s.color,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📦 Average Proof Size</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}B`} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={90} />
          <Tooltip
            formatter={(value: number) => [`${value} bytes`, 'Size']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Bar dataKey="size" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
