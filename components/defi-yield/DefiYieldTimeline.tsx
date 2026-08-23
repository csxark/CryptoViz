'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
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
} from 'recharts';
import { YieldPool, YieldHistoryPoint, PROTOCOL_COLORS, RISK_COLORS, ASSET_CATEGORY_COLORS } from '../../lib/DefiYieldModel';

/* ── APY Trend Area Chart ── */
export function ApyTrendChart({ pools }: { pools: YieldPool[] }) {
  const data = useMemo(() => {
    if (pools.length === 0) return [];
    const reference = pools[0].apyHistory;
    return reference.map((point, i) => {
      const entry: Record<string, number | string> = {
        date: new Date(point.timestamp).toLocaleDateString('en', { month: 'short' }),
      };
      pools.slice(0, 4).forEach(pool => {
        const hist = pool.apyHistory[i];
        if (hist) entry[pool.assetSymbol] = hist.apy;
      });
      return entry;
    });
  }, [pools]);

  if (data.length === 0) return <div className="flex h-64 items-center justify-center text-zinc-400">No data</div>;

  const colors = ['#00C2AE', '#627EEA', '#F7931A', '#9333EA'];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📈 APY Trend (12 Months)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          {pools.slice(0, 4).map((pool, i) => (
            <Area
              key={pool.id}
              type="monotone"
              dataKey={pool.assetSymbol}
              stroke={colors[i]}
              fill={colors[i]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Protocol TVL Bar Chart ── */
export function ProtocolTvlChart({ data }: { data: { protocol: string; tvl: number; color: string }[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🏦 Protocol TVL Comparison</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`} />
          <YAxis dataKey="protocol" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={90} />
          <Tooltip
            formatter={(value: number) => [`$${(value / 1e6).toFixed(0)}M`, 'TVL']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
          />
          <Bar dataKey="tvl" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Risk Distribution Pie ── */
export function RiskDistributionPie({ pools }: { pools: YieldPool[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    pools.forEach(p => { counts[p.riskLevel] = (counts[p.riskLevel] || 0) + 1; });
    return Object.entries(counts).map(([level, count]) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
      color: RISK_COLORS[level as keyof typeof RISK_COLORS] || '#888',
    }));
  }, [pools]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">⚠️ Risk Distribution</h3>
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

/* ── Asset Category Pie ── */
export function AssetCategoryPie({ pools }: { pools: YieldPool[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    pools.forEach(p => { counts[p.assetCategory] = (counts[p.assetCategory] || 0) + 1; });
    return Object.entries(counts).map(([cat, count]) => ({
      name: cat,
      value: count,
      color: ASSET_CATEGORY_COLORS[cat as keyof typeof ASSET_CATEGORY_COLORS] || '#888',
    }));
  }, [pools]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🪙 Asset Categories</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
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

/* ── Protocol APY Radar ── */
export function ProtocolApyRadar({ data }: { data: { protocol: string; apy: number; tvl: number }[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🕸 Protocol APY Radar</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(0,0,0,0.05)" />
          <PolarAngleAxis dataKey="protocol" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name="APY %" dataKey="apy" stroke="#00C2AE" fill="#00C2AE" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
