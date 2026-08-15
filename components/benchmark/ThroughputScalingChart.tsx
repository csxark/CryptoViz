'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { ScalingBenchmarkResult } from '@/types/benchmark'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'classical':
      return '#0d9488' // Teal-600
    case 'symmetric':
      return '#2563eb' // Blue-600
    case 'asymmetric':
      return '#db2777' // Pink-600
    case 'hash':
      return '#16a34a' // Green-600
    default:
      return '#7c3aed' // Purple-600
  }
}

interface TooltipPayloadItem {
  payload: {
    cipherName: string
    category: string
    payloadSize: number
    throughput: number
    averageTime: number
    operationsPerSecond: number
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    if (!data) return null
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 font-sans min-w-[240px]">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 mb-2 dark:border-zinc-800">
          <p className="font-bold text-zinc-900 dark:text-white text-sm truncate max-w-[140px]">
            {data.cipherName}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
            data.category === 'classical' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' :
            data.category === 'symmetric' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            data.category === 'asymmetric' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {data.category}
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Payload Size:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {data.payloadSize >= 1024 * 1024
                ? `${(data.payloadSize / (1024 * 1024)).toFixed(2)} MB`
                : data.payloadSize >= 1024
                ? `${(data.payloadSize / 1024).toFixed(2)} KB`
                : `${data.payloadSize} B`}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Throughput:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {data.throughput.toFixed(2)} MB/s
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Avg Time:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {data.averageTime.toFixed(4)} ms
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-1.5 mt-1.5 dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Ops/sec:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {data.operationsPerSecond.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

interface ThroughputScalingChartProps {
  results: ScalingBenchmarkResult[]
}

const formatPayloadSize = (size: number): string => {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${size} B`
}

export default React.memo(function ThroughputScalingChart({
  results,
}: ThroughputScalingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)

  // Track isDark class changes
  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  const chartData = useMemo(() => {
    if (!results || results.length === 0) return []

    // Get all unique payload sizes from all results
    const allPayloadSizes = Array.from(
      new Set(
        results.flatMap((result) =>
          result.results.map((r) => r.payloadSize)
        )
      )
    ).sort((a, b) => a - b)

    // Transform data for chart: each series is a cipher
    return allPayloadSizes.map((payloadSize) => {
      const dataPoint: any = {
        payloadSize,
        payloadSizeFormatted: formatPayloadSize(payloadSize),
      }

      results.forEach((result) => {
        const resultForSize = result.results.find((r) => r.payloadSize === payloadSize)
        if (resultForSize) {
          dataPoint[result.cipherId] = resultForSize.throughput
          dataPoint[`${result.cipherId}_time`] = resultForSize.averageTime
          dataPoint[`${result.cipherId}_ops`] = resultForSize.operationsPerSecond
          dataPoint[`${result.cipherId}_name`] = result.cipherName
          dataPoint[`${result.cipherId}_category`] = result.category
        }
      })

      return dataPoint
    })
  }, [results])

  const complexitySummary = useMemo(() => {
    return results.map((result) => ({
      cipherName: result.cipherName,
      category: result.category,
      complexity: result.estimatedComplexity,
      color: getCategoryColor(result.category),
    }))
  }, [results])

  if (!results || results.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No scaling data available. Run a payload scaling sweep to see results.
        </p>
      </div>
    )
  }

  const textColor = isDark ? '#e4e4e7' : '#27272a'
  const gridColor = isDark ? '#27272a' : '#e4e4e7'

  return (
    <div className="space-y-6">
      <div ref={chartRef} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="payloadSizeFormatted"
              tick={{ fill: textColor, fontSize: 12 }}
              label={{ value: 'Payload Size', position: 'insideBottom', offset: -10, fill: textColor, fontSize: 14 }}
              scale="log"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => value}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 12 }}
              label={{ value: 'Throughput (MB/s)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 14 }}
              scale="log"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value, entry: any) => (
                <span style={{ color: textColor, fontSize: 12 }}>
                  {entry.payload[`${value}_name`] || value}
                </span>
              )}
            />
            {results.map((result) => (
              <Line
                key={result.cipherId}
                type="monotone"
                dataKey={result.cipherId}
                stroke={getCategoryColor(result.category)}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={result.cipherId}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Complexity Summary Table */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Algorithmic Complexity Estimates
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Algorithm
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Category
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  Estimated Complexity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {complexitySummary.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                    {item.cipherName}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                      }}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                    {item.complexity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
})
