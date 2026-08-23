'use client';

import React, { useState, useEffect } from 'react';
import { ForensicsServiceHandler } from '../../lib/ForensicsService';
import { AddressProfile, ForensicsFilterOptions } from '../../lib/ForensicsModel';
import {
  AddressCard,
  TransactionCard,
  AlertCard,
  InvestigationCard,
  ForensicsOverviewStats,
} from '../../components/forensics/ForensicsCard';
import {
  RiskCategoryPie,
  AlertSeverityBar,
  RiskVsVolumeScatter,
  ChainPieChart,
  AlertTimelineChart,
  TopRiskBar,
} from '../../components/forensics/ForensicsTimeline';
import { Search, ShieldAlert, Activity, FileText, Eye, AlertTriangle } from 'lucide-react';

type Tab = 'overview' | 'addresses' | 'transactions' | 'alerts' | 'investigations';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
  { id: 'addresses', label: 'Addresses', icon: <Eye size={16} /> },
  { id: 'transactions', label: 'Transactions', icon: <Activity size={16} /> },
  { id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={16} /> },
  { id: 'investigations', label: 'Investigations', icon: <FileText size={16} /> },
];

export default function BlockchainForensicsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [addresses, setAddresses] = useState<AddressProfile[]>([]);
  const [transactions, setTransactions] = useState<ReturnType<typeof ForensicsServiceHandler.fetchTransactions>>([]);
  const [alerts, setAlerts] = useState<ReturnType<typeof ForensicsServiceHandler.fetchAlerts>>([]);
  const [investigations, setInvestigations] = useState<ReturnType<typeof ForensicsServiceHandler.fetchInvestigations>>([]);
  const [stats, setStats] = useState(ForensicsServiceHandler.getTotalStats());

  const [filters, setFilters] = useState<ForensicsFilterOptions>({
    chain: 'All', riskCategory: 'All', severity: 'All', status: 'All', searchQuery: '', sortBy: 'risk',
  });

  const refresh = () => {
    setAddresses(ForensicsServiceHandler.fetchAddresses(filters));
    setTransactions(ForensicsServiceHandler.fetchTransactions());
    setAlerts(ForensicsServiceHandler.fetchAlerts());
    setInvestigations(ForensicsServiceHandler.fetchInvestigations());
    setStats(ForensicsServiceHandler.getTotalStats());
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { setAddresses(ForensicsServiceHandler.fetchAddresses(filters)); }, [filters]);

  const applyFilter = (updated: Partial<ForensicsFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3">
              <ShieldAlert size={24} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Blockchain Forensics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Transaction tracing & risk analysis • {addresses.length} addresses • {alerts.length} alerts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6"><ForensicsOverviewStats stats={stats} /></div>

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-red-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}>{t.icon}{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskCategoryPie addresses={addresses} />
              <AlertSeverityBar alerts={alerts} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskVsVolumeScatter addresses={addresses} />
              <ChainPieChart addresses={addresses} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <AlertTimelineChart alerts={alerts} />
              <TopRiskBar addresses={addresses} />
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">🚨 Active Alerts</h3>
              <div className="space-y-2">
                {alerts.filter(a => a.status === 'active').slice(0, 3).map(a => (
                  <AlertCard key={a.id} alert={a} onAcknowledge={(id) => { ForensicsServiceHandler.acknowledgeAlert(id, 'analyst'); refresh(); }} onResolve={(id) => { ForensicsServiceHandler.resolveAlert(id); refresh(); }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'addresses' && (
          <div>
            <div className="mb-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="text" placeholder="Search addresses by label, address, or tags..." className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  value={filters.searchQuery} onChange={e => applyFilter({ searchQuery: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'chain', options: ['All', 'Ethereum', 'Bitcoin', 'BSC', 'Polygon', 'Arbitrum', 'Solana'] },
                  { key: 'riskCategory', options: ['All', 'exchange', 'mixer', 'darknet', 'scam', 'ransomware', 'sanctioned', 'unknown', 'defi', 'nft', 'miner'] },
                  { key: 'sortBy', options: ['risk', 'value', 'time', 'name'] },
                ].map(f => (
                  <select key={f.key} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    value={filters[f.key as keyof ForensicsFilterOptions] as string}
                    onChange={e => applyFilter({ [f.key]: e.target.value })}>
                    {f.options.map(opt => <option key={opt} value={opt}>{f.key}: {opt}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {addresses.map(a => <AddressCard key={a.id} address={a} />)}
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="space-y-4">
            {transactions.map(tx => <TransactionCard key={tx.id} tx={tx} />)}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="space-y-4">
            {alerts.map(a => (
              <AlertCard key={a.id} alert={a}
                onAcknowledge={(id) => { ForensicsServiceHandler.acknowledgeAlert(id, 'analyst'); refresh(); }}
                onResolve={(id) => { ForensicsServiceHandler.resolveAlert(id); refresh(); }} />
            ))}
          </div>
        )}

        {tab === 'investigations' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {investigations.map(inv => <InvestigationCard key={inv.id} investigation={inv} />)}
          </div>
        )}
      </div>
    </div>
  );
}
