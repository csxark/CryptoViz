import React, { useState } from 'react';
import { CipherBenchmarkData, HardwareArchitecture, normalizeMetrics } from '@/lib/benchmark/radarMetrics';

interface CipherRadarChartProps {
  availableCiphers: CipherBenchmarkData[];
}

const AXES = [
  { key: 'throughput', label: 'Throughput' },
  { key: 'memoryFootprint', label: 'Low RAM' },
  { key: 'setupLatency', label: 'Fast Setup' },
  { key: 'blockSize', label: 'Block Size' },
  { key: 'securityBits', label: 'Security Bits' },
  { key: 'codeFootprint', label: 'Compact Code' },
];

const COLORS = ['#636efa', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function CipherRadarChart({ availableCiphers }: CipherRadarChartProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    availableCiphers[0]?.id || 'aes-128',
    availableCiphers[1]?.id || 'chacha20',
    availableCiphers[2]?.id || 'ascon-128',
  ].filter(Boolean));

  const [architecture, setArchitecture] = useState<HardwareArchitecture>('mobile-arm64');

  const selectedCiphers = availableCiphers.filter(c => selectedIds.includes(c.id));
  const normalizedScores = normalizeMetrics(selectedCiphers, availableCiphers, architecture);

  const toggleCipher = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length < 5) setSelectedIds([...selectedIds, id]);
    }
  };

  // SVG Radar Geometry Calculations
  const size = 400;
  const center = size / 2;
  const radius = size * 0.38;
  const numAxes = AXES.length;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  return (
    <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm font-inter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold font-playfair">Multi-Dimensional Hardware Cryptography Radar</h2>
          <p className="text-xs text-neutral-500 mt-1">Compare up to 5 ciphers simultaneously across normalized hardware axes.</p>
        </div>

        {/* Hardware Architecture Preset Selector */}
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl text-xs font-medium">
          {(['embedded-8bit', 'mobile-arm64', 'desktop-x86'] as HardwareArchitecture[]).map(arch => (
            <button
              key={arch}
              onClick={() => setArchitecture(arch)}
              className={`px-3 py-1.5 rounded-lg transition ${architecture === arch ? 'bg-white dark:bg-neutral-700 shadow-sm font-bold text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
            >
              {arch === 'embedded-8bit' ? '8-bit MCU' : arch === 'mobile-arm64' ? 'ARM64' : 'x86-64 AVX2'}
            </button>
          ))}
        </div>
      </div>

      {/* Cipher Selection Drawer / Pills */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-2">Select Ciphers (Max 5):</span>
        {availableCiphers.map((cipher, idx) => {
          const isSelected = selectedIds.includes(cipher.id);
          const colorIdx = selectedIds.indexOf(cipher.id);
          return (
            <button
              key={cipher.id}
              onClick={() => toggleCipher(cipher.id)}
              style={isSelected ? { borderColor: COLORS[colorIdx], backgroundColor: `${COLORS[colorIdx]}15` } : {}}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${isSelected ? 'border-2' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500'}`}
            >
              {isSelected && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[colorIdx] }} />}
              {cipher.name}
            </button>
          );
        })}
      </div>

      {/* Interactive Radar Canvas & Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 flex justify-center bg-neutral-50 dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <svg width={size} height={size} className="overflow-visible">
            {/* Background Web Grids */}
            {[0.25, 0.5, 0.75, 1.0].map((level, lIdx) => (
              <polygon
                key={lIdx}
                points={AXES.map((_, i) => {
                  const pt = getCoordinates(i, level * 100);
                  return `${pt.x},${pt.y}`;
                }).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.15}
                strokeDasharray={lIdx < 3 ? '2 2' : undefined}
              />
            ))}

            {/* Axis Lines */}
            {AXES.map((axis, i) => {
              const outerPt = getCoordinates(i, 100);
              return (
                <g key={axis.key}>
                  <line x1={center} y1={center} x2={outerPt.x} y2={outerPt.y} stroke="currentColor" strokeOpacity={0.2} />
                  <text
                    x={outerPt.x + (i === 0 || i === 3 ? 0 : i < 3 ? 15 : -15)}
                    y={outerPt.y + (i === 0 ? -10 : i === 3 ? 20 : 5)}
                    textAnchor={i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end'}
                    className="text-[10px] font-bold fill-neutral-500"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

            {/* Overlapping Cipher Polygons */}
            {selectedCiphers.map((cipher, cIdx) => {
              const scores = normalizedScores[cIdx];
              const points = AXES.map((axis, i) => {
                const pt = getCoordinates(i, scores[axis.key] || 0);
                return `${pt.x},${pt.y}`;
              }).join(' ');

              const color = COLORS[cIdx % COLORS.length];

              return (
                <g key={cipher.id}>
                  <polygon points={points} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2.5} />
                  {AXES.map((axis, i) => {
                    const pt = getCoordinates(i, scores[axis.key] || 0);
                    return <circle key={axis.key} cx={pt.x} cy={pt.y} r={4} fill={color} />;
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend & Summary Metrics */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Active Comparison Legend</h3>
          {selectedCiphers.map((cipher, idx) => (
            <div key={cipher.id} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="font-bold">{cipher.name}</span>
              </div>
              <span className="text-neutral-500 font-mono">Throughput: {cipher.throughput} MB/s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
