'use client';

import React, { useState } from 'react';
import { LiquidityPool } from '../../lib/CryptoYieldFarmingModel';
import { Coins, TrendingUp, ShieldAlert, Sparkles, Send, CheckCircle2, Percent, Layers, DollarSign } from 'lucide-react';

interface PoolCardProps {
  pool: LiquidityPool;
  onHarvestClick: (pool: LiquidityPool) => void;
}

export const LiquidityPoolCard: React.FC<PoolCardProps> = ({ pool, onHarvestClick }) => {
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
        {/* Protocol & Risk Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              {pool.protocol}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getRiskBadge(pool.impermanentLossRisk)}`}>
              {pool.impermanentLossRisk} IL Risk
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600">+{pool.apyPercentage}%</span>
            <span className="text-xs text-gray-400 font-medium block">APY (Est.)</span>
          </div>
        </div>

        {/* Pool Title & Tokens */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1">{pool.poolName}</h3>
        <div className="flex items-center gap-1 mb-4">
          {pool.pairSymbols.map((sym) => (
            <span key={sym} className="bg-emerald-50 text-emerald-800 font-bold text-xs px-2 py-0.5 rounded">
              {sym}
            </span>
          ))}
        </div>

        {/* Metrics Grid */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">TVL (Total Value Locked):</span>
            <span className="font-semibold text-gray-900">${(pool.totalValueLockedUsd / 1000000).toFixed(1)}M USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Est. Daily Fee Yield:</span>
            <span className="font-semibold text-emerald-700">${pool.dailyFeeYieldUsd.toLocaleString()} / day</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Staked LP Tokens:</span>
            <span className="font-semibold text-indigo-700">{pool.stakedLpTokens} LP</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onHarvestClick(pool)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Coins className="w-4 h-4" />
          Harvest Yield Rewards
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Pool Analytics"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Coins className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
