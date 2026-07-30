'use client'

import { useMemo, useState } from 'react'
import {
  CURVE_PRESETS,
  discreteLog,
  enumeratePoints,
  formatPoint,
  hasseBounds,
  isSingular,
  pointAdd,
  pointDouble,
  pointNegate,
  pointOrder,
  pointsEqual,
  scalarMultiply,
  subgroupOf,
  type ArithmeticStep,
  type CurveParams,
  type ECPoint,
} from '@/lib/asymmetric/ecPointArithmetic'

const CARD =
  'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
const HEADING = 'mb-3 text-lg font-semibold text-zinc-900 dark:text-white'
const MUTED = 'text-sm text-zinc-600 dark:text-zinc-400'
const BUTTON =
  'rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-40 dark:bg-teal-500 dark:hover:bg-teal-400'
const BUTTON_SECONDARY =
  'rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

type Operation = 'add' | 'double' | 'scalar'

const PLOT_SIZE = 520
const PLOT_PADDING = 34

/** Turn an "x,y" option value back into a point, or null for the empty option. */
function parsePointKey(key: string): ECPoint | null {
  if (!key) return null
  const [x, y] = key.split(',')
  return { x: BigInt(x), y: BigInt(y) }
}

export default function ECPointPlayground() {
  const [curveName, setCurveName] = useState(CURVE_PRESETS[0].name)
  const [selectedP, setSelectedP] = useState<ECPoint | null>(null)
  const [selectedQ, setSelectedQ] = useState<ECPoint | null>(null)
  const [scalar, setScalar] = useState(7)
  const [operation, setOperation] = useState<Operation>('add')
  const [generatorPoint, setGeneratorPoint] = useState<ECPoint | null>(null)
  const [dlogTarget, setDlogTarget] = useState<ECPoint | null>(null)

  const curve: CurveParams = useMemo(
    () => CURVE_PRESETS.find((c) => c.name === curveName) ?? CURVE_PRESETS[0],
    [curveName]
  )

  const { points, order, error } = useMemo((): {
    points: ECPoint[]
    order: number | null
    error: string | null
  } => {
    if (!curve.plottable) {
      return { points: [], order: null, error: null }
    }
    try {
      const enumerated = enumeratePoints(curve)
      return { points: enumerated, order: enumerated.length + 1, error: null }
    } catch (err) {
      return {
        points: [],
        order: null,
        error: err instanceof Error ? err.message : 'Could not enumerate the curve.',
      }
    }
  }, [curve])

  function changeCurve(name: string) {
    setCurveName(name)
    setSelectedP(null)
    setSelectedQ(null)
    setGeneratorPoint(null)
    setDlogTarget(null)
  }

  function handlePointClick(point: ECPoint) {
    if (operation === 'add') {
      if (!selectedP) setSelectedP(point)
      else if (!selectedQ) setSelectedQ(point)
      else {
        setSelectedP(point)
        setSelectedQ(null)
      }
    } else {
      setSelectedP(point)
      setSelectedQ(null)
    }
  }

  /* ----------------------------------------------------------------- */
  /* Operation                                                          */
  /* ----------------------------------------------------------------- */

  const operationResult = useMemo((): {
    result: ECPoint | null
    steps: ArithmeticStep[]
    cost?: { doublings: number; additions: number; naive: number }
    failure: string | null
  } => {
    try {
      if (operation === 'add') {
        if (!selectedP || !selectedQ) return { result: null, steps: [], failure: null }
        const outcome = pointAdd(selectedP, selectedQ, curve)
        return { result: outcome.result, steps: outcome.steps, failure: null }
      }

      if (operation === 'double') {
        if (!selectedP) return { result: null, steps: [], failure: null }
        const outcome = pointDouble(selectedP, curve)
        return { result: outcome.result, steps: outcome.steps, failure: null }
      }

      const base = selectedP ?? { x: curve.gx, y: curve.gy }
      const outcome = scalarMultiply(BigInt(scalar), base, curve)
      return {
        result: outcome.result,
        steps: outcome.steps,
        cost: {
          doublings: outcome.doublings,
          additions: outcome.additions,
          naive: outcome.naiveAdditions,
        },
        failure: null,
      }
    } catch (err) {
      return {
        result: null,
        steps: [],
        failure: err instanceof Error ? err.message : 'Operation failed.',
      }
    }
  }, [operation, selectedP, selectedQ, scalar, curve])

  /* ----------------------------------------------------------------- */
  /* Subgroup + ECDLP                                                   */
  /* ----------------------------------------------------------------- */

  const subgroup = useMemo(() => {
    if (!generatorPoint || !curve.plottable) return null
    try {
      return subgroupOf(generatorPoint, curve)
    } catch {
      return null
    }
  }, [generatorPoint, curve])

  const dlog = useMemo(() => {
    if (!generatorPoint || !dlogTarget || !curve.plottable) return null
    try {
      return discreteLog(generatorPoint, dlogTarget, curve)
    } catch {
      return null
    }
  }, [generatorPoint, dlogTarget, curve])

  /* ----------------------------------------------------------------- */
  /* Plot geometry                                                      */
  /* ----------------------------------------------------------------- */

  const p = Number(curve.p)
  const scale = (PLOT_SIZE - 2 * PLOT_PADDING) / Math.max(1, p - 1)
  const toScreen = (x: bigint, y: bigint) => ({
    cx: PLOT_PADDING + Number(x) * scale,
    cy: PLOT_SIZE - PLOT_PADDING - Number(y) * scale,
  })
  const dotRadius = Math.max(1.6, Math.min(5, 220 / Math.max(20, p)))

  const subgroupKeys = useMemo(
    () =>
      new Set(
        (subgroup?.points ?? [])
          .filter((pt): pt is { x: bigint; y: bigint } => pt !== 'infinity')
          .map((pt) => `${pt.x},${pt.y}`)
      ),
    [subgroup]
  )

  const bounds = hasseBounds(curve.p)

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Curve selection                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>Curve</h2>

        <label htmlFor="ec-curve" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preset
        </label>
        <select
          id="ec-curve"
          className="mb-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={curveName}
          onChange={(e) => changeCurve(e.target.value)}
        >
          {CURVE_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>

        <p className={`mb-4 ${MUTED}`}>{curve.description}</p>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['a', curve.a.toString()],
            ['b', curve.b.toString()],
            ['p', curve.p > 1000000n ? `${curve.p.toString().slice(0, 12)}… (${curve.p.toString().length} digits)` : curve.p.toString()],
            ['Non-singular', isSingular(curve) ? 'no' : 'yes'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                {label}
              </dt>
              <dd className="break-all font-mono text-sm text-zinc-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>

        {curve.plottable && order !== null && (
          <div className="mt-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-950/50">
            <p className={MUTED}>
              <strong className="text-zinc-900 dark:text-white">#E(F_p) = {order}</strong>, counting
              the point at infinity. Hasse&apos;s theorem confines it to{' '}
              <span className="font-mono">
                [{bounds.lower}, {bounds.upper}]
              </span>{' '}
              — that is <span className="font-mono">p + 1 ± 2√p</span>, centred on{' '}
              <span className="font-mono">{bounds.centre}</span>. The observed order sits inside
              that interval, as it must.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Intractable curve notice                                          */}
      {/* ---------------------------------------------------------------- */}
      {!curve.plottable && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className={HEADING}>Correct, but not plottable — and that is the point</h2>
          <p className={`mb-3 ${MUTED}`}>
            Every formula on this page is exactly as valid for this curve as for the toy ones. What
            changes is not the mathematics but the scale: with{' '}
            <span className="font-mono">p ≈ 1.16 × 10⁷⁷</span> there is no point lattice to draw, no
            group to enumerate, and no discrete log to brute-force. The security of ECC is entirely
            contained in that difference.
          </p>
          <p className={MUTED}>
            Scalar multiplication still works below — try it, and compare the operation count
            against the naive figure.
          </p>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Plot                                                              */}
      {/* ---------------------------------------------------------------- */}
      {curve.plottable && points.length > 0 && (
        <section className={CARD}>
          <h2 className={HEADING}>The point lattice</h2>
          <p className={`mb-4 ${MUTED}`}>
            Over the real numbers an elliptic curve is a smooth line. Over{' '}
            <span className="font-mono">F_p</span> it is this — scattered dots, symmetric about{' '}
            <span className="font-mono">y = p/2</span> because every point has a mirror{' '}
            <span className="font-mono">−P</span>. The chord-and-tangent picture no longer means
            anything geometrically, and the algebra works anyway. Click a point to select it.
          </p>

          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}
              className="h-auto w-full max-w-xl rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              role="img"
              aria-label={`Scatter plot of all ${points.length} affine points on ${curve.name}, symmetric about the horizontal midline. The plot is a visual aid only — the point pickers immediately below select P and Q without it.`}
            >
              <line
                x1={PLOT_PADDING}
                y1={PLOT_SIZE - PLOT_PADDING}
                x2={PLOT_SIZE - PLOT_PADDING}
                y2={PLOT_SIZE - PLOT_PADDING}
                className="stroke-zinc-300 dark:stroke-zinc-700"
                strokeWidth="1"
              />
              <line
                x1={PLOT_PADDING}
                y1={PLOT_PADDING}
                x2={PLOT_PADDING}
                y2={PLOT_SIZE - PLOT_PADDING}
                className="stroke-zinc-300 dark:stroke-zinc-700"
                strokeWidth="1"
              />

              {points.map((point) => {
                if (point === 'infinity') return null
                const { cx, cy } = toScreen(point.x, point.y)
                const key = `${point.x},${point.y}`

                const isP = selectedP && pointsEqual(selectedP, point)
                const isQ = selectedQ && pointsEqual(selectedQ, point)
                const isResult =
                  operationResult.result &&
                  operationResult.result !== 'infinity' &&
                  pointsEqual(operationResult.result, point)
                const inSubgroup = subgroupKeys.has(key)

                const className = isP
                  ? 'fill-teal-500'
                  : isQ
                    ? 'fill-sky-500'
                    : isResult
                      ? 'fill-red-500'
                      : inSubgroup
                        ? 'fill-amber-500'
                        : 'fill-zinc-400 dark:fill-zinc-600'

                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={isP || isQ || isResult ? dotRadius * 2.2 : dotRadius}
                    className={`${className} cursor-pointer`}
                    onClick={() => handlePointClick(point)}
                  >
                    <title>{`(${point.x}, ${point.y})`}</title>
                  </circle>
                )
              })}
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" /> P
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" /> Q
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> result
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> subgroup ⟨G⟩
            </span>
            <span>{points.length} affine points + O</span>
          </div>

          {/* Keyboard- and screen-reader-accessible equivalent of clicking the
              plot. Native selects keep this to two tab stops rather than the
              hundreds a focusable circle per point would create. */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ec-pick-p"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Select P
              </label>
              <select
                id="ec-pick-p"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                value={selectedP && selectedP !== 'infinity' ? `${selectedP.x},${selectedP.y}` : ''}
                onChange={(e) => setSelectedP(parsePointKey(e.target.value))}
              >
                <option value="">— none —</option>
                {points.map((point) =>
                  point === 'infinity' ? null : (
                    <option key={`p-${point.x},${point.y}`} value={`${point.x},${point.y}`}>
                      ({point.x}, {point.y})
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="ec-pick-q"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Select Q
              </label>
              <select
                id="ec-pick-q"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                value={selectedQ && selectedQ !== 'infinity' ? `${selectedQ.x},${selectedQ.y}` : ''}
                onChange={(e) => setSelectedQ(parsePointKey(e.target.value))}
              >
                <option value="">— none —</option>
                {points.map((point) =>
                  point === 'infinity' ? null : (
                    <option key={`q-${point.x},${point.y}`} value={`${point.x},${point.y}`}>
                      ({point.x}, {point.y})
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Operations                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>Group operations</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['add', 'P + Q'],
              ['double', '2P'],
              ['scalar', 'kP'],
            ] as [Operation, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setOperation(id)}
              aria-pressed={operation === id}
              className={operation === id ? BUTTON : BUTTON_SECONDARY}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <span className="block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              P
            </span>
            <span className="font-mono text-sm text-zinc-900 dark:text-white">
              {selectedP
                ? formatPoint(selectedP)
                : // kP falls back to the base point when nothing is selected, so
                  // say so rather than showing a prompt while the trace uses G.
                  operation === 'scalar' || !curve.plottable
                  ? formatPoint({ x: curve.gx, y: curve.gy })
                  : '— click a point'}
            </span>
            {!selectedP && operation === 'scalar' && curve.plottable && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-500">
                base point G (nothing selected)
              </span>
            )}
          </div>

          {operation === 'add' && (
            <div>
              <span className="block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                Q
              </span>
              <span className="font-mono text-sm text-zinc-900 dark:text-white">
                {selectedQ ? formatPoint(selectedQ) : '— click a second point'}
              </span>
            </div>
          )}

          {operation === 'scalar' && (
            <div>
              <label
                htmlFor="ec-scalar"
                className="block text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500"
              >
                k
              </label>
              <input
                id="ec-scalar"
                type="number"
                min={0}
                max={100000}
                value={scalar}
                onChange={(e) => {
                  const parsed = Number(e.target.value)
                  if (e.target.value === '' || !Number.isFinite(parsed)) {
                    setScalar(0)
                    return
                  }
                  setScalar(Math.min(100000, Math.max(0, Math.floor(parsed))))
                }}
                className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          )}

          {selectedP && (
            <button onClick={() => setSelectedP(pointNegate(selectedP, curve))} className={BUTTON_SECONDARY}>
              Negate P
            </button>
          )}
          <button
            onClick={() => {
              setSelectedP(null)
              setSelectedQ(null)
            }}
            className={BUTTON_SECONDARY}
          >
            Clear
          </button>
        </div>

        {operationResult.failure && (
          <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
            {operationResult.failure}
          </p>
        )}

        {operationResult.result !== null && (
          <>
            <p className="mb-4 rounded-md bg-teal-50 p-3 font-mono text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              = {formatPoint(operationResult.result)}
              {operationResult.result !== 'infinity' && curve.plottable && (
                <span className="ml-3 font-sans text-xs text-teal-700 dark:text-teal-400">
                  order {pointOrder(operationResult.result, curve)}
                </span>
              )}
            </p>

            {operationResult.cost && (
              <p className={`mb-4 ${MUTED}`}>
                <strong className="text-zinc-900 dark:text-white">
                  {operationResult.cost.doublings + operationResult.cost.additions} operations
                </strong>{' '}
                ({operationResult.cost.doublings} doublings, {operationResult.cost.additions}{' '}
                additions) versus{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {operationResult.cost.naive}
                </strong>{' '}
                by repeated addition.
              </p>
            )}

            <ol className="space-y-3">
              {operationResult.steps.map((step, i) => (
                <li key={i} className="border-l-2 border-teal-500 pl-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{step.label}</p>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">{step.formula}</p>
                  <p className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {step.substituted}
                  </p>
                  <p className={MUTED}>{step.note}</p>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Subgroup + ECDLP                                                  */}
      {/* ---------------------------------------------------------------- */}
      {curve.plottable && points.length > 0 && (
        <section className={CARD}>
          <h2 className={HEADING}>Subgroups and the discrete logarithm</h2>
          <p className={`mb-4 ${MUTED}`}>
            Pick a generator to trace the cyclic subgroup it spans. Its order always divides the
            group order — that is Lagrange&apos;s theorem, and it is why cofactors matter: a
            generator landing in a small subgroup would confine every key to that subgroup.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setGeneratorPoint({ x: curve.gx, y: curve.gy })}
              className={BUTTON_SECONDARY}
            >
              Use the curve&apos;s base point
            </button>
            <button
              onClick={() => setGeneratorPoint(selectedP)}
              disabled={!selectedP}
              className={BUTTON_SECONDARY}
            >
              Use the selected P
            </button>
            <button
              onClick={() => {
                setGeneratorPoint(null)
                setDlogTarget(null)
              }}
              className={BUTTON_SECONDARY}
            >
              Clear
            </button>
          </div>

          {subgroup && generatorPoint && (
            <>
              <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ['Generator', formatPoint(generatorPoint)],
                  ['Order of G', String(subgroup.order)],
                  ['Group order', String(order)],
                  ['Cofactor', order ? String(order / subgroup.order) : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      {label}
                    </dt>
                    <dd className="break-all font-mono text-sm text-zinc-900 dark:text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className={`mb-4 ${MUTED}`}>
                {order && order % subgroup.order === 0
                  ? `${subgroup.order} divides ${order} exactly ${order / subgroup.order} times, as Lagrange's theorem requires.`
                  : 'Subgroup order computed.'}
              </p>

              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-teal-700 dark:text-teal-400">
                  Show all {subgroup.order} multiples of G
                </summary>
                <div className="mt-2 max-h-56 overflow-auto rounded-md bg-zinc-50 p-3 dark:bg-zinc-950/50">
                  <ol className="space-y-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {subgroup.points.map((point, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setDlogTarget(point)}
                          className="hover:text-teal-600 dark:hover:text-teal-400"
                        >
                          {i + 1}G = {formatPoint(point)}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>

              {dlogTarget && dlog && (
                <div className="rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
                    Discrete logarithm of {formatPoint(dlogTarget)}
                  </h3>
                  <p className={MUTED}>
                    {dlog.k === null ? (
                      <>
                        No k exists — this point is not in ⟨G⟩. Searched all {dlog.searchSpace}{' '}
                        multiples.
                      </>
                    ) : (
                      <>
                        Found <span className="font-mono">k = {dlog.k}</span> in{' '}
                        <span className="font-mono">{dlog.steps}</span> additions, over a search
                        space of <span className="font-mono">{dlog.searchSpace}</span>.
                      </>
                    )}
                  </p>
                  <p className={`mt-2 ${MUTED}`}>
                    Computing <span className="font-mono">kG</span> took about{' '}
                    {Math.ceil(Math.log2(Math.max(2, dlog.k ?? 2)))} operations. Recovering{' '}
                    <span className="font-mono">k</span> took {dlog.steps}. On secp256k1 the same
                    search would span roughly 2²⁵⁶ ≈ 10⁷⁷ candidates — more than the estimated
                    number of atoms in the observable universe. That asymmetry <em>is</em> elliptic
                    curve cryptography.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
