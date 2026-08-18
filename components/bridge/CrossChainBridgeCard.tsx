'use client';

import React, { useState } from 'react';
import { CrossChainBridgeRoute } from '../../lib/CryptoBridgeModel';
import { Network, ArrowRight, ShieldCheck, Clock, Send, CheckCircle2, DollarSign, Layers } from 'lucide-react';

interface CardProps {
  route: CrossChainBridgeRoute;
  onBridgeClick: (route: CrossChainBridgeRoute) => void;
}

export const CrossChainBridgeCard: React.FC<CardProps> = ({ route, onBridgeClick }) => {
  const [copied, setCopied] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'congested':
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
        {/* Protocol & Security Badge Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-cyan-50 text-cyan-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-cyan-600" />
              {route.bridgeProtocol}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getStatusBadge(route.status)}`}>
              {route.status}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-cyan-600">{route.bridgeSecurityScore}/100</span>
            <span className="text-xs text-gray-400 font-medium block">Security Audit Score</span>
          </div>
        </div>

        {/* Source -> Target Chain Route */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4 text-xs font-semibold text-gray-800">
          <span className="text-indigo-700 font-bold">{route.sourceChain}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-purple-700 font-bold">{route.targetChain}</span>
        </div>

        {/* Supported Tokens */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">Supported:</span>
          {route.supportedTokens.map((tok) => (
            <span key={tok} className="bg-gray-100 text-gray-800 font-bold text-xs px-2 py-0.5 rounded">
              {tok}
            </span>
          ))}
        </div>

        {/* Liquidity & Transfer Time Metrics */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Bridge TVL Liquidity:</span>
            <span className="font-semibold text-gray-900">${(route.totalBridgeLiquidityUsd / 1000000).toFixed(1)}M USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Est. Transfer Time:</span>
            <span className="font-semibold text-emerald-700">~{route.estimatedTransferTimeMinutes} mins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Gas & Relayer Fee:</span>
            <span className="font-semibold text-indigo-700">${route.gasCostEstimateUsd} ({route.protocolFeePercentage}% fee)</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onBridgeClick(route)}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Network className="w-4 h-4" />
          Execute Cross-Chain Bridge Transfer
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Bridge Route"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Network className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
