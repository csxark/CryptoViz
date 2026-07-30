'use client'

import { useMemo, useState } from 'react'
import {
  breakVigenere,
  encryptVigenere,
  ENGLISH_IOC,
  RANDOM_IOC,
  type VigenereBreakResult,
} from '@/lib/attacks/vigenereCryptanalysis'

const SAMPLE_PLAINTEXT =
  'It is a truth universally acknowledged that a single man in possession of a good fortune ' +
  'must be in want of a wife. However little known the feelings or views of such a man may be ' +
  'on his first entering a neighbourhood this truth is so well fixed in the minds of the ' +
  'surrounding families that he is considered as the rightful property of some one or other ' +
  'of their daughters. The morning was fine and the road was dry and the horses were fresh ' +
  'so the journey passed more quickly than anyone had dared to hope it would.'

const SAMPLE_KEY = 'CRYPT'

const DEFAULT_CIPHERTEXT = encryptVigenere(SAMPLE_PLAINTEXT, SAMPLE_KEY)

const CARD =
  'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
const HEADING = 'mb-3 text-lg font-semibold text-zinc-900 dark:text-white'
const MUTED = 'text-sm text-zinc-600 dark:text-zinc-400'

/** Bounds for the "max key length" control, matching the input's min/max. */
const MIN_MAX_KEY_LENGTH = 2
const MAX_MAX_KEY_LENGTH = 20

type Stage = 'kasiski' | 'ioc' | 'columns'

const STAGES: { id: Stage; label: string; caption: string }[] = [
  { id: 'kasiski', label: '1 · Kasiski', caption: 'Repeated n-grams reveal key-length multiples' },
  { id: 'ioc', label: '2 · Index of Coincidence', caption: 'Which split makes each coset English?' },
  { id: 'columns', label: '3 · Column solve', caption: 'm independent Caesar problems' },
]

export default function VigenereCryptanalysisSimulator() {
  const [ciphertext, setCiphertext] = useState(DEFAULT_CIPHERTEXT)
  const [maxKeyLength, setMaxKeyLength] = useState(12)
  const [result, setResult] = useState<VigenereBreakResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('kasiski')
  const [selectedColumn, setSelectedColumn] = useState(0)

  function runAttack() {
    setError(null)
    setResult(null)
    try {
      const analysis = breakVigenere(ciphertext, { maxKeyLength })
      setResult(analysis)
      setSelectedColumn(0)
      setStage('kasiski')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function loadSample() {
    setCiphertext(DEFAULT_CIPHERTEXT)
    setResult(null)
    setError(null)
  }

  const maxIoC = useMemo(() => {
    if (!result) return ENGLISH_IOC
    return Math.max(ENGLISH_IOC, ...result.iocScores.map((s) => s.averageIoC))
  }, [result])

  const maxFactorCount = useMemo(() => {
    if (!result) return 1
    return Math.max(1, ...result.factorTally.map((f) => f.divides))
  }, [result])

  const activeColumn = result?.columns[selectedColumn] ?? null

  const columnChiMax = useMemo(() => {
    if (!activeColumn) return 1
    return Math.max(...activeColumn.chiSquaredByShift)
  }, [activeColumn])

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Input                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>Ciphertext only — no key, no key length</h2>
        <p className={`mb-4 ${MUTED}`}>
          Vigenère resisted analysis for three centuries because a repeating key flattens the
          letter histogram: the same plaintext letter becomes a different ciphertext letter
          depending on where it sits. The break is indirect — recover the key <em>length</em>{' '}
          first, and the cipher collapses into a stack of Caesar ciphers.
        </p>

        <label htmlFor="vigenere-ciphertext" className="sr-only">
          Ciphertext to analyse
        </label>
        <textarea
          id="vigenere-ciphertext"
          className="mb-4 h-32 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={ciphertext}
          onChange={(e) => setCiphertext(e.target.value)}
          spellCheck={false}
        />

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={runAttack}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Recover the key
          </button>
          <button
            onClick={loadSample}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Load sample ciphertext
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="vigenere-maxlen" className={MUTED}>
              Max key length
            </label>
            <input
              id="vigenere-maxlen"
              type="number"
              min={MIN_MAX_KEY_LENGTH}
              max={MAX_MAX_KEY_LENGTH}
              value={maxKeyLength}
              onChange={(e) => {
                // Number('') is 0 and Number('1e') is NaN. Either would reach the
                // engine and produce a confusing failure, so clamp on the way in.
                const parsed = Number(e.target.value)
                if (e.target.value === '' || !Number.isFinite(parsed)) {
                  setMaxKeyLength(MIN_MAX_KEY_LENGTH)
                  return
                }
                setMaxKeyLength(
                  Math.min(MAX_MAX_KEY_LENGTH, Math.max(MIN_MAX_KEY_LENGTH, Math.floor(parsed)))
                )
              }}
              className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </section>

      {result && (
        <>
          {/* -------------------------------------------------------------- */}
          {/* Result banner                                                   */}
          {/* -------------------------------------------------------------- */}
          <section className="rounded-lg border border-red-300 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
            <h2 className={HEADING}>
              Recovered key:{' '}
              <span className="font-mono tracking-widest text-red-700 dark:text-red-300">
                {result.recoveredKey}
              </span>
            </h2>
            <p className={`mb-3 ${MUTED}`}>
              Key length {result.electedKeyLength} · weakest column margin{' '}
              {(result.overallConfidence * 100).toFixed(0)}% · recovered from ciphertext alone in{' '}
              {result.electedKeyLength * 26} chi-squared evaluations instead of the{' '}
              26<sup>{result.electedKeyLength}</sup> keys a brute-force search would need.
            </p>
            <p className="whitespace-pre-wrap break-words rounded-md bg-white/70 p-3 text-sm text-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200">
              {result.decryptedPlaintext}
            </p>

            {result.warnings.length > 0 && (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Stage tabs                                                      */}
          {/* -------------------------------------------------------------- */}
          <div
            role="tablist"
            aria-label="Cryptanalysis stages"
            className="flex flex-wrap gap-2"
          >
            {STAGES.map((s) => (
              <button
                key={s.id}
                role="tab"
                id={`tab-${s.id}`}
                aria-selected={stage === s.id}
                aria-controls={`panel-${s.id}`}
                onClick={() => setStage(s.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  stage === s.id
                    ? 'bg-teal-600 text-white dark:bg-teal-500'
                    : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Stage 1 — Kasiski                                               */}
          {/* -------------------------------------------------------------- */}
          {stage === 'kasiski' && (
            <section id="panel-kasiski" role="tabpanel" aria-labelledby="tab-kasiski" className={CARD}>
              <h2 className={HEADING}>Kasiski examination</h2>
              <p className={`mb-4 ${MUTED}`}>
                When the same plaintext fragment happens to line up with the same part of the key,
                it produces the same ciphertext. The distance between two such repeats is therefore
                a multiple of the key length. Factor enough distances and the key length falls out.
              </p>

              {result.repeatedSequences.length === 0 ? (
                <p className={MUTED}>
                  No repeated n-grams were found in this ciphertext, so Kasiski contributes no
                  evidence here. The Index of Coincidence stage carries the analysis on its own.
                </p>
              ) : (
                <div className="mb-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      Repeated ciphertext sequences and the distances between their occurrences
                    </caption>
                    <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
                      <tr>
                        <th scope="col" className="py-2 pr-4">Sequence</th>
                        <th scope="col" className="py-2 pr-4">Offsets</th>
                        <th scope="col" className="py-2">Distances</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {result.repeatedSequences.slice(0, 12).map((seq) => (
                        <tr key={seq.sequence}>
                          <td className="py-2 pr-4 font-mono font-semibold text-teal-700 dark:text-teal-400">
                            {seq.sequence}
                          </td>
                          <td className="py-2 pr-4 font-mono text-zinc-600 dark:text-zinc-400">
                            {seq.positions.join(', ')}
                          </td>
                          <td className="py-2 font-mono text-zinc-600 dark:text-zinc-400">
                            {seq.distances.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.repeatedSequences.length > 12 && (
                    <p className={`mt-2 ${MUTED}`}>
                      Showing 12 of {result.repeatedSequences.length} repeated sequences.
                    </p>
                  )}
                </div>
              )}

              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                How many distances each candidate length divides
              </h3>
              <div className="space-y-1.5">
                {[...result.factorTally]
                  .sort((a, b) => a.keyLength - b.keyLength)
                  .map((f) => (
                    <div key={f.keyLength} className="flex items-center gap-3">
                      <span className="w-6 text-right text-xs text-zinc-500 dark:text-zinc-500">
                        {f.keyLength}
                      </span>
                      <div className="h-3 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-3 rounded ${
                            f.keyLength === result.electedKeyLength
                              ? 'bg-teal-500'
                              : 'bg-zinc-400 dark:bg-zinc-600'
                          }`}
                          style={{ width: `${Math.max(2, (f.divides / maxFactorCount) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-xs text-zinc-500 dark:text-zinc-500">
                        {f.divides} ({(f.ratio * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Stage 2 — Index of Coincidence                                  */}
          {/* -------------------------------------------------------------- */}
          {stage === 'ioc' && (
            <section id="panel-ioc" role="tabpanel" aria-labelledby="tab-ioc" className={CARD}>
              <h2 className={HEADING}>Index of Coincidence by candidate key length</h2>
              <p className={`mb-4 ${MUTED}`}>
                Split the ciphertext into <em>m</em> cosets — every m-th letter. If <em>m</em> is
                the real key length, every letter in a coset was shifted by the same amount, so the
                coset is monoalphabetic and its IoC climbs from the random baseline{' '}
                <span className="font-mono">{RANDOM_IOC}</span> toward English{' '}
                <span className="font-mono">{ENGLISH_IOC}</span>.
              </p>

              <div className="mb-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-6 rounded bg-teal-500" /> elected length
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-0.5 bg-emerald-500" /> English ≈ {ENGLISH_IOC}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-0.5 bg-zinc-400" /> random ≈ {RANDOM_IOC}
                </span>
              </div>

              <div className="space-y-1.5">
                {result.iocScores.map((score) => (
                  <div key={score.keyLength} className="flex items-center gap-3">
                    <span className="w-6 text-right text-xs text-zinc-500 dark:text-zinc-500">
                      {score.keyLength}
                    </span>
                    <div className="relative h-4 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
                      {/* Reference lines for random and English IoC. */}
                      <span
                        className="absolute top-0 h-4 w-px bg-zinc-400"
                        style={{ left: `${(RANDOM_IOC / maxIoC) * 100}%` }}
                        aria-hidden="true"
                      />
                      <span
                        className="absolute top-0 h-4 w-px bg-emerald-500"
                        style={{ left: `${(ENGLISH_IOC / maxIoC) * 100}%` }}
                        aria-hidden="true"
                      />
                      <div
                        className={`h-4 rounded ${
                          score.keyLength === result.electedKeyLength
                            ? 'bg-teal-500'
                            : 'bg-zinc-400/70 dark:bg-zinc-600'
                        }`}
                        style={{ width: `${Math.max(2, (score.averageIoC / maxIoC) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs text-zinc-500 dark:text-zinc-500">
                      {score.averageIoC.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>

              <p className={`mt-4 rounded-md bg-zinc-50 p-3 ${MUTED} dark:bg-zinc-950/50`}>
                {result.electionReason}
              </p>
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Stage 3 — Column solve                                          */}
          {/* -------------------------------------------------------------- */}
          {stage === 'columns' && (
            <section id="panel-columns" role="tabpanel" aria-labelledby="tab-columns" className={CARD}>
              <h2 className={HEADING}>Solving each column as a Caesar cipher</h2>
              <p className={`mb-4 ${MUTED}`}>
                With the key length known, coset <em>j</em> holds only letters shifted by key letter{' '}
                <em>j</em>. That is a plain Caesar cipher, so the ordinary chi-squared frequency
                attack finishes the job — once per column.
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {result.columns.map((column) => (
                  <button
                    key={column.column}
                    onClick={() => setSelectedColumn(column.column)}
                    aria-pressed={selectedColumn === column.column}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      selectedColumn === column.column
                        ? 'bg-teal-600 text-white dark:bg-teal-500'
                        : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="block text-xs opacity-75">col {column.column + 1}</span>
                    <span className="block font-mono text-base tracking-widest">
                      {column.keyLetter}
                    </span>
                  </button>
                ))}
              </div>

              {activeColumn && (
                <>
                  <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ['Key letter', activeColumn.keyLetter],
                      ['Shift', String(activeColumn.shift)],
                      ['Coset size', `${activeColumn.coset.length} letters`],
                      ['Margin', `${(activeColumn.confidence * 100).toFixed(0)}%`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                          {label}
                        </dt>
                        <dd className="font-mono text-sm text-zinc-900 dark:text-white">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Chi-squared by shift — lower is more English-like
                  </h3>
                  <div className="space-y-1">
                    {activeColumn.chiSquaredByShift.map((chi, shift) => (
                      <div key={shift} className="flex items-center gap-3">
                        <span className="w-6 text-right font-mono text-xs text-zinc-500 dark:text-zinc-500">
                          {String.fromCharCode(65 + shift)}
                        </span>
                        <div className="h-2.5 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-2.5 rounded ${
                              shift === activeColumn.shift
                                ? 'bg-teal-500'
                                : 'bg-zinc-400 dark:bg-zinc-600'
                            }`}
                            style={{ width: `${Math.max(2, (chi / columnChiMax) * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 text-right font-mono text-xs text-zinc-500 dark:text-zinc-500">
                          {chi.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Letters in this coset
                  </h3>
                  <p className="break-all rounded-md bg-zinc-50 p-3 font-mono text-xs text-zinc-600 dark:bg-zinc-950/50 dark:text-zinc-400">
                    {activeColumn.coset}
                  </p>
                </>
              )}
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Trace                                                           */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>Full analysis trace</h2>
            <ol className="space-y-3">
              {result.steps.map((step, i) => (
                <li key={i} className="border-l-2 border-teal-500 pl-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    <span className="mr-2 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {step.stage}
                    </span>
                    {step.label}
                  </p>
                  <p className={MUTED}>{step.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}
