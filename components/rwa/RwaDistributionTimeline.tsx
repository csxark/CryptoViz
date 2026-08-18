'use client';

import React from 'react';
import { RwaDistributionPayout } from '../../lib/CryptoRwaModel';
import { Coins, Clock, CheckCircle2, DollarSign, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  distributions: RwaDistributionPayout[];
}

export const RwaDistributionTimeline: React.FC<TimelineProps> = ({ distributions }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">RWA Yield Distribution Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of off-chain asset yield harvests, Chainlink oracle attestations, and holder payouts</p>
        </div>
        <span className="bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-full text-xs">
          {distributions.length} Settled Distributions
        </span>
      </div>

      {distributions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Coins className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No yield payouts distributed yet</p>
          <p className="text-xs text-gray-400 mt-1">Select an active RWA tokenized asset above to distribute epoch yield earnings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {distributions.map((dist) => (
            <div
              key={dist.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100/60 text-amber-800 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {dist.assetName} (Epoch #{dist.payoutEpoch})
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
                      Oracle Hash: {dist.oracleAttestationHash}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Settled {dist.payoutTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Yield Amount & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Distributed Yield</span>
                  <span className="font-extrabold text-emerald-600 text-sm">${dist.distributionYieldUsd.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Oracle Verified
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
