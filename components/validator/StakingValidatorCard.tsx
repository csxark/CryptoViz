'use client';

import React, { useState } from 'react';
import { StakingValidatorNode } from '../../lib/CryptoStakingValidatorModel';
import { Server, ShieldCheck, Activity, DollarSign, Send, CheckCircle2, Percent, Cpu, AlertTriangle } from 'lucide-react';

interface CardProps {
  validator: StakingValidatorNode;
  onRewardClick: (validator: StakingValidatorNode) => void;
}

export const StakingValidatorCard: React.FC<CardProps> = ({ validator, onRewardClick }) => {
  const [copied, setCopied] = useState(false);

  const getSlashingBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
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
        {/* Network & Slashing Risk Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              {validator.network}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getSlashingBadge(validator.slashingRiskLevel)}`}>
              {validator.slashingRiskLevel} Slashing Risk
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">${(validator.totalStakedUsd / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-gray-400 font-medium block">Total Staked (USD)</span>
          </div>
        </div>

        {/* Validator Name & Public Key */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1">{validator.validatorName}</h3>
        <p className="text-xs text-gray-500 font-medium mb-3">
          Pubkey: <span className="text-gray-800 font-mono font-semibold">{validator.publicKey}</span>
        </p>

        {/* Performance Metrics Grid */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Uptime Reliability:</span>
            <span className="font-semibold text-emerald-600">{validator.uptimePercentage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Attestation Efficiency:</span>
            <span className="font-semibold text-indigo-700">{validator.attestationEfficiencyPercentage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Validator Commission Rate:</span>
            <span className="font-semibold text-gray-900">{validator.validatorCommissionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onRewardClick(validator)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Cpu className="w-4 h-4" />
          Distribute Epoch Rewards
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Validator Telemetry"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Activity className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
