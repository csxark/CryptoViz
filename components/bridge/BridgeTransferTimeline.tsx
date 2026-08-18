'use client';

import React from 'react';
import { BridgeTransferTransaction } from '../../lib/CryptoBridgeModel';
import { Network, Clock, CheckCircle2, DollarSign, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  transfers: BridgeTransferTransaction[];
}

export const BridgeTransferTimeline: React.FC<TimelineProps> = ({ transfers }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Cross-Chain Relay Settlement Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of cross-chain asset transfers, relayer confirmations, and transaction hashes</p>
        </div>
        <span className="bg-cyan-50 text-cyan-700 font-semibold px-3 py-1 rounded-full text-xs">
          {transfers.length} Relayed Transfers
        </span>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Network className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No cross-chain transfers executed yet</p>
          <p className="text-xs text-gray-400 mt-1">Select an active bridge route above to initiate cross-chain asset transfers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transfers.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-100/60 text-cyan-700 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {tx.sourceChain} ➔ {tx.targetChain} ({tx.transferAmount} {tx.tokenSymbol})
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
                      Protocol: {tx.bridgeProtocol}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Relayed {tx.transferredTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transfer Value & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Transfer Amount</span>
                  <span className="font-extrabold text-gray-900 text-sm">${tx.transferValueUsd.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Relayer Fee</span>
                  <span className="font-extrabold text-cyan-700 text-sm">${tx.feePaidUsd}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed On-Chain
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
