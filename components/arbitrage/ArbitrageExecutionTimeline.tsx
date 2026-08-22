'use client';

import React from 'react';
import { ArbitrageSimulationRecord } from '../../lib/CryptoArbitrageModel';
import { Zap, Clock, CheckCircle2, XCircle, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface TimelineProps {
  records: ArbitrageSimulationRecord[];
}

export const ArbitrageExecutionTimeline: React.FC<TimelineProps> = ({ records }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Paper Trading & Simulation Execution Log</h3>
          <p className="text-sm text-gray-500">
            Durable domain state records of simulated flash loan arbitrage executions & revert diagnostics
          </p>
        </div>
        <span className="bg-amber-50 text-amber-800 font-semibold px-3 py-1 rounded-full text-xs">
          {records.length} Simulated Executions
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Zap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No simulation runs recorded yet</p>
          <p className="text-xs text-gray-400 mt-1">Select a detected arbitrage opportunity above to trigger deterministic simulation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const isSuccess = rec.status === 'SIMULATED_SUCCESS';
            return (
              <div
                key={rec.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl mt-0.5 ${
                      isSuccess ? 'bg-amber-100/60 text-amber-800' : 'bg-red-100/60 text-red-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">
                      {rec.tokenPair} (${rec.loanAmountUsd.toLocaleString()} {rec.borrowAsset} Simulated Loan)
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                      <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded font-mono">
                        Sim ID: {rec.simulationIdentifier}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Simulated {rec.executedTimestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profit & Status */}
                <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                  {isSuccess ? (
                    <>
                      <div>
                        <span className="text-gray-400 block font-medium">Simulated Net Profit</span>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          +${rec.simulatedNetProfitUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> SIMULATED_SUCCESS
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-400 block font-medium">Revert Reason</span>
                        <span className="font-bold text-red-600 text-xs">
                          {rec.failureReason || 'SIMULATED_REVERT'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600 font-semibold bg-red-50 px-2.5 py-1 rounded-lg">
                        <XCircle className="w-3.5 h-3.5" /> SIMULATED_REVERT
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
