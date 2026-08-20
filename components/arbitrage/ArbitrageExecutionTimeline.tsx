'use client';

import React from 'react';
import { ArbitrageExecutionRecord } from '../../lib/CryptoArbitrageModel';
import { Zap, Clock, CheckCircle2, DollarSign, FileSpreadsheet, FlaskConical, AlertCircle } from 'lucide-react';

interface TimelineProps {
  records: ArbitrageExecutionRecord[];
}

export const ArbitrageExecutionTimeline: React.FC<TimelineProps> = ({ records }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-lg">Arbitrage Strategy Simulation Log</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
              Paper-Trading Audit
            </span>
          </div>
          <p className="text-sm text-gray-500">Historical records of simulated flash loan arbitrage trades and off-chain calculated yields</p>
        </div>
        <span className="bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-full text-xs">
          {records.length} Simulated Executions
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <FlaskConical className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No simulated arbitrage runs recorded</p>
          <p className="text-xs text-gray-400 mt-1">Select a simulated arbitrage opportunity above to run a paper-trading test.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100/60 text-purple-800 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-gray-900 text-base">
                    {rec.tokenPair} (${rec.loanAmountUsd.toLocaleString()} {rec.borrowAsset} Loan)
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <span className="bg-gray-200 text-gray-800 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                      Simulated Hash: {rec.simulatedTxHash}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Simulated {rec.executedTimestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    {rec.disclaimer}
                  </p>
                </div>
              </div>

              {/* Profit & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs shrink-0">
                <div>
                  <span className="text-gray-400 block font-medium">Simulated Profit</span>
                  <span className="font-extrabold text-emerald-600 text-sm">+${rec.simulatedNetProfitUsd.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  <FlaskConical className="w-3.5 h-3.5" /> Paper Simulated
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
