'use client'

import { Cpu, Server, Activity } from 'lucide-react'
import { DeviceInfo } from '@/types/benchmark'

interface CpuInformationPanelProps {
  deviceInfo: DeviceInfo
}

export default function CpuInformationPanel({ deviceInfo }: CpuInformationPanelProps) {
  const cores = deviceInfo.hardwareConcurrency || 1;
  const memory = deviceInfo.deviceMemory;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <Cpu className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          CPU Information Panel
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Logical Cores</span>
            <Activity className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{cores}</div>
          <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
            {Array.from({ length: Math.min(cores, 64) }).map((_, i) => (
              <div key={i} className="h-2 rounded bg-teal-500/80 dark:bg-teal-400/80" title={`Core ${i + 1}`} />
            ))} {/* static core visualization, index key is safe */}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/50 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Device Memory</span>
            <Server className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            {memory ? `${memory} GB+` : 'Unknown'}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {memory ? 'Estimated available RAM' : 'API not supported'}
          </p>
        </div>
      </div>
      
      <div className="mt-4 rounded-lg bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
        <p className="font-medium">Performance Impact:</p>
        <p className="mt-1">
          Higher core counts enable better Web Worker parallelization. The benchmark engine utilizes up to {cores} logical processors to calculate measurements simultaneously.
        </p>
      </div>
    </div>
  )
}
