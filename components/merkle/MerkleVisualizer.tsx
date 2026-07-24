'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Info,
  CheckCircle,
  XCircle,
  Coins,
  FileText,
  GitBranch,
  Copy,
  Check,
  ChevronRight,
  HelpCircle,
  Code
} from 'lucide-react'
import {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  computeSingleHash,
  MerkleNode,
  MerkleProof,
  HashType,
  OddStrategy
} from '../../lib/utils/merkle'

const PRESETS = [
  {
    name: 'Bitcoin Transactions',
    icon: Coins,
    description: 'Simplified financial transaction ledger.',
    leaves: [
      'Tx0: Alice -> Bob 0.25 BTC',
      'Tx1: Charlie -> Dave 1.5 BTC',
      'Tx2: Eve -> Frank 0.08 BTC',
      'Tx3: Grace -> Heidi 2.0 BTC'
    ]
  },
  {
    name: 'IPFS File Chunks',
    icon: FileText,
    description: 'Chunked file distribution system.',
    leaves: [
      'Chunk 0: [Header MD5]',
      'Chunk 1: [Raw Video Stream P1]',
      'Chunk 2: [Raw Video Stream P2]',
      'Chunk 3: [Index Table]',
      'Chunk 4: [Metadata]'
    ]
  },
  {
    name: 'Git Commit Tree',
    icon: GitBranch,
    description: 'File state tracking in Git repository.',
    leaves: [
      'blob 2a3b0: README.md',
      'blob 8f4e1: package.json',
      'blob d0192: src/index.ts'
    ]
  }
]

export default function MerkleVisualizer() {
  // Config state
  const [leaves, setLeaves] = useState<string[]>(PRESETS[0].leaves)
  const [newLeafValue, setNewLeafValue] = useState('')
  const [hashType, setHashType] = useState<HashType>('sha256')
  const [oddStrategy, setOddStrategy] = useState<OddStrategy>('duplicate')

  // Selected details
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number | null>(null)
  const [selectedNode, setSelectedNode] = useState<MerkleNode | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  // Interactive Tree & Proof state
  const { levels, root } = React.useMemo(() => {
    return buildMerkleTree(leaves, hashType, oddStrategy)
  }, [leaves, hashType, oddStrategy])

  const proof = React.useMemo<MerkleProof | null>(() => {
    if (selectedLeafIndex === null || selectedLeafIndex >= leaves.length) return null
    try {
      return generateMerkleProof(levels, selectedLeafIndex)
    } catch {
      return null
    }
  }, [levels, selectedLeafIndex, leaves.length])

  const verificationResult = React.useMemo(() => {
    if (!proof) return null
    return verifyMerkleProof(proof.leafHash, proof.auditPath, root.hash, hashType)
  }, [proof, root.hash, hashType])

  // Walkthrough/debug controls
  const [verificationStep, setVerificationStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Sync / Reset verification steps when selected leaf changes
  useEffect(() => {
    setVerificationStep(0)
    setIsPlaying(false)
  }, [selectedLeafIndex])

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isPlaying && proof) {
      timer = setInterval(() => {
        setVerificationStep((prev) => {
          if (prev >= proof.auditPath.length) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 2000)
    }
    return () => clearInterval(timer)
  }, [isPlaying, proof])

  // Get nodes in paths
  const proofHighlightIds = React.useMemo(() => {
    if (selectedLeafIndex === null || !proof) return { auditIds: new Set<string>(), verificationIds: new Set<string>() }
    
    const auditIds = new Set<string>()
    const verificationIds = new Set<string>()

    let currentIndex = selectedLeafIndex
    verificationIds.add(`0-${currentIndex}`)

    for (let i = 0; i < levels.length - 1; i++) {
      const isOdd = currentIndex % 2 !== 0
      const siblingIndex = isOdd ? currentIndex - 1 : currentIndex + 1
      
      if (siblingIndex < levels[i].length) {
        auditIds.add(`${i}-${siblingIndex}`)
      }
      
      currentIndex = Math.floor(currentIndex / 2)
      verificationIds.add(`${i + 1}-${currentIndex}`)
    }

    return { auditIds, verificationIds }
  }, [levels, selectedLeafIndex, proof])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(text)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const handleAddLeaf = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newLeafValue.trim()
    if (!trimmed) return
    setLeaves([...leaves, trimmed])
    setNewLeafValue('')
  }

  const handleDeleteLeaf = (index: number) => {
    const updated = leaves.filter((_, idx) => idx !== index)
    setLeaves(updated)
    if (selectedLeafIndex === index) {
      setSelectedLeafIndex(null)
    } else if (selectedLeafIndex !== null && selectedLeafIndex > index) {
      setSelectedLeafIndex(selectedLeafIndex - 1)
    }
  }

  const handleUpdateLeaf = (index: number, val: string) => {
    const updated = [...leaves]
    updated[index] = val
    setLeaves(updated)
  }

  const selectPreset = (presetLeaves: string[]) => {
    setLeaves(presetLeaves)
    setSelectedLeafIndex(null)
    setSelectedNode(null)
  }

  // Calculate positions for rendering connections in SVG
  const rowHeight = 110
  const totalLevels = levels.length

  const getNodeCoords = (level: number, index: number, totalInLevel: number) => {
    const top = (totalLevels - 1 - level) * rowHeight + 50
    // percentage horizontally
    const left = ((index + 0.5) / totalInLevel) * 100
    return { left, top }
  }

  // Active computed verification path elements for visual step-by-step debug
  const activeVerificationStepCoords = React.useMemo(() => {
    if (selectedLeafIndex === null || !proof || !verificationResult) return null

    const path: { left: number; top: number; hash: string; label: string; level: number }[] = []
    let currentIndex = selectedLeafIndex

    for (let i = 0; i < levels.length; i++) {
      const coords = getNodeCoords(i, currentIndex, levels[i].length)
      const hashVal = verificationResult.computedHashes[i] || ''
      path.push({
        ...coords,
        hash: hashVal,
        label: i === levels.length - 1 ? 'Root' : `Step ${i}`,
        level: i
      })
      currentIndex = Math.floor(currentIndex / 2)
    }
    return path
  }, [levels, selectedLeafIndex, proof, verificationResult])

  return (
    <div className="space-y-8">
      {/* Configuration & Presets Header Card */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* presets */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 col-span-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            Presets & Templates
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Select a template below to pre-populate the tree leaves.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PRESETS.map((preset) => {
              const Icon = preset.icon
              return (
                <button
                  key={preset.name}
                  onClick={() => selectPreset(preset.leaves)}
                  className="flex flex-col items-start rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left transition hover:border-teal-500 hover:bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-teal-700 dark:hover:bg-zinc-900/40"
                >
                  <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <span className="mt-2 text-xs font-bold text-zinc-900 dark:text-white">
                    {preset.name}
                  </span>
                  <span className="mt-1 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {preset.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Global Settings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Tree Settings</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Customize tree settings and algorithms.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Hashing Algorithm
              </label>
              <select
                value={hashType}
                onChange={(e) => setHashType(e.target.value as HashType)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="sha256">SHA-256 (Standard)</option>
                <option value="sha512">SHA-512 (Secure)</option>
                <option value="md5">MD5 (Deprecated)</option>
                <option value="sha3">SHA3-256 (Modern)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Odd Node Strategy
              </label>
              <select
                value={oddStrategy}
                onChange={(e) => setOddStrategy(e.target.value as OddStrategy)}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                <option value="duplicate">Duplicate last node (Bitcoin)</option>
                <option value="promote">Promote last node (IPFS / Git)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaf Node Manager Sidebar */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col h-[580px]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Leaves ({leaves.length})</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage input blocks.</p>
            </div>
            {selectedLeafIndex !== null && (
              <button
                onClick={() => setSelectedLeafIndex(null)}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Leaf editor scroll container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 py-4 pr-1">
            {leaves.map((leaf, index) => {
              const isSelected = selectedLeafIndex === index
              return (
                <div
                  key={index}
                  onClick={() => setSelectedLeafIndex(index)}
                  className={`group relative flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/15'
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                    {index}
                  </div>
                  <input
                    type="text"
                    value={leaf}
                    onChange={(e) => handleUpdateLeaf(index, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-transparent text-xs text-zinc-900 dark:text-white focus:outline-none"
                    placeholder={`Leaf ${index} data...`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteLeaf(index)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition shrink-0"
                    title="Delete leaf"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}

            {leaves.length === 0 && (
              <div className="text-center py-8 text-xs text-zinc-500 dark:text-zinc-400">
                No leaf nodes. Add a leaf node below.
              </div>
            )}
          </div>

          {/* Add leaf form */}
          <form onSubmit={handleAddLeaf} className="flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <input
              type="text"
              value={newLeafValue}
              onChange={(e) => setNewLeafValue(e.target.value)}
              placeholder="Add new transaction/data..."
              className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
              title="Add leaf"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Tree Visualizer Main Workspace */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 lg:col-span-2 flex flex-col h-[580px] relative overflow-hidden">
          <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Merkle Tree Structure</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Interactive node visualizer. Hover for details, select a leaf node on the left to verify the path.
            </p>
          </div>

          {/* Diagram Workspace */}
          <div className="flex-1 relative overflow-auto select-none pt-4">
            {/* Height calculated container */}
            <div
              className="mx-auto relative min-w-[500px]"
              style={{ height: `${totalLevels * rowHeight}px` }}
            >
              {/* Connection vector lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {levels.map((level, levelIdx) => {
                  if (levelIdx === totalLevels - 1) return null // Root has no parent
                  
                  return level.map((node, nodeIdx) => {
                    const parentIdx = Math.floor(nodeIdx / 2)
                    const parentNode = levels[levelIdx + 1]?.[parentIdx]
                    if (!parentNode) return null

                    const start = getNodeCoords(levelIdx, nodeIdx, level.length)
                    const end = getNodeCoords(levelIdx + 1, parentIdx, levels[levelIdx + 1].length)

                    // Determine connection path status for high lighting
                    const isVerificationLink =
                      selectedLeafIndex !== null &&
                      proofHighlightIds.verificationIds.has(node.id) &&
                      proofHighlightIds.verificationIds.has(parentNode.id)

                    const isAuditLink =
                      selectedLeafIndex !== null &&
                      proofHighlightIds.auditIds.has(node.id)

                    let strokeColor = 'stroke-zinc-200 dark:stroke-zinc-800'
                    let strokeWidth = '1.5'
                    let strokeDash = ''

                    if (isVerificationLink) {
                      strokeColor = 'stroke-teal-500 dark:stroke-teal-400'
                      strokeWidth = '3.5'
                    } else if (isAuditLink) {
                      strokeColor = 'stroke-amber-500'
                      strokeWidth = '2'
                      strokeDash = '3 3'
                    }

                    return (
                      <line
                        key={`${node.id}-to-${parentNode.id}`}
                        x1={`${start.left}%`}
                        y1={start.top}
                        x2={`${end.left}%`}
                        y2={end.top}
                        className={`${strokeColor} transition-all duration-300`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDash}
                      />
                    )
                  })
                })}
              </svg>

              {/* HTML Nodes overlay */}
              {levels.map((level, levelIdx) => (
                <div key={levelIdx}>
                  {level.map((node, nodeIdx) => {
                    const { left, top } = getNodeCoords(levelIdx, nodeIdx, level.length)
                    
                    // Style indicators based on selected states
                    const isSelectedLeaf = selectedLeafIndex !== null && node.id === `0-${selectedLeafIndex}`
                    const isVerificationNode = proofHighlightIds.verificationIds.has(node.id)
                    const isAuditNode = proofHighlightIds.auditIds.has(node.id)
                    const isClickedNode = selectedNode?.id === node.id

                    let nodeStyle = 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600'
                    let ringStyle = ''

                    if (isSelectedLeaf) {
                      nodeStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold'
                      ringStyle = 'ring-2 ring-emerald-400 dark:ring-emerald-600'
                    } else if (isVerificationNode) {
                      nodeStyle = 'border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/30 dark:text-teal-400 font-semibold'
                      ringStyle = 'ring-1 ring-teal-400 dark:ring-teal-600'
                    } else if (isAuditNode) {
                      nodeStyle = 'border-amber-500 bg-amber-50/50 text-amber-800 dark:border-amber-500 dark:bg-amber-950/20 dark:text-amber-400 font-medium'
                      ringStyle = 'ring-1 ring-amber-400'
                    }

                    if (isClickedNode) {
                      ringStyle += ' ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-zinc-900'
                    }

                    if (node.isDuplicated) {
                      nodeStyle += ' border-dashed border-zinc-400 opacity-60 dark:border-zinc-600'
                    }

                    return (
                      <motion.div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`absolute rounded-xl border px-3 py-2 cursor-pointer text-center select-none shadow-sm flex flex-col justify-center transition-all ${nodeStyle} ${ringStyle}`}
                        style={{
                          left: `${left}%`,
                          top: `${top}px`,
                          transform: 'translate(-50%, -50%)',
                          width: '120px',
                          height: '52px',
                        }}
                        whileHover={{ scale: 1.05 }}
                        layout
                      >
                        <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                          {node.type === 'root' ? 'Root' : node.label}
                        </div>
                        <div className="text-xs font-mono truncate mt-0.5" title={node.hash}>
                          {node.hash.slice(0, 8)}...
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawers */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Node Details: {selectedNode.label}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Detailed inspection of tree block.
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-3">
              <div className="col-span-2 space-y-3">
                <div>
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 block uppercase">
                    Full cryptographic hash ({hashType})
                  </span>
                  <div className="mt-1.5 flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
                    <span className="text-zinc-800 dark:text-zinc-200 break-all select-all select-text">
                      {selectedNode.hash}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedNode.hash)}
                      className="ml-3 text-zinc-400 hover:text-teal-600 transition shrink-0"
                      title="Copy full hash"
                    >
                      {copiedHash === selectedNode.hash ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {selectedNode.type === 'leaf' && (
                  <div>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 block uppercase">
                      Raw leaf message
                    </span>
                    <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-mono">
                      "{selectedNode.value}"
                    </div>
                  </div>
                )}

                {selectedNode.type !== 'leaf' && (
                  <div>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 block uppercase">
                      Hashing computation formula
                    </span>
                    <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 font-mono">
                      Hash = {hashType.toUpperCase()}({' '}
                      {selectedNode.leftId ? `Node[${selectedNode.leftId}]` : ''}
                      {selectedNode.rightId ? ` + Node[${selectedNode.rightId}]` : ''} )
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-zinc-100 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0 dark:border-zinc-800 text-xs">
                <div>
                  <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase">Node Type</span>
                  <span className="capitalize text-zinc-900 dark:text-white font-medium">{selectedNode.type}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase">Height Level</span>
                  <span className="text-zinc-900 dark:text-white font-medium">{selectedNode.level}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 dark:text-zinc-500 block uppercase">Index at Level</span>
                  <span className="text-zinc-900 dark:text-white font-medium">{selectedNode.index}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merkle Proof Walkthrough & interactive debugger */}
      <AnimatePresence>
        {selectedLeafIndex !== null && proof && verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  Merkle Proof Verification Debugger
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500 border border-emerald-500/20 font-bold">
                    Interactive
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verify Leaf {selectedLeafIndex} ("{proof.leafValue}") matches the tree root hash.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVerificationStep(0)}
                  disabled={verificationStep === 0}
                  className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/50 disabled:opacity-40"
                  title="Reset trace"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause Auto
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> Auto-Play
                    </>
                  )}
                </button>
                <button
                  onClick={() => setVerificationStep((prev) => Math.min(prev + 1, proof.auditPath.length))}
                  disabled={verificationStep >= proof.auditPath.length}
                  className="rounded-lg border border-zinc-200 bg-white p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/50 disabled:opacity-40"
                  title="Step forward"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Verification walk through layout */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {/* Left sidebar listing proof steps */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Audit Path (Sibling Hashes)
                </h4>

                <div className="space-y-2">
                  {/* Step 0 initialization */}
                  <div
                    onClick={() => setVerificationStep(0)}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      verificationStep === 0
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/20'
                    }`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                      0
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Start with leaf hash</span>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5 truncate w-[180px]">
                        {proof.leafHash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  {/* Sibling combinators */}
                  {proof.auditPath.map((step, idx) => {
                    const stepNum = idx + 1
                    const isActive = verificationStep === stepNum
                    const isCompleted = verificationStep > stepNum

                    return (
                      <div
                        key={idx}
                        onClick={() => setVerificationStep(stepNum)}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          isActive
                            ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20'
                            : isCompleted
                            ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 opacity-70'
                            : 'border-zinc-100 bg-zinc-50/10 dark:border-zinc-800/20 opacity-40'
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                            : 'bg-teal-500/10 text-teal-500'
                        }`}>
                          {stepNum}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">
                            Combine with {step.label}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                            <span className="rounded bg-zinc-200 px-1 dark:bg-zinc-800 font-semibold">
                              {step.isLeft ? 'Left sibling' : 'Right sibling'}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400 mt-1 truncate w-[180px]">
                            {step.hash.slice(0, 16)}...
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Main detail container */}
              <div className="md:col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/20 flex flex-col justify-between min-h-[300px]">
                {/* Step trace display */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      Step {verificationStep} of {proof.auditPath.length}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {verificationStep === 0
                        ? 'Leaf initialization'
                        : verificationStep === proof.auditPath.length
                        ? 'Root comparison'
                        : `Level ${verificationStep} pairing`}
                    </span>
                  </div>

                  {verificationStep === 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Begin proof verification. Calculate the initial hash of the leaf value.
                      </p>
                      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60 font-mono space-y-1">
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                          Formula
                        </div>
                        <div className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">
                          Hash0 = {hashType.toUpperCase()}("{proof.leafValue}")
                        </div>
                        <div className="text-[10px] text-teal-600 dark:text-teal-400 break-all select-all font-bold pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                          {proof.leafHash}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const stepIndex = verificationStep - 1
                        const step = proof.auditPath[stepIndex]
                        const prevHash = verificationResult.computedHashes[stepIndex]
                        const nextHash = verificationResult.computedHashes[verificationStep]

                        const leftHash = step.isLeft ? step.hash : prevHash
                        const rightHash = step.isLeft ? prevHash : step.hash

                        return (
                          <>
                            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 font-sans">
                              Pair the hash computed from the previous step with the sibling hash from the audit path, and execute the secure hash function.
                            </p>
                            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60 font-mono space-y-2">
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                  Left Sibling
                                </span>
                                <div className="text-xs truncate font-semibold dark:text-zinc-300" title={leftHash}>
                                  {leftHash.slice(0, 32)}...
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                  Right Sibling
                                </span>
                                <div className="text-xs truncate font-semibold dark:text-zinc-300" title={rightHash}>
                                  {rightHash.slice(0, 32)}...
                                </div>
                              </div>
                              <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-2.5">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                  Parent Hash Output
                                </span>
                                <div className="text-xs text-teal-600 dark:text-teal-400 break-all select-all font-bold mt-0.5">
                                  {nextHash}
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Final status row */}
                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 mt-4 flex items-center justify-between">
                  {verificationStep === proof.auditPath.length ? (
                    <div className="flex items-center gap-2 w-full rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-emerald-800 dark:text-emerald-400">
                      {verificationResult.verified ? (
                        <>
                          <CheckCircle className="h-5 w-5 shrink-0" />
                          <div className="text-xs font-sans">
                            <strong className="block font-bold">Proof Verified Successfully!</strong>
                            The calculated hash matches the Merkle Root. This guarantees the data block is authentic and unaltered inside the ledger.
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                          <div className="text-xs font-sans text-red-600 dark:text-red-400">
                            <strong className="block font-bold">Proof Verification Failed</strong>
                            Computed root does not match the actual tree root. The data may have been tampered with.
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                      <Info className="h-4 w-4 text-teal-500" />
                      <span>
                        Run auto-play or step manually to complete path reconstruction.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
