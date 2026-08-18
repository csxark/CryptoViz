'use client';

import React, { useState } from 'react';
import { FlashLoanArbitrageOpportunity } from '../../lib/CryptoArbitrageModel';
import { Zap, ShieldAlert, TrendingUp, DollarSign, ArrowRight, CheckCircle2, Clock, Activity } from 'lucide-react';

interface CardProps {
  opportunity: FlashLoanArbitrageOpportunity;
  onExecuteClick: (opp: FlashLoanArbitrageOpportunity) => void;
}

export const ArbitrageOpportunityCard: React.FC<CardProps> = ({ opportunity, onExecuteClick }) => {
  const [copied, setCopied] = useState(false);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between">
      <div>
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
            <span className="text-xs text-gray-400 font-medium block">Net Profit ({opportunity.profitMarginPercentage}%)</span>
          </div>
        </div>

        {/* Source & Target DEX Route */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4 text-xs font-semibold text-gray-800">
          <span className="text-indigo-700">{opportunity.sourceDex}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-700">{opportunity.targetDex}</span>
        </div>

        {/* Financial Highlights */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Flash Loan Required:</span>
            <span className="font-semibold text-gray-900">${opportunity.loanAmountUsd.toLocaleString()} ({opportunity.borrowAsset})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Estimated Gas Fee:</span>
            <span className="font-semibold text-red-600">${opportunity.estimatedGasFeeUsd}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Detected:</span>
            <span className="font-semibold text-gray-700">{opportunity.detectedTimestamp}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onExecuteClick(opportunity)}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          Trigger Flash Loan Arbitrage
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Arbitrage Opportunity"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Activity className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
