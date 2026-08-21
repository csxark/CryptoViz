'use client';

import React from 'react';
import { PortfolioRebalanceAuditRecord } from '../../lib/CryptoPortfolioRiskModel';
import { ShieldCheck, ShieldAlert, ExternalLink, Activity } from 'lucide-react';

interface TimelineProps {
  records: PortfolioRebalanceAuditRecord[];
}

export const CryptoPortfolioRiskTimeline: React.FC<TimelineProps> = ({ records }) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Automated Portfolio Rebalance Audit Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time portfolio rebalancing logs, gas optimization records, and execution telemetry.
          </p>
        </div>
        <span className="bg-slate-800 text-slate-300 font-semibold text-xs px-3 py-1 rounded-full border border-slate-700">
          {records.length} Rebalances Executed
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-medium">No rebalance records logged yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-slate-700"
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-1">
                  {rec.status === 'REBALANCED_SUCCESS' ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base">{rec.portfolioName}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                        rec.status === 'REBALANCED_SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Portfolio Value: ${rec.portfolioValueUsd.toLocaleString()}</span>
                    <span>•</span>
                    <span>Assets Swapped: {rec.rebalancedAssetsCount}</span>
                    <span>•</span>
                    <span>Timestamp: {rec.executedTimestamp}</span>
                  </div>
                </div>
              </div>

              <div className="text-right self-end sm:self-center w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                <div className="text-lg font-black text-purple-400">
                  Gas: ${rec.gasPaidUsd}
                </div>
                <a
                  href={`https://etherscan.io/tx/${rec.executionTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors mt-0.5 font-mono"
                >
                  {rec.executionTxHash.substring(0, 10)}...{rec.executionTxHash.substring(58)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
