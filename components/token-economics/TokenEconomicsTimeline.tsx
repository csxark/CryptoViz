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
  Treemap,
  ComposedChart,
  Area,
  Line,
} from 'recharts';
import { TokenProfile, VestingSchedule, TokenHolder, VESTING_COLORS, TOKEN_TYPE_COLORS } from '../../lib/TokenEconomicsModel';

/* ── Market Cap Treemap ── */
export function MarketCapTreemap({ tokens }: { tokens: TokenProfile[] }) {
  const data = tokens.map(t => ({
    name: t.symbol, size: t.marketCap, color: t.color,
    fullName: t.name, mcap: t.marketCap,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🗺 Market Cap Treemap</h3>
      <ResponsiveContainer width="100%" height={240}>
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          content={({ x, y, width, height, name, color }) => (
            <g>
              <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.7} stroke="#fff" strokeWidth={2} rx={4} />
              {width > 50 && height > 30 && (
                <>
                  <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">{name}</text>
                  <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={9} opacity={0.8}>
                    ${(data.find(d => d.name === name)?.mcap || 0) / 1e9 > 1 ? `$${((data.find(d => d.name === name)?.mcap || 0) / 1e9).toFixed(0)}B` : `$${((data.find(d => d.name === name)?.mcap || 0) / 1e6).toFixed(0)}M`}
                  </text>
                </>
              )}
            </g>
          )}
        />
      </ResponsiveContainer>
    </div>
  );
}

/* ── Token Type Distribution ── */
export function TokenTypePie({ tokens }: { tokens: TokenProfile[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach(t => { counts[t.type] = (counts[t.type] || 0) + t.marketCap; });
    return Object.entries(counts).map(([type, mcap]) => ({
      name: type, value: mcap, color: TOKEN_TYPE_COLORS[type as keyof typeof TOKEN_TYPE_COLORS] || '#888',
    }));
  }, [tokens]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🏷 Token Type Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value: number) => [`$${(value / 1e9).toFixed(1)}B`, 'Market Cap']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Vesting Allocation Bar ── */
export function VestingAllocationBar({ vesting }: { vesting: VestingSchedule[] }) {
  const data = useMemo(() => {
    return vesting.map(v => ({
      name: `${v.category} (${v.tokenSymbol})`,
      unlocked: v.unlockedPercent,
      locked: 100 - v.unlockedPercent,
      color: VESTING_COLORS[v.category],
    }));
  }, [vesting]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🔓 Vesting Progress</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} unit="%" />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={120} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="unlocked" stackId="a" fill="#22c55e" name="Unlocked" radius={[0, 0, 0, 0]} />
          <Bar dataKey="locked" stackId="a" fill="#e5e7eb" name="Locked" radius={[0, 4, 4, 0]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Holder Distribution Bar ── */
export function HolderDistributionBar({ holders }: { holders: TokenHolder[] }) {
  const typeColors: Record<string, string> = { whale: '#FF6B6B', exchange: '#627EEA', contract: '#22c55e', team: '#9333EA', retail: '#94a3b8' };

  const data = useMemo(() => {
    const grouped: Record<string, number> = {};
    holders.forEach(h => { grouped[h.type] = (grouped[h.type] || 0) + h.balanceUsd; });
    return Object.entries(grouped).map(([type, usd]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1), value: usd / 1e9, color: typeColors[type] || '#888',
    }));
  }, [holders]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🐋 Holder Type Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toFixed(0)}B`} />
          <Tooltip formatter={(value: number) => [`$${value.toFixed(1)}B`, 'Balance']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Price vs MCap Composed ── */
export function PriceVsMcapChart({ tokens }: { tokens: TokenProfile[] }) {
  const data = tokens.map(t => ({
    name: t.symbol, price: t.currentPrice, mcap: t.marketCap / 1e9,
    change: t.priceChange24h,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📈 Price vs Market Cap</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v.toFixed(0)}B`} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar yAxisId="right" dataKey="mcap" fill="#627EEA" fillOpacity={0.3} name="MCap ($B)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="price" stroke="#00C2AE" strokeWidth={2} name="Price ($)" dot={{ r: 5 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
