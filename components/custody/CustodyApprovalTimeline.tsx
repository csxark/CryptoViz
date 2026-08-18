'use client';

import React from 'react';
import { CustodyWithdrawalApproval } from '../../lib/CryptoCustodyModel';
import { Lock, Clock, CheckCircle2, DollarSign, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  approvals: CustodyWithdrawalApproval[];
}

export const CustodyApprovalTimeline: React.FC<TimelineProps> = ({ approvals }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">MPC Signatory Withdrawal Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of multisig key approvals, policy timelock releases, and custodial payouts</p>
        </div>
        <span className="bg-slate-100 text-slate-800 font-semibold px-3 py-1 rounded-full text-xs">
          {approvals.length} Approved Withdrawals
        </span>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Lock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No withdrawal requests submitted yet</p>
          <p className="text-xs text-gray-400 mt-1">Select an active institutional vault above to initiate MPC signatory approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((appr) => (
            <div
              key={appr.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-200/80 text-slate-800 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {appr.vaultName} ({appr.requestedAmount.toLocaleString()} {appr.assetSymbol})
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
                      Dest: {appr.destinationAddress}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Requested {appr.requestedTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Count & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Value (USD)</span>
                  <span className="font-extrabold text-gray-900 text-sm">${appr.requestedValueUsd.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Signatories</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{appr.currentApprovals}/{appr.requiredApprovals} Signed</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MPC Relayed
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
