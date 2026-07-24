'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useCipherWorker } from '../../lib/hooks/useCipherWorker'
import { generateChallengeData, type ChallengeData, type ChallengeDifficulty } from '../../lib/challenge/generator'
import { getWrongAnswerExplanation } from '../../lib/challenge/explain'
import { CIPHER_REGISTRY } from '../../lib/cipher/registry'

type FeedbackState = 'idle' | 'correct' | 'incorrect'

const TOTAL_QUESTIONS = 10
const TIME_LIMIT = 60

const XP_BASE_CORRECT = 100
const XP_PENALTY_PER_HINT = 20
const XP_MIN_CORRECT = 10

const HISTORY_CAP = 20
const HISTORY_KEY = 'cryptoviz_challenge_history'
const XP_TOTAL_KEY = 'cryptoviz_xp_total'
const STREAK_COUNT_KEY = 'cryptoviz_streak_count'
const STREAK_LAST_DATE_KEY = 'cryptoviz_streak_last_play_date'
const BEST_SCORE_KEY = 'cryptoviz_best_score'

type QuestionRun = {
  cipherId: ChallengeData['cipherId']
  plaintext: string
  key: string
  difficulty: ChallengeData['difficulty']
  correct: boolean
  hintRevealedCount: number
  wrongAttempts: number
  lastExplanation: { title: string; details: string[] }
  earnedXp: number
}

type ChallengeHistoryEntry = {
  id: string
  createdAt: number
  difficulty: ChallengeDifficulty
  xpEarned: number
  accuracy: number // 0..1
  streakAfter: number
  questions: Array<{
    cipherId: QuestionRun['cipherId']
    correct: boolean
    hintRevealedCount: number
    wrongAttempts: number
    earnedXp: number
  }>
}

function formatLocalDateKey(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseLocalDateKey(key: string) {
  const [y, m, d] = key.split('-').map((x) => parseInt(x, 10))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function daysBetweenLocalDates(a: Date, b: Date) {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  const ms = b0.getTime() - a0.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

function computeEarnedXp(params: {
  wasCorrect: boolean
  hintRevealedCount: number
}) {
  if (!params.wasCorrect) return 0
  const penalty = params.hintRevealedCount * XP_PENALTY_PER_HINT
  const earned = XP_BASE_CORRECT - penalty
  return Math.max(XP_MIN_CORRECT, earned)
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

export default function ChallengeMode() {
  const { runCipher, loading, error } = useCipherWorker()
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionPersistedRef = useRef(false)

  const MAX_CIPHERTEXT_RETRIES = 3
  const RETRY_BACKOFF_BASE_MS = 400

  const [cipherRetryCount, setCipherRetryCount] = useState(0)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)


  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium')
  const [started, setStarted] = useState(false)
  const [replayMode, setReplayMode] = useState(false)

  const [isHydrated, setIsHydrated] = useState(false)

  // Best score (legacy)
  const [bestScore, setBestScore] = useState(0)

  // XP + streak
  const [xpTotal, setXpTotal] = useState(0)
  const [streak, setStreak] = useState(0)

  // Session state
  const [sessionChallenges, setSessionChallenges] = useState<ChallengeData[] | null>(null)
  const [expectedCiphertext, setExpectedCiphertext] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0) // 0..9
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [copied, setCopied] = useState(false)

  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)

  const [showHintIndex, setShowHintIndex] = useState(0) // 0..n-1 (but reveals hint at index)

  const [questionRuns, setQuestionRuns] = useState<QuestionRun[] | null>(null)
  const [challengeExplanation, setChallengeExplanation] = useState<{ title: string; details: string[] } | null>(null)

  const currentChallenge = useMemo(() => {
    if (!sessionChallenges) return null
    return sessionChallenges[currentQuestionIndex] ?? null
  }, [sessionChallenges, currentQuestionIndex])

  const currentCipherName = useMemo(() => {
    if (!currentChallenge) return 'Cipher'
    return CIPHER_REGISTRY.find((c) => c.id === currentChallenge.cipherId)?.name ?? 'Cipher'
  }, [currentChallenge])

  const progressPercent = useMemo(() => {
    return Math.round((currentQuestionIndex / TOTAL_QUESTIONS) * 100)
  }, [currentQuestionIndex])

  // Hydration + persisted values
  useEffect(() => {
    const savedBest = localStorage.getItem(BEST_SCORE_KEY)
    if (savedBest) setBestScore(parseInt(savedBest, 10) || 0)

    const savedXp = localStorage.getItem(XP_TOTAL_KEY)
    if (savedXp) setXpTotal(parseInt(savedXp, 10) || 0)

    const savedStreakCount = localStorage.getItem(STREAK_COUNT_KEY)
    const savedStreakLast = localStorage.getItem(STREAK_LAST_DATE_KEY)

    if (savedStreakCount) setStreak(parseInt(savedStreakCount, 10) || 0)

    // If last date is invalid, keep streak as-is; streak update will happen on completion.

    setIsHydrated(true)
  }, [])

  const generateSessionChallenges = useCallback(
    (d: ChallengeDifficulty) => {
      const arr: ChallengeData[] = []
      for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        arr.push(generateChallengeData(d))
      }
      return arr
    },
    []
  )

  const loadExpectedCiphertextForCurrent = useCallback(async () => {
    if (!currentChallenge) return
    setExpectedCiphertext('')

    try {
      const result = await runCipher('encrypt', currentChallenge.cipherId, currentChallenge.plaintext, currentChallenge.key)
      setExpectedCiphertext(result.output)
    } catch (e) {
      console.error('Worker failed to generate expected ciphertext:', e)
      // `useCipherWorker` already sets `error`; UI will offer retry.
    }
  }, [currentChallenge, runCipher])


  // Load ciphertext when session advances
  useEffect(() => {
    if (!started) return
    if (!currentChallenge) return

    // Reset retry state for the new question
    setCipherRetryCount(0)
    retryTimerRef.current && clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null

    loadExpectedCiphertextForCurrent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, started])


  // Timer
  useEffect(() => {
    if (!currentChallenge) return
    if (feedback === 'correct') return
    if (loading) return

    if (timeLeft === 0) {
      // mark incorrect due to timeout
      setFeedback('incorrect')
      setChallengeExplanation(null)

      setQuestionRuns((prev) => {
        const runs = prev ? [...prev] : []
        const ch = currentChallenge
        const hintCount = showHintIndex
        const existing = runs[currentQuestionIndex]
        const wrongAttempts = existing?.wrongAttempts ?? 0
        const explanation = getWrongAnswerExplanation({ cipherId: ch.cipherId, difficulty: ch.difficulty })
        const earnedXp = computeEarnedXp({ wasCorrect: false, hintRevealedCount: hintCount })

        runs[currentQuestionIndex] = {
          cipherId: ch.cipherId,
          plaintext: ch.plaintext,
          key: ch.key,
          difficulty: ch.difficulty,
          correct: false,
          hintRevealedCount: hintCount,
          wrongAttempts,
          lastExplanation: explanation,
          earnedXp,
        }
        return runs
      })

      successTimeoutRef.current && clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = setTimeout(() => {
        advanceQuestion()
      }, 1500)

      return
    }

    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [currentChallenge, feedback, loading, timeLeft, currentQuestionIndex, showHintIndex])

  const advanceQuestion = useCallback(() => {
    setFeedback('idle')
    setChallengeExplanation(null)
    setAnswer('')
    setShowHintIndex(0)
    setTimeLeft(TIME_LIMIT)

    setCurrentQuestionIndex((i) => {
      const next = i + 1
      return next
    })
  }, [])

  const resetSession = useCallback(() => {
    successTimeoutRef.current && clearTimeout(successTimeoutRef.current)
    sessionPersistedRef.current = false
    setReplayMode(false)

    setStarted(true)
    setSessionChallenges(generateSessionChallenges(difficulty))
    setQuestionRuns(new Array(TOTAL_QUESTIONS))
    setCurrentQuestionIndex(0)
    setExpectedCiphertext('')
    setFeedback('idle')
    setChallengeExplanation(null)
    setAnswer('')
    setShowHintIndex(0)
    setTimeLeft(TIME_LIMIT)
    setCopied(false)
  }, [difficulty, generateSessionChallenges])

  const startNewSession = useCallback(() => {
    successTimeoutRef.current && clearTimeout(successTimeoutRef.current)
    sessionPersistedRef.current = false
    setReplayMode(false)
    setSessionChallenges(generateSessionChallenges(difficulty))
    setQuestionRuns(new Array(TOTAL_QUESTIONS))
    setCurrentQuestionIndex(0)
    setExpectedCiphertext('')
    setFeedback('idle')
    setChallengeExplanation(null)
    setAnswer('')
    setShowHintIndex(0)
    setTimeLeft(TIME_LIMIT)
    setCopied(false)
    setStarted(true)
  }, [difficulty, generateSessionChallenges])

  const handleCopy = () => {
    if (!expectedCiphertext) return
    navigator.clipboard.writeText(expectedCiphertext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetryExpectedCiphertext = useCallback(() => {
    if (!currentChallenge) return
    if (!error) return
    if (loading) return
    if (cipherRetryCount >= MAX_CIPHERTEXT_RETRIES) return

    // Prevent rapid repeated clicks from scheduling multiple retries.
    setExpectedCiphertext('')

    const nextCount = cipherRetryCount + 1

    setCipherRetryCount(nextCount)

    const delayMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, nextCount - 1)

    retryTimerRef.current && clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      loadExpectedCiphertextForCurrent()
    }, delayMs)
  }, [cipherRetryCount, currentChallenge, error, loading, loadExpectedCiphertextForCurrent])



  const handleShowHint = useCallback(() => {
    if (!currentChallenge) return
    const maxHintIndex = Math.max(0, currentChallenge.hints.length - 1)
    setShowHintIndex((i) => Math.min(maxHintIndex, i + 1))
    setFeedback('idle')
  }, [currentChallenge])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChallenge) return
    if (!answer.trim()) return
    if (loading || !!error) return
    if (feedback === 'correct') return

    const isCorrect = answer.toUpperCase() === currentChallenge.plaintext.toUpperCase()

    if (isCorrect) {
      const hintCount = showHintIndex
      const earnedXp = computeEarnedXp({ wasCorrect: true, hintRevealedCount: hintCount })

      setQuestionRuns((prev) => {
        const runs = prev ? [...prev] : []
        const explanation = getWrongAnswerExplanation({ cipherId: currentChallenge.cipherId, difficulty: currentChallenge.difficulty })
        runs[currentQuestionIndex] = {
          cipherId: currentChallenge.cipherId,
          plaintext: currentChallenge.plaintext,
          key: currentChallenge.key,
          difficulty: currentChallenge.difficulty,
          correct: true,
          hintRevealedCount: hintCount,
          wrongAttempts: 0,
          lastExplanation: explanation,
          earnedXp,
        }
        return runs
      })

      setFeedback('correct')
      setChallengeExplanation(null)

      successTimeoutRef.current && clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = setTimeout(() => {
        advanceQuestion()
      }, 1500)
      return
    }

    // incorrect
    const explanation = getWrongAnswerExplanation({ cipherId: currentChallenge.cipherId, difficulty: currentChallenge.difficulty })
    setChallengeExplanation(explanation)
    setFeedback('incorrect')

    setQuestionRuns((prev) => {
      const runs = prev ? [...prev] : []
      const existing = runs[currentQuestionIndex]
      const hintCount = showHintIndex
      const wrongAttempts = (existing?.wrongAttempts ?? 0) + 1
      const earnedXp = computeEarnedXp({ wasCorrect: false, hintRevealedCount: hintCount })

      runs[currentQuestionIndex] = {
        cipherId: currentChallenge.cipherId,
        plaintext: currentChallenge.plaintext,
        key: currentChallenge.key,
        difficulty: currentChallenge.difficulty,
        correct: false,
        hintRevealedCount: hintCount,
        wrongAttempts,
        lastExplanation: explanation,
        earnedXp,
      }
      return runs
    })
  }

  const sessionSummary = useMemo(() => {
    if (!questionRuns) return null
    const completed = questionRuns.filter(Boolean) as QuestionRun[]
    const correctCount = completed.filter((r) => r.correct).length
    const totalXp = completed.reduce((a, r) => a + r.earnedXp, 0)
    const accuracy = completed.length ? correctCount / completed.length : 0

    const totalHintsUsed = completed.reduce((a, r) => a + r.hintRevealedCount, 0)

    const perCipher = new Map<string, { cipherId: string; correct: number; attempts: number; hints: number }>()
    for (const r of completed) {
      const key = String(r.cipherId)
      const cur = perCipher.get(key) ?? { cipherId: key, correct: 0, attempts: 0, hints: 0 }
      cur.attempts += 1
      if (r.correct) cur.correct += 1
      cur.hints += r.hintRevealedCount
      perCipher.set(key, cur)
    }

    return {
      completedCount: completed.length,
      correctCount,
      totalXp,
      accuracy,
      totalHintsUsed,
      perCipher: Array.from(perCipher.values()),
    }
  }, [questionRuns])

  // Completion: persist XP, streak, history, update legacy best score
  useEffect(() => {
    // Guard: prevent double-persistence from StrictMode, stale closure re-renders, etc.
    if (sessionPersistedRef.current) return
    if (!started) return
    if (!questionRuns) return
    if (currentQuestionIndex <= TOTAL_QUESTIONS - 1) return

    const completed = questionRuns.filter(Boolean) as QuestionRun[]
    if (completed.length !== TOTAL_QUESTIONS) return

    const sessionXp = completed.reduce((a, r) => a + r.earnedXp, 0)
    const correctCount = completed.filter((r) => r.correct).length

    // update best score legacy using old points model (approx): correctCount * 100
    const legacyScore = correctCount * XP_BASE_CORRECT

    const now = new Date()
    const todayKey = formatLocalDateKey(now)
    const lastKey = localStorage.getItem(STREAK_LAST_DATE_KEY)
    const lastDate = lastKey ? parseLocalDateKey(lastKey) : null

    let newStreak = 1
    if (lastDate) {
      const diff = daysBetweenLocalDates(lastDate, now)
      if (diff === 0) {
        newStreak = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10) || 0
      } else if (diff === 1) {
        newStreak = (parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10) || 0) + 1
      } else {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    setStreak(newStreak)
    setXpTotal((prev) => prev + sessionXp)

    localStorage.setItem(XP_TOTAL_KEY, String((parseInt(localStorage.getItem(XP_TOTAL_KEY) || '0', 10) || 0) + sessionXp))
    localStorage.setItem(STREAK_COUNT_KEY, String(newStreak))
    localStorage.setItem(STREAK_LAST_DATE_KEY, todayKey)

    // history
    const accuracy = completed.length ? correctCount / completed.length : 0

    const entry: ChallengeHistoryEntry = {
      id: uid(),
      createdAt: Date.now(),
      difficulty,
      xpEarned: sessionXp,
      accuracy,
      streakAfter: newStreak,
      questions: completed.map((r) => ({
        cipherId: r.cipherId,
        correct: r.correct,
        hintRevealedCount: r.hintRevealedCount,
        wrongAttempts: r.wrongAttempts,
        earnedXp: r.earnedXp,
      })),
    }

    const prevHistory = safeJsonParse<ChallengeHistoryEntry[]>(localStorage.getItem(HISTORY_KEY)) ?? []
    const nextHistory = [entry, ...prevHistory].slice(0, HISTORY_CAP)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory))

    // best score legacy
    setBestScore((prev) => {
      const next = Math.max(prev, legacyScore)
      localStorage.setItem(BEST_SCORE_KEY, String(next))
      return next
    })

    // Mark this session as persisted to prevent double-persistence
    sessionPersistedRef.current = true
  }, [started, questionRuns, currentQuestionIndex, difficulty])

  const handleReplay = useCallback(() => {
    if (!sessionChallenges) return
    successTimeoutRef.current && clearTimeout(successTimeoutRef.current)
    sessionPersistedRef.current = false
    setReplayMode(true)
    setQuestionRuns(new Array(TOTAL_QUESTIONS))
    setCurrentQuestionIndex(0)
    setExpectedCiphertext('')
    setFeedback('idle')
    setChallengeExplanation(null)
    setAnswer('')
    setShowHintIndex(0)
    setTimeLeft(TIME_LIMIT)
    setCopied(false)
  }, [sessionChallenges])

  // Completion screen when index reached end
  if (currentQuestionIndex > TOTAL_QUESTIONS - 1 && sessionSummary) {
    const sessionCorrect = sessionSummary.correctCount
    const totalQuestions = TOTAL_QUESTIONS
    const isNewBest = sessionCorrect * XP_BASE_CORRECT >= bestScore && sessionCorrect > 0

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-950/30">
              <svg className="h-7 w-7 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Challenge Complete</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Here&apos;s your session summary.</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">XP Earned</span>
              <div className="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400">{sessionSummary.totalXp}</div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">pts</span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Accuracy</span>
              <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {Math.round(sessionSummary.accuracy * 100)}<span className="text-lg text-zinc-400 dark:text-zinc-500">%</span>
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">correct</span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Streak</span>
              <div className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">{streak}</div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">days</span>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Hints Used</span>
              <div className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{sessionSummary.totalHintsUsed}</div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">total</span>
            </div>
          </div>

          {isNewBest && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400">
              🏆 New personal best!
            </div>
          )}

          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Correct</div>
                <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{sessionCorrect}/{totalQuestions}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total XP (All-time)</div>
                <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{xpTotal + sessionSummary.totalXp}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center flex flex-col sm:flex-row gap-3 sm:justify-center">
            <button
              type="button"
              onClick={handleReplay}
              disabled={!sessionChallenges}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:focus:ring-offset-zinc-900 disabled:opacity-50"
            >
              Replay Same Session
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
              onClick={() => {
                setStarted(false)
                setSessionChallenges(null)
                setQuestionRuns(null)
                setCurrentQuestionIndex(0)
                setExpectedCiphertext('')
                setReplayMode(false)
              }}
            >
              New Session
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Challenge History (Latest)</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Saved locally in your browser.</p>
          </div>
        </div>
      </div>
    )
  }

  // Difficulty picker
  if (!started) {
    const options: { value: ChallengeDifficulty; label: string; desc: string }[] = [
      { value: 'easy', label: 'Easy', desc: 'Short words, simple ciphers, no key needed.' },
      { value: 'medium', label: 'Medium', desc: 'Word-length input with keyword ciphers.' },
      { value: 'hard', label: 'Hard', desc: 'Short phrases, multi-word keys, Playfair included.' },
    ]

    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Choose Your Difficulty</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Pick a difficulty to start the challenge.</p>
          <div role="radiogroup" aria-label="Challenge difficulty" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={difficulty === opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  difficulty === opt.value
                    ? 'border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/30'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700'
                }`}
              >
                <div className="text-sm font-bold text-zinc-900 dark:text-white">{opt.label}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={startNewSession}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
          >
            Start Challenge
          </button>
        </div>
      </div>
    )
  }

  // Hydration loading
  if (!isHydrated || !sessionChallenges) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center items-center h-64">
        <span className="text-zinc-500 dark:text-zinc-400 animate-pulse font-medium text-sm">Initializing Challenge Engine…</span>
      </div>
    )
  }

  if (!currentChallenge) {
    return (
      <div className="max-w-3xl mx-auto flex justify-center items-center h-64">
        <span className="text-zinc-500 dark:text-zinc-400 animate-pulse font-medium text-sm">Generating challenge…</span>
      </div>
    )
  }

  const timePercent = (timeLeft / TIME_LIMIT) * 100
  const maxHintIndex = Math.max(0, currentChallenge.hints.length - 1)
  const hintText = currentChallenge.hints[showHintIndex]

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400" aria-hidden="true">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Category</div>
                <div className="mt-0.5 text-sm font-bold text-teal-600 dark:text-teal-400 truncate">Classical Ciphers</div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" aria-hidden="true">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">XP Total</div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-white truncate" aria-live="polite">{xpTotal} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">pts</span></div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" aria-hidden="true">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Best Score</div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900 dark:text-white truncate">{bestScore} <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">pts</span></div>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" aria-hidden="true">
                <svg className="absolute inset-0 h-12 w-12 -rotate-90 transform" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="138.2"
                    strokeDashoffset={138.2 - 138.2 * (timeLeft / TIME_LIMIT)}
                    className="transition-all duration-1000 ease-linear"
                    style={{ stroke: timeLeft <= 10 ? '#ef4444' : 'currentColor' }}
                  />
                </svg>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Time Left</div>
                <div className={`mt-0.5 text-lg font-mono font-bold tabular-nums truncate ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`} aria-live={timeLeft <= 10 ? 'assertive' : 'polite'} aria-atomic="true">00:{timeLeft.toString().padStart(2, '0')}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">Challenge</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {currentCipherName}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    currentChallenge.difficulty === 'easy'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : currentChallenge.difficulty === 'hard'
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400'
                  }`}
                >
                  {currentChallenge.difficulty}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-lg">
                  Decrypt the following ciphertext using the provided key and enter the original plaintext.
                </p>
                {currentChallenge.key && (
                  <div className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <span className="text-xl leading-none">🔑</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Key</span>
                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{currentChallenge.key}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Ciphertext</label>
                  {expectedCiphertext && !loading && !error && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Copy ciphertext"
                      type="button"
                    >
                      {copied ? (
                        <>
                          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 shadow-inner dark:border-zinc-800">
                  <div className="absolute inset-y-0 left-0 w-1 bg-teal-500 dark:bg-teal-400" />
                  <div className="px-5 py-6 sm:px-8">
                    {error ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-2.5">
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-semibold text-red-400">{String(error)}</span>
                            <span className="text-xs text-red-300/80">Could not generate expected ciphertext.</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRetryExpectedCiphertext}
                            disabled={loading || cipherRetryCount >= MAX_CIPHERTEXT_RETRIES}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30 dark:focus:ring-offset-zinc-900"
                          >
                            <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{loading ? 'Retrying…' : 'Retry'}</span>
                            <span className="text-[10px] opacity-80">({cipherRetryCount}/{MAX_CIPHERTEXT_RETRIES})</span>
                          </button>
                        </div>
                      </div>
                    ) : loading || !expectedCiphertext ? (

                      <div className="flex items-center gap-3">
                        <span className="flex h-3 w-3">
                          <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-teal-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-500" />
                        </span>
                        <span className="font-mono text-sm text-zinc-400">Encrypting payload...</span>
                      </div>
                    ) : (
                      <div className="font-mono text-lg leading-loose tracking-[0.25em] text-zinc-100 break-all sm:text-xl selection:bg-teal-500/30">{expectedCiphertext}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-6">
                <label htmlFor="answer" className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Your Answer
                </label>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      id="answer"
                      type="text"
                      value={answer}
                      onChange={(e) => {
                        setAnswer(e.target.value)
                        if (feedback !== 'idle') setFeedback('idle')
                      }}
                      placeholder="Enter decrypted plaintext..."
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3.5 font-mono text-base text-zinc-900 uppercase shadow-sm outline-none transition-all placeholder:text-zinc-400 placeholder:normal-case focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-teal-500 dark:focus:bg-zinc-900 dark:focus:ring-teal-500/20"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={loading || !!error || feedback === 'correct'}
                    />
                    <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">Enter letters and spaces only. Punctuation is ignored.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !!error || feedback === 'correct' || !answer.trim()}
                    className="flex h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 font-semibold text-white shadow-sm transition-all hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus:ring-offset-zinc-900"
                  >
                    <span>Submit</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>

                {feedback === 'correct' && (
                  <div
                    aria-live="polite"
                    className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 animate-[fadeIn_0.3s_ease-out] dark:border-emerald-800/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Correct! Well done.
                  </div>
                )}

                {feedback === 'incorrect' && (
                  <div
                    aria-live="polite"
                    className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-[shakeX_0.4s_ease-out] dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Incorrect. Try again!
                  </div>
                )}

                {feedback === 'incorrect' && challengeExplanation && (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Wrong Answer Explanation</div>
                    <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">{challengeExplanation.title}</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                      {challengeExplanation.details.map((d, idx) => (
                        <li key={idx} className="mt-1">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10 transition-all hover:shadow-md">
            <div className="flex gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-widest text-blue-900 dark:text-blue-100">Pro Tip</h4>
                <p className="mt-1 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                  Classical ciphers often preserve word lengths. Look for single-letter words like "A" or "I", or common short words like "THE" to crack the code faster.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Your Progress</h3>
            <div className="flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-white">
              <span>Question {currentQuestionIndex + 1} of {TOTAL_QUESTIONS}</span>
              <span className="text-teal-600 dark:text-teal-400">{progressPercent}%</span>
            </div>
            <div className="mt-4 flex h-2 w-full gap-1">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 rounded-full transition-colors ${
                    i < currentQuestionIndex
                      ? 'bg-teal-500 dark:bg-teal-400'
                      : i === currentQuestionIndex
                        ? 'bg-teal-200 dark:bg-teal-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">How to Play</h3>
            <ol className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">1</span>
                <span>Read the ciphertext and the given key.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">2</span>
                <span>Decrypt the ciphertext mentally or on paper.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">3</span>
                <span>Enter the original plaintext before time runs out.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-900 dark:bg-zinc-800 dark:text-white">4</span>
                <span>Earn XP (hint usage reduces your XP) and build your streak.</span>
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Hint System</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{showHintIndex}/{currentChallenge.hints.length - 1}</span>
              </div>
            </div>

            {hintText ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4" aria-live="polite">{hintText}</p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Stuck? Reveal a hint to guide your thinking.</p>
            )}

            <button
              type="button"
              onClick={handleShowHint}
              disabled={showHintIndex >= maxHintIndex || currentChallenge.hints.length === 0}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:bg-teal-500 dark:hover:bg-teal-400 dark:disabled:bg-zinc-800/50 dark:disabled:text-zinc-600"
            >
              {showHintIndex >= maxHintIndex ? 'All Hints Revealed' : 'Show Next Hint'}
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 transition-all hover:shadow-md">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Challenge History</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Your last {HISTORY_CAP} runs are saved locally. Replay lets you try the exact same session again.
            </p>
          </div>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-valuenow={timeLeft} aria-valuemin={0} aria-valuemax={TIME_LIMIT} aria-label="Time remaining">
        <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : 'bg-teal-600 dark:bg-teal-500'}`} style={{ width: `${timePercent}%` }} />
      </div>
    </div>
  )
}
