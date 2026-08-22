'use client';

import React from 'react';
import { RebalanceExecutionLog } from '../../lib/CryptoPortfolioRiskModel';
import { RefreshCw, Clock, CheckCircle2, DollarSign, ArrowUpRight, ArrowDownRight, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  logs: RebalanceExecutionLog[];
}

export const PortfolioRebalanceTimeline: React.FC<TimelineProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">On-Chain Rebalance Execution Log</h3>
          <p className="text-sm text-gray-500">Historical automated swap transactions executed to realign asset allocation targets</p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">
          {logs.length} Executed Rebalances
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <RefreshCw className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No rebalance execution logs recorded</p>
          <p className="text-xs text-gray-400 mt-1">Select an active crypto portfolio above to trigger target rebalancing swaps.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100/60 text-indigo-700 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {log.portfolioName} ({log.assetSymbol})
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${log.tradeType === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {log.tradeType}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Executed {log.executedTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trade Values & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Rebalance Trade Volume</span>
                  <span className="font-extrabold text-gray-900 text-sm">${log.tradeAmountUsd.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Executed On-Chain
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
