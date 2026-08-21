'use client'

import { useMemo, useState } from 'react'
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'
import type { CipherName } from '@/lib/cipher/types'
import type { ChallengeDifficulty } from '@/lib/challenge/generator'
import { hashChallengeAnswer, serializeCustomChallengeSet, type CustomChallengeQuestion } from '@/lib/challenge/customChallengeSerializer'
import { useCipherWorker } from '@/hooks/useCipherWorker'

const TIME_LIMITS = [0, 30, 60, 120] as const

export default function CustomChallengeBuilder({ onCreated }: { onCreated: (serialized: string) => void }) {
  const { runCipher, loading } = useCipherWorker()
  const [title, setTitle] = useState('Custom Crypto Challenge')
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium')
  const [timeLimit, setTimeLimit] = useState<(typeof TIME_LIMITS)[number]>(60)
  const [cipherId, setCipherId] = useState<CipherName>('caesar')
  const [plaintext, setPlaintext] = useState('MEET ME AT DAWN')
  const [key, setKey] = useState('3')
  const [hints, setHints] = useState(['Identify the cipher family.', 'Work through the key or shift carefully.'])
  const [questions, setQuestions] = useState<CustomChallengeQuestion[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedCipher = useMemo(() => CIPHER_REGISTRY.find((cipher) => cipher.id === cipherId), [cipherId])

  const addQuestion = async () => {
    if (!plaintext.trim()) return setError('Plaintext is required.')
    if (questions.length >= 20) return setError('A custom challenge can contain at most 20 questions.')
    setBusy(true)
    setError('')
    try {
      const result = await runCipher('encrypt', cipherId, plaintext, key)
      const answerHash = await hashChallengeAnswer(plaintext)
      setQuestions((prev) => [...prev, {
        id: `${Date.now()}-${prev.length}`,
        cipherId,
        ciphertext: result.output,
        answerHash,
        hints: hints.map((hint) => hint.trim()).filter(Boolean).slice(0, 4),
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not encrypt this question.')
    } finally {
      setBusy(false)
    }
  }

  const createChallenge = async () => {
    if (!questions.length) return setError('Add at least one question first.')
    setBusy(true)
    setError('')
    try {
      const serialized = await serializeCustomChallengeSet({ version: 1, title: title.trim() || 'Custom Crypto Challenge', difficulty, timeLimit, questions })
      onCreated(serialized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the challenge link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-teal-500/30 bg-white p-6 shadow-sm dark:bg-zinc-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Custom Challenge Builder</p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">Build a shareable cryptography quiz</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Answers are stored as SHA-256 digests rather than plaintext in the URL.</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{questions.length}/20 questions</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Challenge title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" /></label>
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value as ChallengeDifficulty)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Time limit<select value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value) as typeof timeLimit)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950">{TIME_LIMITS.map((limit) => <option key={limit} value={limit}>{limit === 0 ? 'No limit' : `${limit} seconds/question`}</option>)}</select></label>
        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cipher<select value={cipherId} onChange={(e) => { const id = e.target.value as CipherName; setCipherId(id); const def = CIPHER_REGISTRY.find((c) => c.id === id); if (def) setKey(def.defaultKey) }} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950">{CIPHER_REGISTRY.filter((cipher) => cipher.category !== 'hash' && cipher.category !== 'asymmetric').map((cipher) => <option key={cipher.id} value={cipher.id}>{cipher.name}</option>)}</select></label>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Question composer</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Plaintext<textarea value={plaintext} onChange={(e) => setPlaintext(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono font-normal dark:border-zinc-700 dark:bg-zinc-950" /></label>
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder={selectedCipher?.keyPlaceholder} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono font-normal dark:border-zinc-700 dark:bg-zinc-950" /></label>
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 md:col-span-2">Hint tiers, one per line<textarea value={hints.join('\n')} onChange={(e) => setHints(e.target.value.split('\n').slice(0, 4))} rows={3} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" /></label>
        </div>
        <button type="button" onClick={addQuestion} disabled={busy || loading} className="mt-4 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">{busy || loading ? 'Encrypting…' : 'Add Question'}</button>
      </div>

      {questions.length > 0 && <div className="mt-5 space-y-2">{questions.map((question, index) => <div key={question.id} className="flex items-center justify-between gap-4 rounded-lg bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-950/50"><span><strong>Q{index + 1}</strong> · {CIPHER_REGISTRY.find((c) => c.id === question.cipherId)?.name}</span><code className="max-w-[55%] truncate text-xs text-zinc-500">{question.ciphertext}</code></div>)}</div>}

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={createChallenge} disabled={busy || !questions.length} className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50">Create Shareable Challenge</button>
        <p className="self-center text-xs text-zinc-500 dark:text-zinc-400">The link contains ciphertext and answer hashes, not plaintext answers or keys.</p>
      </div>
    </section>
  )
}
