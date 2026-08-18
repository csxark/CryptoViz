'use client';

import React, { useState } from 'react';
import { RwaAssetToken } from '../../lib/CryptoRwaModel';
import { Building2, ShieldCheck, DollarSign, TrendingUp, CheckCircle2, Coins, FileCheck } from 'lucide-react';

interface CardProps {
  asset: RwaAssetToken;
  onDistributeClick: (asset: RwaAssetToken) => void;
}

export const RwaAssetCard: React.FC<CardProps> = ({ asset, onDistributeClick }) => {
  const [copied, setCopied] = useState(false);

  const getPorBadge = (status: string) => {
    switch (status) {
      case 'verified-on-chain':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending-oracle-audit':
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
        {/* Custodian & Proof-of-Reserve Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-50 text-amber-900 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              {asset.underlyingCustodian}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getPorBadge(asset.proofOfReserveStatus)}`}>
              {asset.proofOfReserveStatus.replace('-', ' ')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">${(asset.tokenizedValuationUsd / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-gray-400 font-medium block">Tokenized TVL</span>
          </div>
        </div>

        {/* Asset Name & Symbol */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1">{asset.assetName}</h3>
        <p className="text-xs text-amber-700 font-semibold mb-3 flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          Ticker: <span className="font-mono font-bold">{asset.tokenSymbol}</span> ({asset.assetCategory})
        </p>

        {/* Yield & Collateral Metrics */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Annualized Yield (APY):</span>
            <span className="font-bold text-emerald-600 text-sm">+{asset.annualizedYieldPercentage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Collateralization Ratio:</span>
            <span className="font-semibold text-indigo-700">{asset.collateralRatioPercentage}% Overcollateralized</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Original Issuance Date:</span>
            <span className="font-semibold text-gray-700">{asset.issuanceDate}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onDistributeClick(asset)}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Distribute Realized Asset Yield
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share RWA Asset Profile"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <FileCheck className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
