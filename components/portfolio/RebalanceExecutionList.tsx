'use client';

import React from 'react';
import { RebalanceExecutionLog } from '../../lib/CryptoPortfolioModel';
import { CheckCircle2, Clock, FileSpreadsheet, Scale } from 'lucide-react';

interface ComponentProps {
  logs: RebalanceExecutionLog[];
}

export const RebalanceExecutionList: React.FC<ComponentProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Automated Rebalancing Execution Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of executed portfolio target rebalancing transactions</p>
        </div>
        <span className="bg-purple-50 text-purple-700 font-bold px-3 py-1 rounded-full text-xs">
          {logs.length} Rebalances Settled
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Scale className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium text-sm">No rebalancing operations recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{log.portfolioName}</span>
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    ${log.totalRebalancedValueUsd.toLocaleString()} Vol. Rebalanced
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium">{log.rebalancedAssets}</p>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Executed {log.executedTimestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Rebalanced & Settled
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
