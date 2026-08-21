'use client';

import React from 'react';
import { PortfolioRiskOpportunity } from '../../lib/CryptoPortfolioRiskModel';
import { PieChart, ShieldAlert, CheckCircle2, RefreshCw, BarChart2, DollarSign } from 'lucide-react';

interface CardProps {
  opportunity: PortfolioRiskOpportunity;
  onExecuteClick: (opp: PortfolioRiskOpportunity) => void;
}

export const CryptoPortfolioRiskCard: React.FC<CardProps> = ({ opportunity, onExecuteClick }) => {
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Conservative':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Balanced':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Aggressive Growth':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MONITORING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SIMULATING_REBALANCE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'REBALANCED_SUCCESS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'REBALANCE_REVERT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-purple-400" />
            {opportunity.riskCategory}
          </span>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadge(opportunity.status)}`}>
            {opportunity.status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight group-hover:text-purple-400 transition-colors">
              {opportunity.portfolioName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Owner: {opportunity.ownerAddress.substring(0, 8)}...{opportunity.ownerAddress.substring(36)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-purple-400 block tracking-tight">
              ${(opportunity.totalPortfolioValueUsd / 1000).toFixed(0)}k USD
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Sharpe: {opportunity.riskMetrics.sharpeRatio}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-4 text-xs space-y-2">
          <div className="font-bold text-slate-300 mb-1">Asset Allocation & Drift:</div>
          {opportunity.allocations.map((alloc) => (
            <div key={alloc.assetSymbol} className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-semibold">{alloc.assetSymbol}:</span>
              <span className="text-slate-400">
                {alloc.currentWeightPercent}% (Target {alloc.targetWeightPercent}%)
              </span>
              <span className={`font-mono font-bold ${alloc.driftPercent > 0 ? 'text-amber-400' : alloc.driftPercent < 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                {alloc.driftPercent > 0 ? `+${alloc.driftPercent}%` : `${alloc.driftPercent}%`}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-slate-950/40 rounded-2xl p-3.5 mb-5 space-y-2 text-xs border border-slate-800/40">
          <div className="flex justify-between">
            <span className="text-slate-400">Max Drawdown:</span>
            <span className="font-bold text-rose-400">-{opportunity.riskMetrics.maxDrawdownPercent}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Rebalance Threshold:</span>
            <span className="font-bold text-purple-400">{opportunity.rebalanceThresholdPercent}% Drift</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onExecuteClick(opportunity)}
        disabled={opportunity.status === 'REBALANCED_SUCCESS' || opportunity.status === 'REBALANCE_REVERT'}
        className={`w-full font-extrabold text-sm py-3 px-4 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
          opportunity.status === 'REBALANCED_SUCCESS' || opportunity.status === 'REBALANCE_REVERT'
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 shadow-purple-500/20'
        }`}
      >
        <RefreshCw className="w-4 h-4" />
        {opportunity.status === 'REBALANCED_SUCCESS'
          ? 'Rebalance Complete'
          : opportunity.status === 'REBALANCE_REVERT'
          ? 'Rebalance Reverted'
          : 'Simulate Automated Rebalance'}
      </button>
    </div>
  );
};
