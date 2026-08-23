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
  LineChart,
  Line,
} from 'recharts';
import { MpcSigningSession, MpcKeyGenerationSession, MpcProtocolStats, PROTOCOL_COLORS, NETWORK_COLORS, STATUS_COLORS } from '../../lib/MpcModel';

function formatTime(ms: number): string {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

/* ── Signing Time by Protocol ── */
export function SigningTimeChart({ sessions }: { sessions: MpcSigningSession[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number[]>();
    sessions.forEach(s => {
      if (s.totalSigningTimeMs) {
        const existing = map.get(s.protocol) || [];
        existing.push(s.totalSigningTimeMs);
        map.set(s.protocol, existing);
      }
    });
    return Array.from(map.entries()).map(([protocol, times]) => ({
      name: protocol.replace(' Secret Sharing', ''),
      avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      color: PROTOCOL_COLORS[protocol as keyof typeof PROTOCOL_COLORS] || '#888',
    }));
  }, [sessions]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">⏱ Signing Time by Protocol</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatTime(v)} />
          <Tooltip formatter={(value: number) => [formatTime(value), 'Avg Time']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="avgTime" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Network Distribution Pie ── */
export function NetworkPieChart({ sessions }: { sessions: MpcSigningSession[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => { counts[s.network] = (counts[s.network] || 0) + 1; });
    return Object.entries(counts).map(([net, count]) => ({
      name: net, value: count, color: NETWORK_COLORS[net as keyof typeof NETWORK_COLORS] || '#888',
    }));
  }, [sessions]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🌐 Network Distribution</h3>
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

/* ── Status Distribution Pie ── */
export function StatusPieChart({ sessions }: { sessions: MpcSigningSession[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: status, value: count, color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#888',
    }));
  }, [sessions]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📊 Session Status</h3>
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

/* ── Communication Cost Line ── */
export function CommCostLineChart({ sessions }: { sessions: MpcSigningSession[] }) {
  const data = useMemo(() => {
    return sessions
      .filter(s => s.totalSigningTimeMs)
      .sort((a, b) => new Date(a.initiatedAt).getTime() - new Date(b.initiatedAt).getTime())
      .map(s => ({
        name: s.sessionName.slice(0, 15),
        cost: s.communicationCostKb,
        time: Math.round(s.totalSigningTimeMs! / 1000),
      }));
  }, [sessions]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📡 Communication Cost vs Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'KB', position: 'insideTopLeft', fontSize: 10, fill: '#94a3b8' }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Seconds', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#FF6B6B" strokeWidth={2} name="Cost (KB)" dot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="time" stroke="#4ECDC4" strokeWidth={2} name="Time (s)" dot={{ r: 4 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Protocol Radar ── */
export function ProtocolRadar({ stats }: { stats: MpcProtocolStats[] }) {
  const radarData = stats.map(s => ({
    system: s.protocol,
    speed: Math.max(0, 100 - s.avgSigningTimeMs / 100),
    reliability: s.totalSessions > 0 ? (s.completedCount / s.totalSessions) * 100 : 50,
    efficiency: Math.max(0, 100 - s.avgCommunicationCostKb / 5),
    scalability: Math.min(100, s.totalPartiesServed * 10),
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🕸 Protocol Comparison</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(0,0,0,0.05)" />
          <PolarAngleAxis dataKey="system" tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <PolarRadiusAxis tick={{ fontSize: 8, fill: '#94a3b8' }} />
          <Radar name="Speed" dataKey="speed" stroke="#00C2AE" fill="#00C2AE" fillOpacity={0.15} />
          <Radar name="Reliability" dataKey="reliability" stroke="#627EEA" fill="#627EEA" fillOpacity={0.15} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Threshold Distribution Bar ── */
export function ThresholdBarChart({ sessions }: { sessions: MpcSigningSession[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      const key = `T-${s.threshold}/${s.totalParties}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([key, count]) => ({ name: key, count }));
  }, [sessions]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🔑 Threshold Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Bar dataKey="count" fill="#00C2AE" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
