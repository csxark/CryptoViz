'use client';

import React from 'react';
import { ArbitrageExecutionRecord } from '../../lib/CryptoArbitrageModel';
import { Zap, Clock, CheckCircle2, DollarSign, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  records: ArbitrageExecutionRecord[];
}

export const ArbitrageExecutionTimeline: React.FC<TimelineProps> = ({ records }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">MEV & Flash Loan Arbitrage Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of executed flash loan arbitrage trades and realized profits</p>
        </div>
        <span className="bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-full text-xs">
          {records.length} Completed Arbitrage Trades
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Zap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No flash loan arbitrage trades recorded</p>
          <p className="text-xs text-gray-400 mt-1">Select a live arbitrage opportunity above to trigger an execution bot trade.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100/60 text-amber-800 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {rec.tokenPair} (${rec.loanAmountUsd.toLocaleString()} {rec.borrowAsset} Loan)
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
                      Tx: {rec.transactionHash}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Executed {rec.executedTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Realized Net Profit</span>
                  <span className="font-extrabold text-emerald-600 text-sm">+${rec.realizedNetProfitUsd.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MEV Settled
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
