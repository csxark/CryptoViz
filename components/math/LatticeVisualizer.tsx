"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Vector2D,
  vectorAdd,
  vectorScale,
  generateLatticePoints,
  cvpNearestPoint,
} from "../../lib/math/lattice";

interface LatticeVisualizerProps {
  className?: string;
}

export default function LatticeVisualizer({ className }: LatticeVisualizerProps) {
  const [b1, setB1] = useState<Vector2D>([2, 1]);
  const [b2, setB2] = useState<Vector2D>([1, 2]);
  const [target, setTarget] = useState<Vector2D>([3.5, 4.2]);
  const [isGoodBasis, setIsGoodBasis] = useState(true);

  // SVG coordinate system helpers
  const viewBoxSize = 20;
  const scale = 20; // 1 unit = 20px
  const svgCenter = viewBoxSize * scale / 2;

  const toSvgX = (x: number) => svgCenter + x * scale;
  const toSvgY = (y: number) => svgCenter - y * scale;

  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction: Drag target point
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.target.releasePointerCapture(e.pointerId); // we manage this ourselves via window if needed, or just let it drag
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Reverse scale
    const newX = (x - svgCenter) / scale;
    const newY = (svgCenter - y) / scale;
    setTarget([Math.round(newX * 10) / 10, Math.round(newY * 10) / 10]);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Pre-generate lattice points
  const points = useMemo(() => {
    return generateLatticePoints(b1, b2, 8); // 8x8 grid in all directions
  }, [b1, b2]);

  // CVP calculation
  const nearestPoint = useMemo(() => {
    try {
      return cvpNearestPoint(target, b1, b2);
    } catch {
      return null;
    }
  }, [target, b1, b2]);

  const det = b1[0] * b2[1] - b1[1] * b2[0];
  const isValidBasis = Math.abs(det) > 1e-9;

  // Render Fundamental Domain polygon
  const domainPoints = useMemo(() => {
    const origin = [0, 0];
    const p1 = b1;
    const p2 = vectorAdd(b1, b2);
    const p3 = b2;
    return `${toSvgX(origin[0])},${toSvgY(origin[1])} ${toSvgX(p1[0])},${toSvgY(p1[1])} ${toSvgX(p2[0])},${toSvgY(p2[1])} ${toSvgX(p3[0])},${toSvgY(p3[1])}`;
  }, [b1, b2]);

  const setGoodBasis = () => {
    setB1([2, 1]);
    setB2([1, 2]);
    setIsGoodBasis(true);
  };

  const setBadBasis = () => {
    // Same lattice, different basis (e.g. b1' = b1 + 2*b2, b2' = b2)
    // det(new) = det(old) = 3
    setB1([4, 5]);
    setB2([1, 2]);
    setIsGoodBasis(false);
  };

  return (
    <div className={`flex flex-col gap-6 ${className || ""}`}>
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          Geometric Lattice & Nearest Vector Problem (NVP / CVP)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              A lattice is a set of points defined by integer combinations of basis vectors.
              In cryptography (like LWE/NTRU), solving the Closest Vector Problem (CVP) is hard if you only have a "bad" (skewed) basis, but easy with a "good" (orthogonal-like) basis.
            </p>

            <div className="flex gap-2">
              <button 
                onClick={setGoodBasis}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors border ${isGoodBasis ? 'bg-teal-600 text-white border-teal-600' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'}`}
              >
                Use Good Basis
              </button>
              <button 
                onClick={setBadBasis}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors border ${!isGoodBasis ? 'bg-amber-600 text-white border-amber-600' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'}`}
              >
                Use Bad Basis
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Basis Vector v1 (x, y)</label>
                <div className="flex gap-2">
                  <input type="number" value={b1[0]} onChange={e => setB1([parseFloat(e.target.value) || 0, b1[1]])} className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-950 text-sm dark:border-zinc-800" />
                  <input type="number" value={b1[1]} onChange={e => setB1([b1[0], parseFloat(e.target.value) || 0])} className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-950 text-sm dark:border-zinc-800" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-500">Basis Vector v2 (x, y)</label>
                <div className="flex gap-2">
                  <input type="number" value={b2[0]} onChange={e => setB2([parseFloat(e.target.value) || 0, b2[1]])} className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-950 text-sm dark:border-zinc-800" />
                  <input type="number" value={b2[1]} onChange={e => setB2([b2[0], parseFloat(e.target.value) || 0])} className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-950 text-sm dark:border-zinc-800" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-mono mb-1 text-zinc-500">Target Vector (Drag point on graph)</div>
              <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                T = [{target[0]}, {target[1]}]
              </div>
              <div className="text-xs font-mono mt-3 mb-1 text-teal-600 dark:text-teal-400">Nearest Lattice Point (Babai)</div>
              <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                {nearestPoint ? `P = [${nearestPoint[0]}, ${nearestPoint[1]}]` : "Error: Invalid Basis"}
              </div>
            </div>
            
            {!isValidBasis && (
              <div className="text-xs text-red-600 font-semibold">
                Basis vectors are linearly dependent (determinant = 0). They do not span the 2D plane.
              </div>
            )}
          </div>

          <div 
            className="relative border rounded-lg border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950 touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <svg 
              ref={svgRef}
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${viewBoxSize * scale} ${viewBoxSize * scale}`} 
              className="block cursor-crosshair"
            >
              <defs>
                <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="0.5"/>
                </pattern>
                <marker id="arrowHeadV1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#0d9488" />
                </marker>
                <marker id="arrowHeadV2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#db2777" />
                </marker>
              </defs>
              
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Axes */}
              <line x1={0} y1={svgCenter} x2={viewBoxSize * scale} y2={svgCenter} stroke="currentColor" strokeWidth="1" className="text-zinc-300 dark:text-zinc-700" />
              <line x1={svgCenter} y1={0} x2={svgCenter} y2={viewBoxSize * scale} stroke="currentColor" strokeWidth="1" className="text-zinc-300 dark:text-zinc-700" />

              {isValidBasis && (
                <>
                  {/* Fundamental Domain */}
                  <polygon points={domainPoints} fill="rgba(13, 148, 136, 0.1)" stroke="#0d9488" strokeWidth="1" strokeDasharray="4 2" />
                  
                  {/* Lattice Points */}
                  {points.map((p, i) => (
                    <circle 
                      key={i} 
                      cx={toSvgX(p[0])} 
                      cy={toSvgY(p[1])} 
                      r="2.5" 
                      className="fill-zinc-400 dark:fill-zinc-500" 
                    />
                  ))}
                  
                  {/* Basis Vectors */}
                  <line x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(b1[0])} y2={toSvgY(b1[1])} stroke="#0d9488" strokeWidth="2.5" markerEnd="url(#arrowHeadV1)" />
                  <line x1={toSvgX(0)} y1={toSvgY(0)} x2={toSvgX(b2[0])} y2={toSvgY(b2[1])} stroke="#db2777" strokeWidth="2.5" markerEnd="url(#arrowHeadV2)" />
                  
                  {/* Target Vector */}
                  <circle cx={toSvgX(target[0])} cy={toSvgY(target[1])} r="5" fill="#f59e0b" onPointerDown={handlePointerDown} className="cursor-grab hover:scale-110 transition-transform" />
                  
                  {/* Nearest Point */}
                  {nearestPoint && (
                    <>
                      <circle cx={toSvgX(nearestPoint[0])} cy={toSvgY(nearestPoint[1])} r="4" fill="#ef4444" />
                      <line x1={toSvgX(target[0])} y1={toSvgY(target[1])} x2={toSvgX(nearestPoint[0])} y2={toSvgY(nearestPoint[1])} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                    </>
                  )}
                </>
              )}
            </svg>
            
            <div className="absolute top-2 right-2 flex flex-col gap-1.5 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur rounded border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0d9488]"></span> Basis v1</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#db2777]"></span> Basis v2</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Target (A*s + e)</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Nearest Point (A*s)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
