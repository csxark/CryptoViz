'use client'

import type { SecurityMetrics } from '../../lib/utils/securityMetrics'

interface SecurityStrengthCardProps {
  metrics: SecurityMetrics
  className?: string
}

export function SecurityStrengthCard({ metrics, className = '' }: SecurityStrengthCardProps) {
  const {
    effectiveBits,
    quantumEffectiveBits,
    quantumResistance,
    quantumAlgorithm,
    crackEstimates,
    nistGuidance
  } = metrics

  const getQuantumBadgeColor = () => {
    switch (quantumResistance) {
      case 'quantum-resistant':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'quantum-vulnerable':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getNistBadgeColor = () => {
    switch (nistGuidance.status) {
      case 'recommended':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'acceptable':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'deprecated':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'insufficient':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getQuantumAlgorithmText = () => {
    switch (quantumAlgorithm) {
      case 'grover':
        return 'Grover (quadratic speedup)'
      case 'shor':
        return 'Shor (breaks algorithm)'
      case 'none':
        return 'Quantum-resistant'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Security Analysis
        </h3>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getNistBadgeColor()}`}>
          {nistGuidance.status.charAt(0).toUpperCase() + nistGuidance.status.slice(1)}
        </span>
      </div>

      {/* Effective Security Strength */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Effective Security Strength
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {effectiveBits === Infinity ? '∞' : effectiveBits} bits
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500"
            style={{ width: `${Math.min((effectiveBits === Infinity ? 256 : effectiveBits) / 256 * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Quantum Resistance */}
      <div className="mb-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Quantum Resistance
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getQuantumBadgeColor()}`}>
            {quantumResistance === 'quantum-resistant' ? 'Resistant' : 'Vulnerable'}
          </span>
        </div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Quantum-Effective Strength
          </span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {quantumEffectiveBits === Infinity ? '∞' : quantumEffectiveBits} bits
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Algorithm: {getQuantumAlgorithmText()}
        </p>
      </div>

      {/* Cost-to-Crack Estimates */}
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Theoretical Crack Estimates
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Operations Required
            </span>
            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
              2^{effectiveBits === Infinity ? '∞' : effectiveBits}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Time (10¹² ops/sec)
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {crackEstimates.timeAt10_12.readable}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Time (10¹⁵ ops/sec)
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {crackEstimates.timeAt10_15.readable}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Energy Required
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {crackEstimates.energy.readable}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              Estimated Cost
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {crackEstimates.cost.readable}
            </span>
          </div>
        </div>
      </div>

      {/* NIST Guidance */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            NIST Timeline Guidance
          </span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {nistGuidance.message}
        </p>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-[10px] text-zinc-400 dark:text-zinc-600">
        * Estimates are theoretical and based on current cryptographic understanding. 
        Actual security depends on implementation, side-channel resistance, and operational security.
      </p>
    </div>
  )
}
