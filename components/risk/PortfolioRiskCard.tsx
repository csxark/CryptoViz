'use client';

import React, { useState } from 'react';
import { PortfolioRiskMetric } from '../../lib/CryptoPortfolioRiskModel';
import { ShieldAlert, TrendingUp, RefreshCw, DollarSign, Activity, Percent, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';

interface CardProps {
  portfolio: PortfolioRiskMetric;
  onRebalanceClick: (portfolio: PortfolioRiskMetric) => void;
}

export const PortfolioRiskCard: React.FC<CardProps> = ({ portfolio, onRebalanceClick }) => {
  const [copied, setCopied] = useState(false);

  const getRiskBadge = (category: string) => {
    switch (category) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
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
        {/* Header Risk Score & Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Risk Index: {portfolio.riskScore}/100
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getRiskBadge(portfolio.riskCategory)}`}>
              {portfolio.riskCategory}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">${portfolio.totalValueUsd.toLocaleString()}</span>
            <span className="text-xs text-gray-400 font-medium block">Total Value (USD)</span>
          </div>
        </div>

        {/* Portfolio Title */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3">{portfolio.portfolioName}</h3>

        {/* Allocations Breakdown */}
        <div className="space-y-3 mb-5">
          {portfolio.allocations.map((alloc) => {
            const isDrifting = Math.abs(alloc.currentAllocationPercentage - alloc.targetAllocationPercentage) > 5;
            return (
              <div key={alloc.symbol} className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 flex items-center gap-1.5">
                    {alloc.symbol} <span className="text-gray-400 font-normal">({alloc.name})</span>
                  </span>
                  <span className="font-extrabold text-gray-900">${alloc.holdingsValueUsd.toLocaleString()}</span>
                </div>

                {/* Progress Allocation Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${alloc.currentAllocationPercentage}%` }}
                    title={`Current: ${alloc.currentAllocationPercentage}%`}
                  />
                </div>

                <div className="flex justify-between items-center text-gray-500 pt-0.5">
                  <span>Target: <strong className="text-gray-700">{alloc.targetAllocationPercentage}%</strong> (Curr: <strong className={isDrifting ? 'text-amber-600' : 'text-emerald-600'}>{alloc.currentAllocationPercentage}%</strong>)</span>
                  <span className="flex items-center gap-1">
                    Sharpe: <strong className="text-gray-700">{alloc.sharpeRatio}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onRebalanceClick(portfolio)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Rebalance Target Allocations
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Risk Metrics"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Activity className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
