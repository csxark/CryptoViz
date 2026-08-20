'use client';

import React from 'react';
import { LiquidityPositionRecord } from '../../lib/CryptoYieldModel';
import { TrendingUp, Coins, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ComponentProps {
  positions: LiquidityPositionRecord[];
}

export const ActivePositionsList: React.FC<ComponentProps> = ({ positions }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Active Liquidity Positions & Yield Rewards</h3>
          <p className="text-sm text-gray-500">Live positions tracking earned rewards and impermanent loss risk</p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-xs">
          {positions.length} Active Positions
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Coins className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No active liquidity positions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => (
            <div
              key={pos.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{pos.poolName}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ${pos.depositAmountUsd.toLocaleString()} Deposit
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Deposited {pos.depositedTimestamp}</span>
                  <span>•</span>
                  <span>Est. IL: {pos.estimatedIlPercentage}%</span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs shrink-0">
                <div className="text-right">
                  <span className="text-gray-400 block font-medium">Earned Yield Rewards</span>
                  <span className="font-extrabold text-emerald-600 text-sm">+${pos.earnedRewardsUsd.toLocaleString()} USD</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <TrendingUp className="w-4 h-4" /> Earning Yield
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
