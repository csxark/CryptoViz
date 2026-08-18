'use client';

import React from 'react';
import { ValidatorRewardDistribution } from '../../lib/CryptoStakingValidatorModel';
import { Cpu, Clock, CheckCircle2, DollarSign, FileSpreadsheet } from 'lucide-react';

interface TimelineProps {
  rewards: ValidatorRewardDistribution[];
}

export const ValidatorRewardTimeline: React.FC<TimelineProps> = ({ rewards }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Staking Epoch Payout Audit Log</h3>
          <p className="text-sm text-gray-500">Historical records of distributed staking rewards, validator commissions, and block proposal payouts</p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">
          {rewards.length} Distributed Epochs
        </span>
      </div>

      {rewards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Cpu className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-sm">No epoch rewards distributed yet</p>
          <p className="text-xs text-gray-400 mt-1">Select an active validator node above to distribute epoch staking rewards.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rewards.map((rew) => (
            <div
              key={rew.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100/60 text-indigo-700 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-base">
                    {rew.validatorName} (Epoch #{rew.rewardEpoch})
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded">
                      Network: {rew.network}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Distributed {rew.payoutTimestamp}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reward Breakdown & Status */}
              <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Staker Payout</span>
                  <span className="font-extrabold text-emerald-600 text-sm">${rew.rewardAmountUsd.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Commission Earned</span>
                  <span className="font-extrabold text-indigo-700 text-sm">${rew.commissionEarnedUsd.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Payout Settled
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
