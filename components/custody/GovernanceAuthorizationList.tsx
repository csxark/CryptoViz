'use client';

import React from 'react';
import { GovernanceAuthorizationRequest } from '../../lib/CryptoCustodyModel';
import { ShieldAlert, Key, CheckCircle2, Clock, FileCheck } from 'lucide-react';

interface ComponentProps {
  requests: GovernanceAuthorizationRequest[];
  onSign: (requestId: string) => void;
}

export const GovernanceAuthorizationList: React.FC<ComponentProps> = ({ requests, onSign }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Multi-Sig Asset Governance Signatures</h3>
          <p className="text-sm text-gray-500">Pending threshold approval requests for institutional vault transfers</p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">
          {requests.length} Pending Actions
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <FileCheck className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No pending governance transfer requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{req.vaultName}</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ${req.amountUsd.toLocaleString()} {req.transferAsset} Transfer
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono">Dest: {req.destinationAddress} • Requested by {req.requestedBy}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{req.requestedTimestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-700 block">
                    {req.signaturesCollected} / {req.signaturesNeeded} Signatures
                  </span>
                  <span className="text-[10px] text-gray-400">Threshold Approval</span>
                </div>

                {req.status === 'approved-broadcast' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Broadcast
                  </span>
                ) : (
                  <button
                    onClick={() => onSign(req.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Sign Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
