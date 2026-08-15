'use client'

/**
 * DAGKnowledgeGraph component
 *
 * Renders an interactive SVG-based Directed Acyclic Graph (DAG) visualizing
 * cryptographic concepts, prerequisite dependencies, track goals, and progress.
 *
 * Capabilities:
 *   - Pan and zoom canvas controls
 *   - Track presets (PQC, Symmetric, PKI, All) highlighting target subsets
 *   - Node status color indicators (Completed, Available, Locked)
 *   - Upstream prerequisite path highlighting (clicking any node highlights its chain)
 *   - Completion state persistence in localStorage for non-guided nodes (e.g. math topics)
 *   - High-contrast visual accents and accessible aria-labels
 */

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  CheckCircle,
  HelpCircle,
  Eye,
  RefreshCw,
} from 'lucide-react'
import {
  DAG_NODES,
  DAG_EDGES,
  DAG_PRESETS,
  getUpstreamPrerequisites,
  getNodeStatus,
  type DAGNode,
} from '@/lib/learning/dagData'

interface DAGKnowledgeGraphProps {
  completedLessons: Record<string, boolean> // from useLearningPath()
}

// Preset visual coords for our 16 nodes to render a structured layered DAG
const NODE_LAYOUTS: Record<string, { x: number; y: number }> = {
  // Layer 0: Basic math & Core goals
  'modular-arithmetic': { x: 100, y: 100 },
  'security-goals': { x: 100, y: 250 },
  'polynomial-rings': { x: 100, y: 400 },

  // Layer 1: Intermediate foundations
  'prime-numbers': { x: 300, y: 100 },
  'encoding-vs-encryption': { x: 300, y: 250 },
  'lwe-math': { x: 300, y: 400 },

  // Layer 2: Main cryptosystems
  'diffie-hellman': { x: 520, y: 50 },
  'rsa-encryption': { x: 520, y: 150 },
  'stream-ciphers': { x: 520, y: 250 },
  'block-cipher-core': { x: 520, y: 350 },
  'ml-kem': { x: 520, y: 470 },

  // Layer 3: Advanced extensions
  'rsa-padding': { x: 740, y: 150 },
  'sbox-cryptanalysis': { x: 740, y: 280 },
  'block-cipher-modes': { x: 740, y: 400 },

  // Layer 4: System Integration
  'digital-certificates': { x: 960, y: 120 },
  'aes-gcm': { x: 960, y: 360 },
}

const STORAGE_KEY = 'cryptoviz_custom_node_completions'

export default function DAGKnowledgeGraph({ completedLessons }: DAGKnowledgeGraphProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Custom node completion state (for nodes not directly linked to guided learning-path lessons)
  const [customCompletions, setCustomCompletions] = useState<Record<string, boolean>>({})

  // Pan and zoom states
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 30, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  // Load custom completions on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setCustomCompletions(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load custom completions', e)
      }
    }
  }, [])

  // Save custom completions to localStorage
  const toggleCustomCompletion = (nodeId: string) => {
    setCustomCompletions((prev) => {
      const updated = { ...prev, [nodeId]: !prev[nodeId] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save custom completions', e)
      }
      return updated
    })
  }

  const resetCustomCompletions = () => {
    setCustomCompletions({})
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear completions', e)
    }
  }

  // Active track preset configuration
  const activePreset = useMemo(() => {
    return DAG_PRESETS.find((p) => p.id === selectedTrack) ?? DAG_PRESETS[0]
  }, [selectedTrack])

  // Compute selected node's upstream prerequisite path
  const upstreamPrereqs = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    return getUpstreamPrerequisites(selectedNodeId)
  }, [selectedNodeId])

  // Pan canvas drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag when clicking the canvas container directly or via middle mouse
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true)
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Reset zoom & pan to default
  const handleResetView = () => {
    setZoom(0.85)
    setPan({ x: 30, y: 20 })
  }

  const selectedNode = useMemo(() => {
    return DAG_NODES.find((n) => n.id === selectedNodeId) || null
  }, [selectedNodeId])

  return (
    <div className="space-y-6">
      {/* Track preset tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-100">Prerequisite Knowledge Explorer</h2>
          <p className="text-xs text-slate-400">
            Interactive Directed Acyclic Graph (DAG) demonstrating cryptographic dependencies.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Learning Track Goals">
          {DAG_PRESETS.map((preset) => {
            const active = selectedTrack === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedTrack(preset.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Preset description */}
      <div className="text-xs text-slate-400 bg-slate-900/30 border border-slate-800/80 px-4 py-3 rounded-xl">
        <span className="font-bold text-cyan-400">Current Track Target:</span> {activePreset.description}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The Graph Canvas Column */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className={`relative h-[550px] w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {/* View Canvas Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Legend indicator */}
            <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-sm text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-medium">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-300 font-medium">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
                <span className="text-slate-500 font-medium">Locked</span>
              </div>
            </div>

            {/* Render Graph SVG */}
            <svg
              className="absolute inset-0 w-full h-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {/* Arrow Marker Definitions */}
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
                </marker>
                <marker
                  id="arrow-highlight"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
                </marker>
              </defs>

              {/* Draw dependency edges */}
              {DAG_EDGES.map((edge, idx) => {
                const start = NODE_LAYOUTS[edge.from]
                const end = NODE_LAYOUTS[edge.to]
                if (!start || !end) return null

                // Determine if this connection edge belongs to a preset track filter
                const isEdgeInPreset =
                  activePreset.nodes.includes(edge.from) && activePreset.nodes.includes(edge.to)

                // Highlight edge if it leads directly into the selected node or is part of its prerequisite trail
                const isHighlighted =
                  selectedNodeId !== null &&
                  ((edge.to === selectedNodeId && upstreamPrereqs.has(edge.from)) ||
                    (upstreamPrereqs.has(edge.to) && upstreamPrereqs.has(edge.from)) ||
                    (edge.to === selectedNodeId && upstreamPrereqs.has(edge.from)))

                return (
                  <line
                    key={idx}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isHighlighted ? '#06b6d4' : '#1e293b'}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={!isEdgeInPreset ? '4 4' : undefined}
                    opacity={!isEdgeInPreset ? 0.25 : isHighlighted ? 1 : 0.6}
                    markerEnd={isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow-default)'}
                  />
                )
              })}

              {/* Draw nodes */}
              {DAG_NODES.map((node) => {
                const pos = NODE_LAYOUTS[node.id]
                if (!pos) return null

                const isNodeInPreset = activePreset.nodes.includes(node.id)
                const status = getNodeStatus(node.id, completedLessons, customCompletions)
                const isSelected = selectedNodeId === node.id
                const isPrereqHighlight = upstreamPrereqs.has(node.id)

                let fillColor = 'bg-slate-900 border-slate-800 text-slate-500'
                if (status === 'Completed') {
                  fillColor = 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                } else if (status === 'Available') {
                  fillColor = 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x - 70}, ${pos.y - 25})`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNodeId(node.id)
                    }}
                    className="cursor-pointer"
                  >
                    {/* Selected highlight box */}
                    {isSelected && (
                      <rect
                        x="-4"
                        y="-4"
                        width="148"
                        height="58"
                        rx="14"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Prerequisite trail highlight box */}
                    {isPrereqHighlight && !isSelected && (
                      <rect
                        x="-3"
                        y="-3"
                        width="146"
                        height="56"
                        rx="13"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Primary Node Rectangle */}
                    <rect
                      width="140"
                      height="50"
                      rx="10"
                      className={`fill-slate-900 stroke-2 transition-all ${
                        status === 'Completed'
                          ? 'stroke-emerald-500'
                          : status === 'Available'
                            ? 'stroke-cyan-500'
                            : 'stroke-slate-800'
                      }`}
                      fillOpacity={isSelected ? 1 : 0.8}
                      opacity={isNodeInPreset ? 1 : 0.25}
                    />

                    {/* Node title */}
                    <text
                      x="70"
                      y="24"
                      textAnchor="middle"
                      className={`font-sans text-[10px] font-bold fill-slate-200 select-none`}
                      opacity={isNodeInPreset ? 1 : 0.4}
                    >
                      {node.title}
                    </text>

                    {/* Node category label */}
                    <text
                      x="70"
                      y="38"
                      textAnchor="middle"
                      className={`font-mono text-[7px] font-semibold fill-slate-500 tracking-wider uppercase select-none`}
                    >
                      {node.track}
                    </text>

                    {/* Lock / Check Icon Indicators */}
                    <g transform="translate(112, 10)">
                      {status === 'Completed' ? (
                        <circle cx="8" cy="8" r="7" className="fill-emerald-500/20 stroke-emerald-500 stroke-[1]" />
                      ) : status === 'Available' ? (
                        <circle cx="8" cy="8" r="7" className="fill-cyan-500/20 stroke-cyan-500 stroke-[1]" />
                      ) : (
                        <circle cx="8" cy="8" r="7" className="fill-slate-950 stroke-slate-800 stroke-[1]" />
                      )}
                      <foreignObject x="3" y="3" width="10" height="10">
                        <div className="flex items-center justify-center text-slate-100">
                          {status === 'Completed' ? (
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                          ) : status === 'Available' ? (
                            <Unlock className="w-2.5 h-2.5 text-cyan-400" />
                          ) : (
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                          )}
                        </div>
                      </foreignObject>
                    </g>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Selected Node Details Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 h-full flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-5">
                {/* Node Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    Track: {selectedNode.track}
                  </span>

                  {getNodeStatus(selectedNode.id, completedLessons, customCompletions) === 'Completed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : getNodeStatus(selectedNode.id, completedLessons, customCompletions) === 'Available' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                      <Unlock className="w-3.5 h-3.5" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-100">{selectedNode.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{selectedNode.description}</p>
                </div>

                {/* Prerequisite path highlight message */}
                {upstreamPrereqs.size > 0 && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-300/90 leading-relaxed">
                    <span className="font-bold text-cyan-400 block mb-1">Prerequisites:</span>
                    {Array.from(upstreamPrereqs)
                      .map((pId) => DAG_NODES.find((n) => n.id === pId)?.title || '')
                      .join(' → ')}
                  </div>
                )}

                {/* Custom node toggle (e.g. for math topics that lack standard lessons) */}
                {!selectedNode.lessonRef && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block tracking-wider">
                      Self-study Topic
                    </span>
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customCompletions[selectedNode.id] || false}
                        onChange={() => toggleCustomCompletion(selectedNode.id)}
                        className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Mark this foundation topic as complete</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-500 space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-700" />
                <div className="text-sm font-semibold text-slate-400">No Concept Selected</div>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                  Select a skill or cipher node on the DAG map to view its details, prerequisite trail, and start lessons.
                </p>
              </div>
            )}

            {/* Launch / CTA Buttons */}
            {selectedNode && (
              <div className="pt-6 border-t border-slate-800/80 flex flex-col gap-2">
                {getNodeStatus(selectedNode.id, completedLessons, customCompletions) === 'Locked' ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700/50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Prerequisites Required
                  </button>
                ) : (
                  <Link
                    href={selectedNode.href}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors text-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Launch Topic Visualizer
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={resetCustomCompletions}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Self-study Progress
        </button>
      </div>
    </div>
  )
}
