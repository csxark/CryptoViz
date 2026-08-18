'use client';

import React, { useState } from 'react';
import { CustodyVault } from '../../lib/CryptoCustodyModel';
import { Lock, ShieldCheck, Key, Clock, Send, CheckCircle2, DollarSign, Building } from 'lucide-react';

interface CardProps {
  vault: CustodyVault;
  onWithdrawClick: (vault: CustodyVault) => void;
}

export const InstitutionalCustodyVaultCard: React.FC<CardProps> = ({ vault, onWithdrawClick }) => {
  const [copied, setCopied] = useState(false);

  const getAmlBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending-reverification':
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
        {/* Custodian & AML Compliance Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-700" />
              {vault.custodianProvider}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase ${getAmlBadge(vault.amlComplianceStatus)}`}>
              AML {vault.amlComplianceStatus}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">${(vault.totalBalanceUsd / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-gray-400 font-medium block">Total Balance (USD)</span>
          </div>
        </div>

        {/* Vault Name & Signatory Threshold */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1">{vault.vaultName}</h3>
        <p className="text-xs text-indigo-600 font-semibold mb-3 flex items-center gap-1">
          <Key className="w-3.5 h-3.5 text-indigo-500" />
          {vault.signatoryThreshold} Scheme
        </p>

        {/* Primary Assets */}
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium mr-1">Assets:</span>
          {vault.primaryAssets.map((ast) => (
            <span key={ast} className="bg-gray-100 text-gray-800 font-bold text-xs px-2 py-0.5 rounded">
              {ast}
            </span>
          ))}
        </div>

        {/* Vault Policy Parameters */}
        <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Vault Storage Type:</span>
            <span className="font-semibold text-gray-900">{vault.vaultAssetType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Policy Timelock Delay:</span>
            <span className="font-semibold text-amber-700">{vault.timelockDelayHours} hours delay</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-medium">Last Security Audit:</span>
            <span className="font-semibold text-gray-700">{vault.lastAuditedDate}</span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onWithdrawClick(vault)}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          Request MPC Signatory Withdrawal
        </button>
        <button
          onClick={handleShare}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
          title="Share Custody Vault Details"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
