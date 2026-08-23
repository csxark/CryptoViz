'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DefiYieldServiceHandler } from '../../lib/DefiYieldService';
import {
  YieldPool,
  YieldFarmingPosition,
  YieldAuditRecord,
  YieldFilterOptions,
} from '../../lib/DefiYieldModel';
import {
  YieldPoolCard,
  YieldPositionCard,
  ProtocolStatsCard,
  YieldAuditRow,
  YieldOverviewStats,
} from '../../components/defi-yield/DefiYieldCard';
import {
  ApyTrendChart,
  ProtocolTvlChart,
  RiskDistributionPie,
  AssetCategoryPie,
  ProtocolApyRadar,
} from '../../components/defi-yield/DefiYieldTimeline';
import {
  Search,
  Filter,
  PlusCircle,
  Activity,
  TrendingUp,
  Wallet,
  History,
  X,
} from 'lucide-react';

type Tab = 'overview' | 'pools' | 'positions' | 'protocols' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'pools', label: 'Yield Pools', icon: <TrendingUp size={16} /> },
  { id: 'positions', label: 'My Positions', icon: <Wallet size={16} /> },
  { id: 'protocols', label: 'Protocols', icon: <Filter size={16} /> },
  { id: 'history', label: 'History', icon: <History size={16} /> },
];

export default function DefiYieldAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [pools, setPools] = useState<YieldPool[]>([]);
  const [positions, setPositions] = useState<YieldFarmingPosition[]>([]);
  const [records, setRecords] = useState<YieldAuditRecord[]>([]);
  const [stats, setStats] = useState(DefiYieldServiceHandler.getTotalStats());
  const [protoStats, setProtoStats] = useState(DefiYieldServiceHandler.fetchProtocolStats());

  const [filters, setFilters] = useState<YieldFilterOptions>({
    protocol: 'All',
    assetCategory: 'All',
    riskLevel: 'All',
    chain: 'All',
    searchQuery: '',
    sortBy: 'apy',
  });

  const [selectedPool, setSelectedPool] = useState<YieldPool | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const refresh = () => {
    setPools(DefiYieldServiceHandler.fetchPools(filters));
    setPositions(DefiYieldServiceHandler.fetchPositions());
    setRecords(DefiYieldServiceHandler.fetchAuditRecords());
    setStats(DefiYieldServiceHandler.getTotalStats());
    setProtoStats(DefiYieldServiceHandler.fetchProtocolStats());
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setPools(DefiYieldServiceHandler.fetchPools(filters));
  }, [filters]);

  const applyFilter = (updated: Partial<YieldFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleDeposit = () => {
    if (!selectedPool || !depositAmount) return;
    DefiYieldServiceHandler.depositToPool(selectedPool.id, parseFloat(depositAmount));
    setShowDepositModal(false);
    setDepositAmount('');
    setSelectedPool(null);
    refresh();
  };

  const handleHarvest = (posId: string) => {
    DefiYieldServiceHandler.harvestYield(posId);
    refresh();
  };

  const handleWithdraw = (posId: string) => {
    DefiYieldServiceHandler.withdrawFromPool(posId);
    refresh();
  };

  const protocolChartData = useMemo(() =>
    protoStats.map(s => ({ protocol: s.protocol, tvl: s.totalTvlUsd, color: s.color })),
  [protoStats]);

  const protocolRadarData = useMemo(() =>
    protoStats.map(s => ({ protocol: s.protocol.replace(' V3', '').replace(' Protocol', ''), apy: s.avgApy, tvl: s.totalTvlUsd / 1e6 })),
  [protoStats]);

  const activePositions = positions.filter(p => p.status === 'active');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3">
              <TrendingUp size={24} className="text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">DeFi Yield Analytics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Yield farming dashboard • {pools.length} pools • {activePositions.length} active positions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats Overview */}
        <div className="mb-6">
          <YieldOverviewStats stats={stats} />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-teal-500 text-white shadow-sm'
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
              <ApyTrendChart pools={pools.slice(0, 3)} />
              <ProtocolTvlChart data={protocolChartData} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskDistributionPie pools={pools} />
              <AssetCategoryPie pools={pools} />
            </div>
            <ProtocolApyRadar data={protocolRadarData} />

            {/* Recent Activity */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">📋 Recent Activity</h3>
              <div className="space-y-2">
                {records.slice(0, 5).map(r => (
                  <YieldAuditRow key={r.id} record={r} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'pools' && (
          <div>
            {/* Filters */}
            <div className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search pools by name, asset, or protocol..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  value={filters.searchQuery}
                  onChange={e => applyFilter({ searchQuery: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'protocol', label: 'Protocol', options: ['All', 'Aave V3', 'Compound V3', 'Uniswap V3', 'Curve', 'Convex', 'Lido', 'Rocket Pool', 'Pendle'] },
                  { key: 'assetCategory', label: 'Asset', options: ['All', 'Stablecoin', 'ETH Derivative', 'BTC Derivative', 'Blue-chip Token', 'LP Token', 'Synthetic'] },
                  { key: 'riskLevel', label: 'Risk', options: ['All', 'low', 'moderate', 'high', 'extreme'] },
                  { key: 'chain', label: 'Chain', options: ['All', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'BSC'] },
                  { key: 'sortBy', label: 'Sort', options: ['apy', 'tvl', 'risk', 'name'] },
                ].map(f => (
                  <select
                    key={f.key}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    value={filters[f.key as keyof YieldFilterOptions] as string}
                    onChange={e => applyFilter({ [f.key]: e.target.value })}
                  >
                    {f.options.map(opt => (
                      <option key={opt} value={opt}>
                        {f.label}: {opt}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Pool Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pools.map(pool => (
                <YieldPoolCard
                  key={pool.id}
                  pool={pool}
                  onSelect={p => {
                    setSelectedPool(p);
                    setShowDepositModal(true);
                  }}
                />
              ))}
            </div>
            {pools.length === 0 && (
              <div className="py-16 text-center text-zinc-400">No pools match the current filters.</div>
            )}
          </div>
        )}

        {tab === 'positions' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activePositions.map(pos => (
                <YieldPositionCard
                  key={pos.id}
                  position={pos}
                  onHarvest={handleHarvest}
                  onWithdraw={handleWithdraw}
                />
              ))}
            </div>
            {activePositions.length === 0 && (
              <div className="py-16 text-center text-zinc-400">No active positions. Deposit into a pool to get started!</div>
            )}
          </div>
        )}

        {tab === 'protocols' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {protoStats.map(s => (
              <ProtocolStatsCard key={s.protocol} stats={s} />
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {records.map(r => (
              <YieldAuditRow key={r.id} record={r} />
            ))}
            {records.length === 0 && (
              <div className="py-16 text-center text-zinc-400">No audit records yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && selectedPool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDepositModal(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Deposit into {selectedPool.poolName}
              </h3>
              <button onClick={() => setShowDepositModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Protocol</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{selectedPool.protocol}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Current APY</span>
                <span className="font-medium text-teal-500">{selectedPool.apyPercent.toFixed(2)}%</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-zinc-500">TVL</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  ${(selectedPool.tvlUsd / 1e6).toFixed(0)}M
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Deposit Amount (USD)</label>
              <input
                type="number"
                placeholder="e.g. 10000"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
              />
            </div>

            <div className="mb-4 flex items-center gap-2 text-[11px] text-zinc-400">
              <span>⚠️</span>
              <span>This is a simulated deposit. No real funds are moved.</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="flex-1 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
              >
                <PlusCircle size={14} className="mr-1 inline" />
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
