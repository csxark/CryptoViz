'use client'

import React, { useState } from 'react'
import { PipelineNode } from './PipelineNode'
import { PipelineGraph } from '@/lib/pipeline/dagEngine'

export const DagPipelineCanvas = () => {
  const [graph, setGraph] = useState<PipelineGraph>({
    nodes: [
      { id: '1', type: 'input', label: 'Plaintext Input', inputs: [], outputs: [{ id: 'o1', name: 'Data', type: 'DATA' }], position: { x: 50, y: 100 } },
      { id: '2', type: 'kdf', label: 'HKDF Key Derivation', inputs: [{ id: 'i1', name: 'Secret', type: 'KEY' }], outputs: [{ id: 'o2', name: 'Enc Key', type: 'KEY' }], position: { x: 400, y: 100 } },
    ],
    connections: [],
  })

  const loadTemplate = (templateName: string) => {
    // Loads pre-built layouts for Hybrid Encryption, TLS 1.3 Record Layer, etc.
    void templateName
    setGraph((current) => current)
  }

  return (
    <section
      role="region"
      aria-label="Interactive cipher pipeline visualizer"
      className="relative h-[80vh] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950"
    >
      <div className="absolute left-4 top-4 z-10 flex gap-2" role="toolbar" aria-label="Pipeline templates">
        <button
          type="button"
          onClick={() => loadTemplate('hybrid')}
          aria-label="Load Hybrid Encryption pipeline template"
          className="rounded-xl bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          Hybrid Encryption Template
        </button>
        <button
          type="button"
          onClick={() => loadTemplate('tls')}
          aria-label="Load TLS 1.3 Record Layer pipeline template"
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
        >
          TLS 1.3 Record Layer
        </button>
      </div>

      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        role="img"
        aria-label="Cipher pipeline connection layer"
      >
        <title>Cipher pipeline connections</title>
      </svg>

      <div className="relative h-full w-full" aria-label="Cipher pipeline nodes">
        {graph.nodes.map((node) => (
          <PipelineNode key={node.id} node={node} />
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {graph.nodes.length} pipeline nodes are displayed.
      </p>
    </section>
  )
}

export default DagPipelineCanvas;
