'use client';

import React from 'react';
import { BridgeTransferAuditRecord } from '../../lib/CryptoBridgeModel';
import { CheckCircle2, Clock, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface ComponentProps {
  records: BridgeTransferAuditRecord[];
}

export const BridgeTransferAuditList: React.FC<ComponentProps> = ({ records }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Cross-Chain Bridge Transfer Log</h3>
          <p className="text-sm text-gray-500">Historical records of executed cross-chain bridge liquidity transfers</p>
        </div>
        <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
          {records.length} Completed Transfers
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No cross-chain transfers recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{rec.bridgeName}</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ${rec.amountTransferredUsd.toLocaleString()} {rec.tokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <span>{rec.sourceChain}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  <span>{rec.targetChain}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                  <span>Src: {rec.sourceTxHash}</span>
                  <span>•</span>
                  <span>Dst: {rec.targetTxHash}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Settled On-Chain
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
