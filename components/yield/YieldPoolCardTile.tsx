'use client';

import React from 'react';
import { YieldFarmingPool } from '../../lib/CryptoYieldModel';
import { Coins, TrendingUp, AlertTriangle, ShieldCheck, Flame, Percent } from 'lucide-react';

interface CardProps {
  pool: YieldFarmingPool;
  onSelect: (pool: YieldFarmingPool) => void;
}

export const YieldPoolCardTile: React.FC<CardProps> = ({ pool, onSelect }) => {
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
        {/* Protocol & Risk */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {pool.dexProtocol}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{pool.poolName}</h3>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600">{pool.totalApyPercentage.toFixed(1)}%</span>
            <span className="text-xs text-gray-400 font-medium block">Total Net APY</span>
          </div>
        </div>

        {/* Financial Details */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Pool Liquidity (TVL):</span>
            <span className="font-extrabold text-gray-900">${(pool.tvlUsd / 1000000).toFixed(1)}M USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Base Trading Fee Yield:</span>
            <span className="font-bold text-emerald-600">+{pool.baseApyPercentage}% APY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Reward Token APR:</span>
            <span className="font-bold text-purple-600 font-mono">+{pool.rewardTokenApyPercentage}% APR</span>
          </div>
        </div>

        {/* Impermanent Loss Risk Badge */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-gray-400 font-medium">IL Risk Profile:</span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold border uppercase text-[11px] ${getRiskBadge(pool.impermanentLossRisk)}`}>
            {pool.impermanentLossRisk} IL Risk
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(pool)}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Coins className="w-3.5 h-3.5" />
        Deposit Liquidity Position
      </button>
    </div>
  );
};
