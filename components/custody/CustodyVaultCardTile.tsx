'use client';

import React from 'react';
import { CustodyVault } from '../../lib/CryptoCustodyModel';
import { ShieldCheck, Lock, Building2, Key, Award, ArrowUpRight } from 'lucide-react';

interface CardProps {
  vault: CustodyVault;
  onSelect: (vault: CustodyVault) => void;
}

export const CustodyVaultCardTile: React.FC<CardProps> = ({ vault, onSelect }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active-compliant':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'audit-pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg text-xs">
              {vault.institutionTier}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{vault.vaultName}</h3>
            <p className="text-xs text-gray-500 font-medium">Partner: {vault.custodianPartner}</p>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${getStatusBadge(vault.status)}`}>
            {vault.status.replace('-', ' ')}
          </span>
        </div>

        {/* Financial Highlights */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Total AUM Reserved:</span>
            <span className="font-extrabold text-gray-900 text-sm">${(vault.totalAumUsd / 1000000).toFixed(1)}M USD</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Multi-Sig Scheme:</span>
            <span className="font-bold text-indigo-600 font-mono">{vault.signersRequired} of {vault.signersTotal} Signers Required</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Compliance Score:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              {vault.complianceScore} / 100
            </span>
          </div>
        </div>

        {/* Primary Assets Allocation */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-gray-400">Reserve Assets</span>
          <div className="flex flex-wrap gap-1.5">
            {vault.primaryAssets.map((pa, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-mono font-bold text-gray-800">
                {pa.asset}: ${(pa.balanceUsd / 1000000).toFixed(1)}M
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={() => onSelect(vault)}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
      >
        <Lock className="w-3.5 h-3.5" />
        Inspect Custody Audit Trail
      </button>
    </div>
  );
};
