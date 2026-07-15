'use client'

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { BenchmarkResult } from '@/types/benchmark'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  LabelList,
  Cell,
  Brush,
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
    name: string
    fullName: string
    category: string
    avgTime: number
    minTime: number
    maxTime: number
    opsPerSec: number
    workerExecutionTime?: number
    memoryUsage?: number
  }
}

interface CustomChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

const CustomChartTooltip = ({ active, payload, label }: CustomChartTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    if (!data) return null
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 font-sans min-w-[220px]">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 mb-2 dark:border-zinc-800">
          <p className="font-bold text-zinc-900 dark:text-white text-sm truncate max-w-[130px]">
            {data.fullName || label}
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
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Avg Time:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {data.avgTime !== undefined ? `${data.avgTime.toFixed(4)} ms` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Min / Max:</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {data.minTime !== undefined ? `${data.minTime.toFixed(4)}` : 'N/A'} / {data.maxTime !== undefined ? `${data.maxTime.toFixed(4)} ms` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-1.5 mt-1.5 dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400 font-sans">Throughput:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {data.opsPerSec !== undefined ? `${data.opsPerSec.toLocaleString()} ops/s` : 'N/A'}
            </span>
          </div>
          {data.workerExecutionTime !== undefined && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400 font-sans">Worker RTT:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {data.workerExecutionTime.toFixed(4)} ms
              </span>
            </div>
          )}
          {data.memoryUsage !== undefined && (
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 dark:text-zinc-400 font-sans">Mem Growth:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {data.memoryUsage > 1024 * 1024
                  ? `${(data.memoryUsage / (1024 * 1024)).toFixed(2)} MB`
                  : data.memoryUsage > 1024
                  ? `${(data.memoryUsage / 1024).toFixed(1)} KB`
                  : `${data.memoryUsage.toFixed(0)} B`}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

interface ComparisonChartProps {
  results: BenchmarkResult[]
  chartType?: 'bar' | 'line' | 'scatter'
}

export default React.memo(function ComparisonChart({
  results,
  chartType = 'bar',
}: ComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(false)
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({
    avgTime: true,
    minTime: true,
    maxTime: true,
  })
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    classical: true,
    symmetric: true,
    asymmetric: true,
    hash: true,
  })

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

  const chartData = useMemo(() => results.map((result) => ({
    name: result.cipherName.substring(0, 15), // Truncate long names
    avgTime: parseFloat(result.averageTime.toFixed(4)),
    minTime: parseFloat(result.minTime.toFixed(4)),
    maxTime: parseFloat(result.maxTime.toFixed(4)),
    opsPerSec: parseFloat(result.operationsPerSecond.toFixed(0)),
    fullName: result.cipherName,
    category: result.category,
    workerExecutionTime: result.workerExecutionTime,
    memoryUsage: result.memoryUsage,
  })), [results])

  const sortedData = useMemo(() => [...chartData].sort((a, b) => a.avgTime - b.avgTime), [chartData])

  const filteredData = useMemo(() => {
    return sortedData.filter((item) => activeCategories[item.category] !== false)
  }, [sortedData, activeCategories])

  const toggleCategory = useCallback((category: string) => {
    setActiveCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }, [])

  const toggleKey = useCallback((key: string) => {
    setActiveKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const handleExport = useCallback((format: 'png' | 'svg') => {
    if (!chartRef.current) return
    const svgElement = chartRef.current.querySelector('svg')
    if (!svgElement) return

    const width = svgElement.clientWidth || 800
    const height = svgElement.clientHeight || 450

    // Clone SVG Node
    const svgClone = svgElement.cloneNode(true) as SVGElement
    if (!svgClone.getAttribute('xmlns')) {
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    svgClone.setAttribute('width', width.toString())
    svgClone.setAttribute('height', height.toString())
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`)

    const isDarkTheme = document.documentElement.classList.contains('dark')
    const bgColor = isDarkTheme ? '#09090b' : '#ffffff'
    const fgColor = isDarkTheme ? '#e4e4e7' : '#27272a'
    const gridColor = isDarkTheme ? '#27272a' : '#e4e4e7'

    // Add background rectangle
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', bgColor)
    svgClone.insertBefore(bgRect, svgClone.firstChild)

    // Inject SVG Inline Styles for correct colors outside the browser context
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    styleElement.textContent = `
      svg { background-color: ${bgColor}; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      text { fill: ${fgColor} !important; font-size: 10px; }
      .recharts-text { fill: ${fgColor} !important; }
      .recharts-cartesian-axis-line { stroke: ${gridColor} !important; }
      .recharts-cartesian-axis-tick-line { stroke: ${gridColor} !important; }
      .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: ${isDarkTheme ? '#18181b' : '#f4f4f5'} !important; stroke-opacity: 0.8; }
      .recharts-brush-slide { fill: ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important; fill-opacity: 0.15; }
      .recharts-brush-traveller rect { fill: ${isDarkTheme ? '#52525b' : '#a1a1aa'} !important; }
      .recharts-label-list text { fill: ${isDarkTheme ? '#a1a1aa' : '#71717a'} !important; font-size: 9px; font-weight: 500; }
    `
    svgClone.appendChild(styleElement)

    const svgString = new XMLSerializer().serializeToString(svgClone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const filename = `cryptoviz-benchmark-chart-${Date.now()}`

    if (format === 'svg') {
      const downloadLink = document.createElement('a')
      downloadLink.href = svgUrl
      downloadLink.download = `${filename}.svg`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(svgUrl)
    } else {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context) {
          context.fillStyle = bgColor
          context.fillRect(0, 0, width, height)
          context.drawImage(image, 0, 0)
          try {
            const pngUrl = canvas.toDataURL('image/png')
            const downloadLink = document.createElement('a')
            downloadLink.href = pngUrl
            downloadLink.download = `${filename}.png`
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
          } catch (err) {
            console.error('Error generating PNG:', err)
          }
        }
        URL.revokeObjectURL(svgUrl)
      }
      image.onerror = (e) => {
        console.error('Image load error for PNG:', e)
        URL.revokeObjectURL(svgUrl)
      }
      image.src = svgUrl
    }
  }, [])

  const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = isDark ? '#a1a1aa' : '#71717a'
  const brushStroke = isDark ? '#27272a' : '#e4e4e7'
  const brushFill = isDark ? '#09090b' : '#fafafa'

  const renderChart = useCallback(() => {
    if (filteredData.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic font-sans">
            No algorithms to display. Toggle categories in the legend below to show data.
          </p>
        </div>
      )
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={filteredData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="name"
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
              angle={-45}
              textAnchor="end"
              height={65}
            />
            <YAxis
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip content={<CustomChartTooltip />} />
            {activeKeys.avgTime && (
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#14b8a6"
                name="Average Time"
                dot={{ fill: '#14b8a6', r: 3 }}
                activeDot={{ r: 6 }}
              />
            )}
            {activeKeys.minTime && (
              <Line
                type="monotone"
                dataKey="minTime"
                stroke="#22c55e"
                name="Min Time"
                strokeDasharray="5 5"
                dot={{ fill: '#22c55e', r: 2 }}
              />
            )}
            {activeKeys.maxTime && (
              <Line
                type="monotone"
                dataKey="maxTime"
                stroke="#ef4444"
                name="Max Time"
                strokeDasharray="5 5"
                dot={{ fill: '#ef4444', r: 2 }}
              />
            )}
            {filteredData.length > 4 && (
              <Brush
                dataKey="name"
                height={26}
                stroke={brushStroke}
                fill={brushFill}
                className="text-[10px] text-zinc-500 font-sans"
                travellerWidth={8}
              />
            )}
          </LineChart>
        )

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              type="number"
              dataKey="opsPerSec"
              name="Ops/Second"
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(val) =>
                val >= 1000000
                  ? `${(val / 1000000).toFixed(1)}M`
                  : val >= 1000
                  ? `${(val / 1000).toFixed(1)}k`
                  : val.toString()
              }
            />
            <YAxis
              type="number"
              dataKey="avgTime"
              name="Avg Time (ms)"
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip content={<CustomChartTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Algorithms" data={filteredData} fill="#14b8a6">
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
              ))}
              <LabelList
                dataKey="name"
                position="top"
                offset={10}
                style={{ fill: textColor, fontSize: '9px', fontWeight: 500 }}
              />
            </Scatter>
            {filteredData.length > 4 && (
              <Brush
                dataKey="name"
                height={26}
                stroke={brushStroke}
                fill={brushFill}
                className="text-[10px] text-zinc-500 font-sans"
                travellerWidth={8}
              />
            )}
          </ScatterChart>
        )

      default:
        return (
          <BarChart data={filteredData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="name"
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
              angle={-45}
              textAnchor="end"
              height={65}
            />
            <YAxis
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}ms`}
            />
            <Tooltip content={<CustomChartTooltip />} />
            {activeKeys.avgTime && (
              <Bar dataKey="avgTime" fill="#14b8a6" name="Average Time" radius={[4, 4, 0, 0]} />
            )}
            {activeKeys.minTime && (
              <Bar dataKey="minTime" fill="#22c55e" name="Min Time" radius={[4, 4, 0, 0]} />
            )}
            {activeKeys.maxTime && (
              <Bar dataKey="maxTime" fill="#ef4444" name="Max Time" radius={[4, 4, 0, 0]} />
            )}
            {filteredData.length > 4 && (
              <Brush
                dataKey="name"
                height={26}
                stroke={brushStroke}
                fill={brushFill}
                className="text-[10px] text-zinc-500 font-sans"
                travellerWidth={8}
              />
            )}
          </BarChart>
        )
    }
  }, [chartType, filteredData, activeKeys, activeCategories, gridStroke, textColor, brushStroke, brushFill])

  if (results.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400 font-sans">No data to display. Run a benchmark first.</p>
      </div>
    )
  }

  return (
    <div
      ref={chartRef}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white font-sans">
          Performance Comparison
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans mr-1">
            Export Chart:
          </span>
          <button
            type="button"
            onClick={() => handleExport('png')}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={() => handleExport('svg')}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            SVG
          </button>
        </div>
      </div>

      <div className="h-96 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Interactive HTML Legend */}
      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 font-sans">
        {/* Category Toggles */}
        <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <span className="font-semibold text-zinc-900 dark:text-white flex items-center">
            Toggle Categories:
          </span>
          <button
            type="button"
            onClick={() => toggleCategory('classical')}
            aria-pressed={activeCategories.classical}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              activeCategories.classical
                ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${activeCategories.classical ? 'bg-[#0d9488]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
            <span>Classical</span>
          </button>
          <button
            type="button"
            onClick={() => toggleCategory('symmetric')}
            aria-pressed={activeCategories.symmetric}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              activeCategories.symmetric
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${activeCategories.symmetric ? 'bg-[#2563eb]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
            <span>Symmetric</span>
          </button>
          <button
            type="button"
            onClick={() => toggleCategory('asymmetric')}
            aria-pressed={activeCategories.asymmetric}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              activeCategories.asymmetric
                ? 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-950/40 dark:border-pink-900 dark:text-pink-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${activeCategories.asymmetric ? 'bg-[#db2777]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
            <span>Asymmetric</span>
          </button>
          <button
            type="button"
            onClick={() => toggleCategory('hash')}
            aria-pressed={activeCategories.hash}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              activeCategories.hash
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300'
                : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${activeCategories.hash ? 'bg-[#16a34a]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
            <span>Hash</span>
          </button>
        </div>

        {/* Metric Toggles */}
        {(chartType === 'bar' || chartType === 'line') && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-white flex items-center">
              Toggle Metrics:
            </span>
            <button
              type="button"
              onClick={() => toggleKey('avgTime')}
              aria-pressed={activeKeys.avgTime}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                activeKeys.avgTime
                  ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${activeKeys.avgTime ? 'bg-[#14b8a6]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
              <span>Average Time</span>
            </button>
            <button
              type="button"
              onClick={() => toggleKey('minTime')}
              aria-pressed={activeKeys.minTime}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                activeKeys.minTime
                  ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${activeKeys.minTime ? 'bg-[#22c55e]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
              <span>Min Time</span>
            </button>
            <button
              type="button"
              onClick={() => toggleKey('maxTime')}
              aria-pressed={activeKeys.maxTime}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                activeKeys.maxTime
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-550 opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${activeKeys.maxTime ? 'bg-[#ef4444]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
              <span>Max Time</span>
            </button>
          </div>
        )}

        <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Active Ciphers (sorted by average time):</p>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
          {filteredData.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-700 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-300 animate-fade-in"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getCategoryColor(item.category),
                }}
              />
              <span className="font-medium">{item.fullName}</span>
              <span className="font-mono text-zinc-400 dark:text-zinc-500">({item.avgTime.toFixed(2)}ms)</span>
            </div>
          ))}
          {filteredData.length === 0 && (
            <span className="text-zinc-500 italic text-[11px]">No ciphers match current filters.</span>
          )}
        </div>
      </div>
    </div>
  )
})
