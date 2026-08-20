'use client';

import React from 'react';
import { CrossChainBridgeRoute } from '../../lib/CryptoBridgeModel';
import { ArrowRightLeft, ShieldCheck, Zap, Clock, ArrowRight, DollarSign } from 'lucide-react';

interface CardProps {
  route: CrossChainBridgeRoute;
  onSelect: (route: CrossChainBridgeRoute) => void;
}

export const BridgeRouteCardTile: React.FC<CardProps> = ({ route, onSelect }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Protocol & Rating */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {route.bridgeProtocol}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{route.bridgeName}</h3>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Rating: {route.securityRating}
          </span>
        </div>

        {/* Source -> Target Chain Route */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-xs font-semibold text-gray-800">
          <span className="text-indigo-700">{route.sourceChain}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-700">{route.targetChain}</span>
        </div>

        {/* Financial Details */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Pool Liquidity:</span>
            <span className="font-extrabold text-gray-900">${(route.poolLiquidityUsd / 1000000).toFixed(1)}M {route.tokenSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Est. Bridge Gas Fee:</span>
            <span className="font-bold text-emerald-600">${route.estimatedFeeUsd.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Est. Transfer Latency:</span>
            <span className="font-bold text-indigo-600 font-mono">~{route.estimatedLatencyMinutes} Mins</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(route)}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        Select Optimized Bridge Route
      </button>
    </div>
  );
};
