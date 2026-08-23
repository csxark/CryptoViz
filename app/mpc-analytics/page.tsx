'use client';

import React, { useState, useEffect } from 'react';
import { MpcServiceHandler } from '../../lib/MpcService';
import { MpcSigningSession, MpcFilterOptions } from '../../lib/MpcModel';
import {
  MpcSigningCard,
  MpcKeygenCard,
  MpcProtocolStatsCard,
  MpcAuditRow,
  MpcOverviewStats,
} from '../../components/mpc/MpcCard';
import {
  SigningTimeChart,
  NetworkPieChart,
  StatusPieChart,
  CommCostLineChart,
  ProtocolRadar,
  ThresholdBarChart,
} from '../../components/mpc/MpcTimeline';
import { Search, Shield, Key, Activity, BarChart3, Play, FileText } from 'lucide-react';

type Tab = 'overview' | 'signing' | 'keygen' | 'protocols' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'signing', label: 'Signing Sessions', icon: <Shield size={16} /> },
  { id: 'keygen', label: 'Key Generation', icon: <Key size={16} /> },
  { id: 'protocols', label: 'Protocols', icon: <BarChart3 size={16} /> },
  { id: 'history', label: 'History', icon: <FileText size={16} /> },
];

export default function MpcAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [sessions, setSessions] = useState<MpcSigningSession[]>([]);
  const [keygenSessions, setKeygenSessions] = useState<ReturnType<typeof MpcServiceHandler.fetchKeygenSessions>>([]);
  const [records, setRecords] = useState<ReturnType<typeof MpcServiceHandler.fetchAuditRecords>>([]);
  const [protoStats, setProtoStats] = useState<ReturnType<typeof MpcServiceHandler.fetchProtocolStats>>([]);
  const [stats, setStats] = useState(MpcServiceHandler.getTotalStats());

  const [filters, setFilters] = useState<MpcFilterOptions>({
    protocol: 'All', useCase: 'All', network: 'All', status: 'All', searchQuery: '', sortBy: 'time',
  });

  const refresh = () => {
    setSessions(MpcServiceHandler.fetchSigningSessions(filters));
    setKeygenSessions(MpcServiceHandler.fetchKeygenSessions());
    setRecords(MpcServiceHandler.fetchAuditRecords());
    setProtoStats(MpcServiceHandler.fetchProtocolStats());
    setStats(MpcServiceHandler.getTotalStats());
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setSessions(MpcServiceHandler.fetchSigningSessions(filters)); }, [filters]);

  const applyFilter = (updated: Partial<MpcFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleSubmitSign = (sessionId: string) => {
    MpcServiceHandler.submitSigning(sessionId);
    refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-3">
              <Shield size={24} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">MPC Analytics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Multi-Party Computation dashboard • {sessions.length} signing sessions • {keygenSessions.length} keygen sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6"><MpcOverviewStats stats={stats} /></div>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}>{t.icon}{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <SigningTimeChart sessions={sessions} />
              <NetworkPieChart sessions={sessions} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusPieChart sessions={sessions} />
              <CommCostLineChart sessions={sessions} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ProtocolRadar stats={protoStats} />
              <ThresholdBarChart sessions={sessions} />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📋 Recent Activity</h3>
              <div className="space-y-2">{records.slice(0, 5).map(r => <MpcAuditRow key={r.id} record={r} />)}</div>
            </div>
          </div>
        )}

        {tab === 'signing' && (
          <div>
            <div className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Search signing sessions..." className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  value={filters.searchQuery} onChange={e => applyFilter({ searchQuery: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'protocol', options: ['All', 'GG20', 'CGGMP21', 'FROST', 'Shamir Secret Sharing', 'SPDZ', 'Sharemind', 'ABY3'] },
                  { key: 'network', options: ['All', 'Ethereum', 'Bitcoin', 'Solana', 'Cosmos', 'Multi-chain'] },
                  { key: 'status', options: ['All', 'ACTIVE', 'COMPLETED', 'SIGNING', 'FAILED'] },
                  { key: 'sortBy', options: ['time', 'parties', 'cost', 'name'] },
                ].map(f => (
                  <select key={f.key} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    value={filters[f.key as keyof MpcFilterOptions] as string}
                    onChange={e => applyFilter({ [f.key]: e.target.value })}>
                    {f.options.map(opt => <option key={opt} value={opt}>{f.key}: {opt}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map(s => (
                <div key={s.id} className="relative">
                  <MpcSigningCard session={s} />
                  {(s.status === 'ACTIVE' || s.status === 'SIGNING') && (
                    <button onClick={() => handleSubmitSign(s.id)} className="absolute bottom-4 right-4 rounded-lg bg-blue-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-600">
                      <Play size={10} className="mr-1 inline" /> Sign
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'keygen' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {keygenSessions.map(s => <MpcKeygenCard key={s.id} session={s} />)}
          </div>
        )}

        {tab === 'protocols' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {protoStats.map(s => <MpcProtocolStatsCard key={s.protocol} stats={s} />)}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {records.map(r => <MpcAuditRow key={r.id} record={r} />)}
            {records.length === 0 && <div className="py-16 text-center text-zinc-400">No audit records yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
