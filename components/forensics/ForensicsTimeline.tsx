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
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area,
} from 'recharts';
import { AddressProfile, ForensicsAlert, RISK_CATEGORY_COLORS, SEVERITY_COLORS, CHAIN_COLORS } from '../../lib/ForensicsModel';

/* ── Risk Category Distribution ── */
export function RiskCategoryPie({ addresses }: { addresses: AddressProfile[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    addresses.forEach(a => { counts[a.riskCategory] = (counts[a.riskCategory] || 0) + 1; });
    return Object.entries(counts).map(([cat, count]) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1), value: count,
      color: RISK_CATEGORY_COLORS[cat as keyof typeof RISK_CATEGORY_COLORS] || '#888',
    }));
  }, [addresses]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🏷 Risk Categories</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Alert Severity Distribution ── */
export function AlertSeverityBar({ alerts }: { alerts: ForensicsAlert[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1; });
    return Object.entries(counts).map(([sev, count]) => ({
      name: sev.charAt(0).toUpperCase() + sev.slice(1), count,
      color: SEVERITY_COLORS[sev as keyof typeof SEVERITY_COLORS] || '#888',
    }));
  }, [alerts]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🚨 Alert Severity</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Risk Score vs Transaction Count Scatter ── */
export function RiskVsVolumeScatter({ addresses }: { addresses: AddressProfile[] }) {
  const data = addresses.map(a => ({
    name: a.label, risk: a.riskScore, volume: a.totalInflowUsd / 1e6, chain: a.chain,
    color: RISK_CATEGORY_COLORS[a.riskCategory] || '#888',
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📊 Risk Score vs Volume</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="risk" type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} name="Risk Score" />
          <YAxis dataKey="volume" type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toFixed(0)}M`} name="Volume" />
          <ZAxis dataKey="volume" range={[40, 400]} />
          <Tooltip formatter={(value: number, name: string) => [name === 'volume' ? `$${value.toFixed(1)}M` : value, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Scatter data={data} fill="#00C2AE" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Chain Distribution Pie ── */
export function ChainPieChart({ addresses }: { addresses: AddressProfile[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    addresses.forEach(a => { counts[a.chain] = (counts[a.chain] || 0) + 1; });
    return Object.entries(counts).map(([chain, count]) => ({
      name: chain, value: count, color: CHAIN_COLORS[chain as keyof typeof CHAIN_COLORS] || '#888',
    }));
  }, [addresses]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">⛓ Chain Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Alert Timeline Area Chart ── */
export function AlertTimelineChart({ alerts }: { alerts: ForensicsAlert[] }) {
  const data = useMemo(() => {
    const byDay: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    alerts.forEach(a => {
      const day = new Date(a.triggeredAt).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      if (!byDay[day]) byDay[day] = { critical: 0, high: 0, medium: 0, low: 0 };
      if (a.severity === 'critical') byDay[day].critical++;
      else if (a.severity === 'high') byDay[day].high++;
      else if (a.severity === 'medium') byDay[day].medium++;
      else byDay[day].low++;
    });
    return Object.entries(byDay).map(([date, counts]) => ({ date, ...counts }));
  }, [alerts]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📈 Alert Timeline</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Area type="monotone" dataKey="critical" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.3} />
          <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
          <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.3} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Top Risky Addresses Bar ── */
export function TopRiskBar({ addresses }: { addresses: AddressProfile[] }) {
  const data = useMemo(() => {
    return [...addresses].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6).map(a => ({
      name: a.label.length > 15 ? a.label.slice(0, 15) + '...' : a.label, risk: a.riskScore,
      color: a.riskScore >= 80 ? '#dc2626' : a.riskScore >= 50 ? '#f97316' : '#eab308',
    }));
  }, [addresses]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🔴 Top Risky Addresses</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
