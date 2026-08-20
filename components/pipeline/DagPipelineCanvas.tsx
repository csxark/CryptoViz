'use client';

import React, { useState } from 'react';
import { PipelineNode } from './PipelineNode';
import { PipelineGraph, evaluateDag } from '@/lib/pipeline/dagEngine';

export const DagPipelineCanvas = () => {
  const [graph, setGraph] = useState<PipelineGraph>({
    nodes: [
      { id: '1', type: 'input', label: 'Plaintext Input', inputs: [], outputs: [{ id: 'o1', name: 'Data', type: 'DATA' }], position: { x: 50, y: 100 } },
      { id: '2', type: 'kdf', label: 'HKDF Key Derivation', inputs: [{ id: 'i1', name: 'Secret', type: 'KEY' }], outputs: [{ id: 'o2', name: 'Enc Key', type: 'KEY' }], position: { x: 400, y: 100 } }
    ],
    connections: []
  });

  const loadTemplate = (templateName: string) => {
    // Loads pre-built layouts for Hybrid Encryption, TLS 1.3 Record Layer, etc.
  };

  return (
    <div className="relative w-full h-[80vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
      {/* Template Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button onClick={() => loadTemplate('hybrid')} className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl transition-colors">
          Hybrid Encryption Template
        </button>
        <button onClick={() => loadTemplate('tls')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition-colors">
          TLS 1.3 Record Layer
        </button>
      </div>

      {/* SVG Wire Layer */}
      <svg className="absolute inset-w-full inset-h-full pointer-events-none z-0">
        {/* Render interactive bezier curves connecting sockets */}
      </svg>

      {/* Nodes Layer */}
      <div className="relative w-full h-full">
        {graph.nodes.map((node) => (
          <PipelineNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};
