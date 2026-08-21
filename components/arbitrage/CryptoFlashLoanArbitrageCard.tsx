'use client';

import React, { useState } from 'react';
import { FlashLoanArbitrageSurveillanceOpportunity } from '../../lib/CryptoFlashLoanArbitrageModel';
import { Zap, ArrowRight, ShieldAlert, CheckCircle2, Activity, Layers, CornerDownRight } from 'lucide-react';

interface CardProps {
  opportunity: FlashLoanArbitrageSurveillanceOpportunity;
  onExecuteClick: (opp: FlashLoanArbitrageSurveillanceOpportunity) => void;
}

export const CryptoFlashLoanArbitrageCard: React.FC<CardProps> = ({ opportunity, onExecuteClick }) => {
  const [copied, setCopied] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'moderate':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'extreme':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MONITORING':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SIMULATING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
      case 'EXECUTED_SUCCESS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'EXECUTED_REVERT':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {opportunity.flashLoanProtocol}
          </span>
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadge(opportunity.status)}`}>
            {opportunity.status}
          </span>
        </div>

        {/* Pair & Net Profit Display */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">
              {opportunity.tokenPair}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detected {opportunity.detectedTimestamp} • Liquidity ${opportunity.availableLiquidityUsd.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400 block tracking-tight">
              +${opportunity.netProfitUsd.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Est. Net Margin ({opportunity.profitMarginPercentage}%)
            </span>
          </div>
        </div>

        {/* DEX Execution Route Preview */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 mb-4 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold mb-2">
            <span className="text-cyan-400">{opportunity.sourceDex}</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-purple-400">{opportunity.targetDex}</span>
          </div>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-amber-300 transition-colors pt-1.5 border-t border-slate-800/60"
          >
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {opportunity.routes.length}-Hop Smart Route Details
            </span>
            <span>{showRoutes ? 'Hide' : 'Expand Details'}</span>
          </button>

          {showRoutes && (
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
              {opportunity.routes.map((leg) => (
                <div key={leg.step} className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-xl">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <CornerDownRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Leg {leg.step}: {leg.dexName} ({leg.poolPair})
                  </span>
                  <span className="text-slate-400">
                    Fee {leg.feeTierPercent}% | Slip {leg.expectedSlippagePercent}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Metrics Summary Grid */}
        <div className="bg-slate-950/40 rounded-2xl p-3.5 mb-5 space-y-2 text-xs border border-slate-800/40">
          <div className="flex justify-between">
            <span className="text-slate-400">Flash Borrow Amount:</span>
            <span className="font-bold text-white">
              ${opportunity.borrowAmountUsd.toLocaleString()} ({opportunity.borrowAsset})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Est. Gas & Flash Fees:</span>
            <span className="font-semibold text-rose-400">
              ${opportunity.estimatedGasFeeUsd} (Gas) + ${opportunity.estimatedFlashFeeUsd} (Flash)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Execution Risk Profile:</span>
            <span className={`font-extrabold uppercase px-2 py-0.5 rounded border text-[10px] ${getRiskBadge(opportunity.executionRisk)}`}>
              {opportunity.executionRisk}
            </span>
          </div>
          {opportunity.failureReason && (
            <div className="flex justify-between border-t border-rose-500/20 pt-2 text-rose-400 font-bold">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Revert Reason:
              </span>
              <span>{opportunity.failureReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action CTA Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onExecuteClick(opportunity)}
          disabled={opportunity.status === 'EXECUTED_SUCCESS' || opportunity.status === 'EXECUTED_REVERT'}
          className={`flex-1 font-extrabold text-sm py-3 px-4 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            opportunity.status === 'EXECUTED_SUCCESS' || opportunity.status === 'EXECUTED_REVERT'
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/30'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          {opportunity.status === 'EXECUTED_SUCCESS'
            ? 'Execution Verified'
            : opportunity.status === 'EXECUTED_REVERT'
            ? 'Execution Reverted'
            : 'Simulate & Execute Flash Loan'}
        </button>
        <button
          onClick={handleShare}
          className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Share Opportunity"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Activity className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
