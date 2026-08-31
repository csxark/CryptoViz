'use client'

import React, { useState } from 'react'
import { NodeModel, SocketType } from '@/lib/pipeline/dagEngine'

const socketColors: Record<SocketType, string> = {
  KEY: 'bg-red-500',
  IV: 'bg-yellow-500',
  DATA: 'bg-blue-500',
  HASH: 'bg-purple-500',
  SIGNATURE: 'bg-emerald-500',
}

export const PipelineNode = ({ node }: { node: NodeModel }) => {
  const [inspectingSocket, setInspectingSocket] = useState<string | null>(null)

  return (
    <div
      role="group"
      aria-label={`${node.label} ${node.type} pipeline node`}
      className="absolute w-72 select-none rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-xl backdrop-blur-md"
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">{node.label}</h4>
        <span className="font-mono text-[10px] text-slate-500">{node.type}</span>
      </div>

      <div className="space-y-4 p-4 text-xs">
        <div role="group" aria-label={`${node.label} inputs`} className="space-y-2">
          {node.inputs.map((socket) => (
            <div key={socket.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-3 w-3 rounded-full border border-slate-950 ${socketColors[socket.type]}`}
              />
              <span className="text-slate-300">{socket.name}</span>
              <span className="sr-only">{socket.type} input</span>
            </div>
          ))}
        </div>

        <div role="group" aria-label={`${node.label} outputs`} className="space-y-2 border-t border-slate-800 pt-2">
          {node.outputs.map((socket) => {
            const expanded = inspectingSocket === socket.id
            return (
              <button
                key={socket.id}
                type="button"
                aria-expanded={expanded}
                aria-controls={`${node.id}-${socket.id}-inspector`}
                aria-label={`${socket.name} ${socket.type} output${expanded ? ', inspector expanded' : ''}`}
                className="flex w-full items-center justify-between rounded p-1 text-left transition-colors hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-teal-400"
                onClick={() => setInspectingSocket(expanded ? null : socket.id)}
              >
                <span className="text-slate-300">{socket.name}</span>
                <span aria-hidden="true" className={`h-3 w-3 rounded-full border border-slate-950 ${socketColors[socket.type]}`} />
              </button>
            )
          })}
        </div>

        {inspectingSocket && (
          <div
            id={`${node.id}-${inspectingSocket}-inspector`}
            role="status"
            aria-live="polite"
            className="mt-2 space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] text-teal-300"
          >
            <p className="font-bold uppercase text-slate-400">Buffer State (Hex/ASCII):</p>
            <p className="break-all">48656c6c6f20576f726c64...</p>
          </div>
        )}
      </div>
    </div>
  )
}
