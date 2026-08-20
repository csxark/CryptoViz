'use client';

import React, { useState } from 'react';
import { FlashLoanArbitrageOpportunity } from '../../lib/CryptoArbitrageModel';
import { Zap, ArrowRight, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';

interface CardProps {
  opportunity: FlashLoanArbitrageOpportunity;
  onExecuteClick: (opp: FlashLoanArbitrageOpportunity) => void;
}

export const ArbitrageOpportunityCard: React.FC<CardProps> = ({ opportunity, onExecuteClick }) => {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'extreme':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DETECTED':
        return 'bg-blue-100 text-blue-800';
      case 'SIMULATING':
        return 'bg-amber-100 text-amber-800 animate-pulse';
      case 'SIMULATED_SUCCESS':
        return 'bg-emerald-100 text-emerald-800';
      case 'SIMULATED_REVERT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setShareError(false);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setShareError(true);
        setTimeout(() => setShareError(false), 2000);
      }
    } catch {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between">
      <div>
        {/* Paper Trading Header Banner */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="bg-amber-500/10 text-amber-700 font-bold px-2.5 py-0.5 rounded-md">
            Paper Trading / Simulation
          </span>
          <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${getStatusBadge(opportunity.status)}`}>
            {opportunity.status}
          </span>
        </div>

        {/* Token Pair & Risk Badge Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              {opportunity.tokenPair}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getRiskBadge(opportunity.executionRisk)}`}>
              {opportunity.executionRisk} Risk
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600">+${opportunity.netProfitUsd.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium block">Est. Net Profit ({opportunity.profitMarginPercentage}%)</span>
          </div>
        </div>

        {/* Source & Target DEX Route */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4 text-xs font-semibold text-gray-800">
          <span className="text-indigo-700">{opportunity.sourceDex}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-700">{opportunity.targetDex}</span>
        </div>

        {/* Financial & Simulation Constraints */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Simulated Loan Amount:</span>
            <span className="font-semibold text-gray-900">${opportunity.loanAmountUsd.toLocaleString()} ({opportunity.borrowAsset})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Estimated Gas Fee Limit:</span>
            <span className="font-semibold text-red-600">${opportunity.estimatedGasFeeUsd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Max Slippage Tolerance:</span>
            <span className="font-semibold text-gray-800">{opportunity.maxSlippageTolerancePercentage}%</span>
          </div>
          {opportunity.failureReason && (
            <div className="flex justify-between border-t border-red-100 pt-1.5 text-red-600 font-bold">
              <span>Revert Reason:</span>
              <span>{opportunity.failureReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onExecuteClick(opportunity)}
          disabled={opportunity.status === 'SIMULATED_SUCCESS' || opportunity.status === 'SIMULATED_REVERT'}
          className={`flex-1 font-bold text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            opportunity.status === 'SIMULATED_SUCCESS' || opportunity.status === 'SIMULATED_REVERT'
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow hover:shadow-md'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          {opportunity.status === 'SIMULATED_SUCCESS'
            ? 'Simulation Success'
            : opportunity.status === 'SIMULATED_REVERT'
            ? 'Simulation Reverted'
            : 'Run Paper Trading Simulation'}
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Simulation Opportunity"
          aria-label="Share Simulation Opportunity"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : shareError ? (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          ) : (
            <Activity className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
