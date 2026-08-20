'use client';

import React from 'react';
import { PortfolioRiskMetric } from '../../lib/CryptoPortfolioModel';
import { PieChart, ShieldAlert, TrendingUp, Scale, AlertCircle, ArrowUpRight } from 'lucide-react';

interface CardProps {
  portfolio: PortfolioRiskMetric;
  onSelect: (portfolio: PortfolioRiskMetric) => void;
}

export const PortfolioRiskCardTile: React.FC<CardProps> = ({ portfolio, onSelect }) => {
  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Moderate':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Strategy & Risk */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {portfolio.fundStrategy}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{portfolio.portfolioName}</h3>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getRiskBadge(portfolio.riskRating)}`}>
            {portfolio.riskRating}
          </span>
        </div>

        {/* Financial & Risk Metrics */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Total Portfolio Value:</span>
            <span className="font-extrabold text-gray-900">${(portfolio.totalValueUsd / 1000000).toFixed(2)}M USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Sharpe Ratio / Beta:</span>
            <span className="font-bold text-indigo-600 font-mono">{portfolio.sharpeRatio} SR | {portfolio.betaVsBtc} Beta</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Value at Risk (95% VaR):</span>
            <span className="font-bold text-red-600">{portfolio.valueAtRiskPercent}% 1-Day</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Allocation Drift:</span>
            <span className={`font-bold font-mono ${portfolio.rebalanceDriftPercentage > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {portfolio.rebalanceDriftPercentage}% Drift
            </span>
          </div>
        </div>

        {/* Target vs Current Allocation Progress Bars */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase text-gray-400">Asset Distribution Drift</span>
          <div className="space-y-1">
            {portfolio.assetAllocations.map((alloc, i) => (
              <div key={i} className="text-[11px] space-y-0.5">
                <div className="flex justify-between font-mono">
                  <span className="font-bold text-gray-800">{alloc.asset}</span>
                  <span className="text-gray-500">Current: {alloc.currentPercent}% | Target: {alloc.targetPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${alloc.currentPercent}%` }} className="bg-purple-600 h-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(portfolio)}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Scale className="w-3.5 h-3.5" />
        {portfolio.rebalanceDriftPercentage > 5 ? 'Execute Rebalance Strategy' : 'Inspect Risk Matrix'}
      </button>
    </div>
  );
};
