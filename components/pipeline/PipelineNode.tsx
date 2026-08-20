'use client';

import React, { useState } from 'react';
import { NodeModel, SocketType } from '@/lib/pipeline/dagEngine';

const socketColors: Record<SocketType, string> = {
  KEY: 'bg-red-500',
  IV: 'bg-yellow-500',
  DATA: 'bg-blue-500',
  HASH: 'bg-purple-500',
  SIGNATURE: 'bg-emerald-500',
};

export const PipelineNode = ({ node }: { node: NodeModel }) => {
  const [inspectingSocket, setInspectingSocket] = useState<string | null>(null);

  return (
    <div 
      className="absolute bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-72 text-slate-100 select-none backdrop-blur-md"
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
    >
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">{node.label}</h4>
        <span className="text-[10px] text-slate-500 font-mono">{node.type}</span>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Inputs Sockets */}
        <div className="space-y-2">
          {node.inputs.map((socket) => (
            <div key={socket.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${socketColors[socket.type]} border border-slate-950`} />
              <span className="text-slate-300">{socket.name}</span>
            </div>
          ))}
        </div>

        {/* Outputs Sockets with Inspector Trigger */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {node.outputs.map((socket) => (
            <div 
              key={socket.id} 
              className="flex items-center justify-between cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
              onClick={() => setInspectingSocket(inspectingSocket === socket.id ? null : socket.id)}
            >
              <span className="text-slate-300">{socket.name}</span>
              <div className={`w-3 h-3 rounded-full ${socketColors[socket.type]} border border-slate-950`} />
            </div>
          ))}
        </div>

        {/* In-Node Data Inspector */}
        {inspectingSocket && (
          <div className="mt-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] text-teal-300 space-y-1">
            <p className="font-bold text-slate-400 uppercase">Buffer State (Hex/ASCII):</p>
            <p className="break-all">48656c6c6f20576f726c64...</p>
          </div>
        )}
      </div>
    </div>
  );
};
