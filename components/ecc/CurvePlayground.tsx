'use client'

import { useMemo, useState } from 'react'
import {
  type Curve,
  type CurvePoint,
  isValidCurve,
  enumeratePoints,
  pointAdd,
  scalarMultiply,
  scalarMultiplySteps,
  pointOrder,
} from '@/lib/ecc/curveArithmetic'

const keyOf = (p: CurvePoint) => (p === null ? '∞' : `${p.x},${p.y}`)
const label = (p: CurvePoint) => (p === null ? 'O (∞)' : `(${p.x}, ${p.y})`)

type Mode = 'add' | 'scalar'

export default function CurvePlayground() {
  const [a, setA] = useState(2)
  const [b, setB] = useState(2)
  const [p, setP] = useState(17)
  const [mode, setMode] = useState<Mode>('add')
  const [pIdx, setPIdx] = useState(1)
  const [qIdx, setQIdx] = useState(2)
  const [k, setK] = useState(3)

  const curve: Curve = { a: BigInt(a), b: BigInt(b), p: BigInt(p) }
  const valid = isValidCurve(curve)

  const affine = useMemo(
    () => (valid ? enumeratePoints(curve).filter((pt): pt is { x: bigint; y: bigint } => pt !== null) : []),
    [a, b, p, valid],
  )
  const groupSize = affine.length + 1 // + point at infinity

  const P = affine[Math.min(pIdx, affine.length - 1)] ?? null
  const Q = affine[Math.min(qIdx, affine.length - 1)] ?? null

  const sum = useMemo(() => (valid ? pointAdd(P, Q, curve) : null), [P, Q, a, b, p, valid])
  const kP = useMemo(() => (valid ? scalarMultiply(BigInt(k), P, curve) : null), [k, P, a, b, p, valid])
  const orbit = useMemo(
    () => (valid && P ? scalarMultiplySteps(BigInt(k), P, curve) : []),
    [k, P, a, b, p, valid],
  )
  const basePointOrder = useMemo(() => (valid && P ? pointOrder(P, curve) : 0), [P, a, b, p, valid])

  // Highlight sets for the scatter.
  const highlight = new Map<string, string>()
  if (mode === 'add') {
    if (P) highlight.set(keyOf(P), '#38bdf8') // blue
    if (Q) highlight.set(keyOf(Q), '#34d399') // green
    if (sum) highlight.set(keyOf(sum), '#f59e0b') // amber
  } else {
    orbit.forEach((pt) => { if (pt) highlight.set(keyOf(pt), '#a78bfa') }) // violet orbit
    if (P) highlight.set(keyOf(P), '#38bdf8')
    if (kP) highlight.set(keyOf(kP), '#f59e0b')
  }

  // SVG grid geometry.
  const SIZE = 460
  const pad = 34
  const step = (SIZE - pad * 2) / Math.max(1, p - 1)
  const sx = (x: number) => pad + x * step
  const sy = (y: number) => SIZE - pad - y * step

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Elliptic-Curve Point-Arithmetic Playground</h1>
        <p className="text-sm text-slate-400">
          The geometry behind ECDSA, ECDH and X25519. Explore the group law on
          <code> y² = x³ + a·x + b (mod p)</code> — add points, run scalar multiplication, and
          watch a base point&apos;s orbit cycle through the whole group.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        {(['a', 'b', 'p'] as const).map((name) => (
          <label key={name} className="text-sm">{name === 'p' ? 'prime p' : name}
            <input type="number"
              className="mt-1 block w-24 rounded border border-slate-700 bg-slate-950 px-2 py-2"
              value={name === 'a' ? a : name === 'b' ? b : p}
              onChange={(e) => {
                const v = Math.max(name === 'p' ? 5 : -50, Math.min(97, +e.target.value || 0))
                if (name === 'a') setA(v); else if (name === 'b') setB(v); else setP(v)
              }} />
          </label>
        ))}
        <div className="ml-auto text-right text-xs">
          <div className={valid ? 'text-emerald-400' : 'text-red-400'}>
            {valid ? `valid curve · group order ${groupSize}` : 'singular curve (4a³+27b² ≡ 0) — pick other a,b'}
          </div>
        </div>
      </div>

      {valid && (
        <>
          <div className="flex gap-2">
            <button onClick={() => setMode('add')}
              className={`rounded px-4 py-2 text-sm ${mode === 'add' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Point addition
            </button>
            <button onClick={() => setMode('scalar')}
              className={`rounded px-4 py-2 text-sm ${mode === 'scalar' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Scalar multiplication
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full rounded-lg border border-slate-700 bg-slate-950">
              {/* grid */}
              {Array.from({ length: p }).map((_, i) => (
                <g key={i} stroke="#1e293b" strokeWidth={1}>
                  <line x1={sx(i)} y1={pad} x2={sx(i)} y2={SIZE - pad} />
                  <line x1={pad} y1={sy(i)} x2={SIZE - pad} y2={sy(i)} />
                </g>
              ))}
              {/* chord/tangent line in add mode */}
              {mode === 'add' && P && Q && (
                <line x1={sx(Number(P.x))} y1={sy(Number(P.y))} x2={sx(Number(Q.x))} y2={sy(Number(Q.y))}
                  stroke="#475569" strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              {/* points */}
              {affine.map((pt) => {
                const key = keyOf(pt)
                const color = highlight.get(key)
                return (
                  <circle key={key} cx={sx(Number(pt.x))} cy={sy(Number(pt.y))}
                    r={color ? 6 : 3} fill={color ?? '#64748b'} stroke={color ? '#0f172a' : 'none'} strokeWidth={color ? 1.5 : 0} />
                )
              })}
            </svg>

            <div className="space-y-4">
              {mode === 'add' ? (
                <>
                  <PointSelect label="P" color="#38bdf8" points={affine} idx={pIdx} onChange={setPIdx} />
                  <PointSelect label="Q" color="#34d399" points={affine} idx={qIdx} onChange={setQIdx} />
                  <div className="rounded-lg border border-amber-400/50 bg-amber-950/20 p-4">
                    <div className="text-sm text-slate-300">Group law result</div>
                    <div className="mt-1 font-mono text-lg text-amber-300">
                      {label(P)} + {label(Q)} = {label(sum)}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      The dashed line through P and Q meets the curve at a third point; its reflection
                      across the x-axis is P + Q (over F_p the line &quot;wraps&quot; modulo p).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <PointSelect label="Base point P" color="#38bdf8" points={affine} idx={pIdx} onChange={setPIdx} />
                  <label className="block text-sm">Scalar k = {k}
                    <input type="range" min={1} max={Math.max(2, basePointOrder)} value={k}
                      className="mt-2 w-full" onChange={(e) => setK(+e.target.value)} />
                  </label>
                  <div className="rounded-lg border border-amber-400/50 bg-amber-950/20 p-4">
                    <div className="font-mono text-lg text-amber-300">{k}·{label(P)} = {label(kP)}</div>
                    <p className="mt-2 text-xs text-slate-400">
                      Order of P = {basePointOrder} (that many additions return to O). The violet orbit
                      shows P, 2P, 3P … the trapdoor: k·P is cheap, but recovering k from P and k·P
                      (the discrete-log problem) is infeasible at cryptographic sizes.
                    </p>
                    <div className="mt-2 max-h-28 overflow-y-auto font-mono text-[11px] text-slate-400">
                      {orbit.map((pt, i) => <div key={i}>{i + 1}P = {label(pt)}</div>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function PointSelect({
  label: lbl, color, points, idx, onChange,
}: {
  label: string
  color: string
  points: { x: bigint; y: bigint }[]
  idx: number
  onChange: (i: number) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
      {lbl}
      <select className="ml-auto rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs"
        value={Math.min(idx, points.length - 1)} onChange={(e) => onChange(+e.target.value)}>
        {points.map((pt, i) => (
          <option key={i} value={i}>({pt.x.toString()}, {pt.y.toString()})</option>
        ))}
      </select>
    </label>
  )
}
