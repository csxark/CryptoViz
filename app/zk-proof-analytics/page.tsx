'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ZkProofServiceHandler } from '../../lib/ZkProofService';
import {
  ZkCircuit,
  ZkProofRecord,
  ZkBenchmarkResult,
  ZkProtocolStats,
  ZkFilterOptions,
} from '../../lib/ZkProofModel';
import {
  ZkCircuitCard,
  ZkProofRecordCard,
  ZkBenchmarkCard,
  ZkProtocolStatsCard,
  ZkOverviewStats,
} from '../../components/zk-proof/ZkProofCard';
import {
  ProofSystemBarChart,
  CategoryPieChart,
  ConstraintsProveTimeScatter,
  ProofSystemRadar,
  ProofSizeBarChart,
} from '../../components/zk-proof/ZkProofTimeline';
import {
  Search,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

type Tab = 'overview' | 'circuits' | 'proofs' | 'benchmarks' | 'protocols';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'circuits', label: 'Circuits', icon: <Zap size={16} /> },
  { id: 'proofs', label: 'Proofs', icon: <ShieldCheck size={16} /> },
  { id: 'benchmarks', label: 'Benchmarks', icon: <BarChart3 size={16} /> },
  { id: 'protocols', label: 'Protocols', icon: <Activity size={16} /> },
];

export default function ZkProofAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [circuits, setCircuits] = useState<ZkCircuit[]>([]);
  const [records, setRecords] = useState<ZkProofRecord[]>([]);
  const [benchmarks, setBenchmarks] = useState<ZkBenchmarkResult[]>([]);
  const [protoStats, setProtoStats] = useState<ZkProtocolStats[]>([]);
  const [stats, setStats] = useState(ZkProofServiceHandler.getTotalStats());

  const [filters, setFilters] = useState<ZkFilterOptions>({
    proofSystem: 'All',
    category: 'All',
    status: 'All',
    verificationLayer: 'All',
    searchQuery: '',
    sortBy: 'constraints',
  });

  const refresh = () => {
    setCircuits(ZkProofServiceHandler.fetchCircuits(filters));
    setRecords(ZkProofServiceHandler.fetchRecords());
    setBenchmarks(ZkProofServiceHandler.fetchBenchmarks());
    setProtoStats(ZkProofServiceHandler.fetchProtocolStats());
    setStats(ZkProofServiceHandler.getTotalStats());
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setCircuits(ZkProofServiceHandler.fetchCircuits(filters));
  }, [filters]);

  const applyFilter = (updated: Partial<ZkFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleSubmitProof = (circuitId: string) => {
    ZkProofServiceHandler.submitProof(circuitId);
    refresh();
  };

  const verifiedCount = records.filter(r => r.status === 'VERIFIED').length;
  const failedCount = records.filter(r => r.status === 'FAILED').length;
  const pendingCount = records.filter(r => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-3">
              <ShieldCheck size={24} className="text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">ZK Proof Analytics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Zero-knowledge proof system analytics • {circuits.length} circuits • {records.length} proofs
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats Overview */}
        <div className="mb-6">
          <ZkOverviewStats stats={stats} />
        </div>

        {/* Proof Status Bar */}
        <div className="mb-6 flex gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 size={14} /> {verifiedCount} Verified
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            <Clock size={14} /> {pendingCount} Pending
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle size={14} /> {failedCount} Failed
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ProofSystemBarChart stats={protoStats} />
              <CategoryPieChart circuits={circuits} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ConstraintsProveTimeScatter circuits={circuits} />
              <ProofSizeBarChart stats={protoStats} />
            </div>
            <ProofSystemRadar stats={protoStats} />

            {/* Recent Proofs */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📋 Recent Proofs</h3>
              <div className="space-y-2">
                {records.slice(0, 5).map(r => (
                  <ZkProofRecordCard key={r.id} record={r} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'circuits' && (
          <div>
            {/* Filters */}
            <div className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search circuits by name, description, or proof system..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  value={filters.searchQuery}
                  onChange={e => applyFilter({ searchQuery: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'proofSystem', label: 'System', options: ['All', 'Groth16', 'PLONK', 'Marlin', 'Bulletproofs', 'FRI (STARK)', 'Halo2', 'Nova'] },
                  { key: 'category', label: 'Category', options: ['All', 'Identity', 'Financial', 'Computation', 'Voting', 'Supply Chain', 'Gaming', 'Privacy'] },
                  { key: 'sortBy', label: 'Sort', options: ['constraints', 'time', 'size', 'name'] },
                ].map(f => (
                  <select
                    key={f.key}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    value={filters[f.key as keyof ZkFilterOptions] as string}
                    onChange={e => applyFilter({ [f.key]: e.target.value })}
                  >
                    {f.options.map(opt => (
                      <option key={opt} value={opt}>{f.label}: {opt}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Circuit Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {circuits.map(circuit => (
                <div key={circuit.id} className="relative">
                  <ZkCircuitCard circuit={circuit} />
                  <button
                    onClick={() => handleSubmitProof(circuit.id)}
                    className="absolute bottom-4 right-4 rounded-lg bg-purple-500 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-purple-600"
                  >
                    <Play size={10} className="mr-1 inline" /> Submit Proof
                  </button>
                </div>
              ))}
            </div>
            {circuits.length === 0 && (
              <div className="py-16 text-center text-zinc-400">No circuits match the current filters.</div>
            )}
          </div>
        )}

        {tab === 'proofs' && (
          <div className="space-y-4">
            {records.map(r => (
              <ZkProofRecordCard key={r.id} record={r} />
            ))}
            {records.length === 0 && (
              <div className="py-16 text-center text-zinc-400">No proof records yet.</div>
            )}
          </div>
        )}

        {tab === 'benchmarks' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benchmarks.map(b => (
              <ZkBenchmarkCard key={b.id} benchmark={b} />
            ))}
          </div>
        )}

        {tab === 'protocols' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {protoStats.map(s => (
              <ZkProtocolStatsCard key={s.proofSystem} stats={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
