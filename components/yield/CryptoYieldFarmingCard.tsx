'use client';

import React from 'react';
import { LiquidityPoolYieldOpportunity } from '../../lib/CryptoYieldFarmingModel';
import { Sprout, ShieldAlert, CheckCircle2, TrendingUp, Layers, RefreshCw } from 'lucide-react';

interface CardProps {
  opportunity: LiquidityPoolYieldOpportunity;
  onExecuteClick: (opp: LiquidityPoolYieldOpportunity) => void;
}

export const CryptoYieldFarmingCard: React.FC<CardProps> = ({ opportunity, onExecuteClick }) => {
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low Risk':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Moderate Risk':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'High Risk':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MONITORING':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'SIMULATING_DEPOSIT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'FARMING_ACTIVE':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'RISK_REVERT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            {opportunity.protocol}
          </span>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadge(opportunity.status)}`}>
            {opportunity.status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">
              {opportunity.poolName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pair: {opportunity.tokenPair} • Reward Token: ${opportunity.rewardTokenSymbol}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400 block tracking-tight">
              {opportunity.netTotalApyPercent}% APY
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              TVL (${(opportunity.totalValueLockedUsd / 1000000).toFixed(1)}M)
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-4 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Impermanent Loss Projection:
            </span>
            <span className="text-amber-400 font-mono font-bold">
              -{opportunity.impermanentLossRisk.estimatedImpermanentLossPercent}% IL
            </span>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>Base APY: {opportunity.baseApyPercent}%</span>
            <span>Reward APY: +{opportunity.rewardTokenApyPercent}%</span>
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-2xl p-3.5 mb-5 space-y-2 text-xs border border-slate-800/40">
          <div className="flex justify-between">
            <span className="text-slate-400">Auto-Compounding:</span>
            <span className="font-bold text-white flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              {opportunity.autoCompoundingFrequency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Yield Risk Profile:</span>
            <span className={`font-extrabold px-2 py-0.5 rounded border text-[10px] ${getRiskBadge(opportunity.riskCategory)}`}>
              {opportunity.riskCategory}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onExecuteClick(opportunity)}
        disabled={opportunity.status === 'FARMING_ACTIVE' || opportunity.status === 'RISK_REVERT'}
        className={`w-full font-extrabold text-sm py-3 px-4 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
          opportunity.status === 'FARMING_ACTIVE' || opportunity.status === 'RISK_REVERT'
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
        }`}
      >
        <Sprout className="w-4 h-4 fill-current" />
        {opportunity.status === 'FARMING_ACTIVE'
          ? 'Yield Active'
          : opportunity.status === 'RISK_REVERT'
          ? 'Execution Reverted'
          : 'Simulate LP Deposit'}
      </button>
    </div>
  );
};
