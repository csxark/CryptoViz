/**
 * Challenge Mode History Persistence & Analytics Manager.
 * Handles safe reading, saving, analytics computation, and clearing of past session runs in localStorage.
 */

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard'

export interface QuestionRunHistory {
  cipherId: string
  correct: boolean
  hintRevealedCount: number
  wrongAttempts: number
  earnedXp: number
  explanationTitle?: string
  explanationDetails?: string[]
}

export interface ChallengeHistoryEntry {
  id: string
  createdAt: number
  difficulty: ChallengeDifficulty
  xpEarned: number
  accuracy: number // 0..1
  streakAfter: number
  questions: QuestionRunHistory[]
}

export const HISTORY_KEY = 'cryptoviz_challenge_history'
export const HISTORY_CAP = 20

function safeGetItemJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSetItemJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Failed to save to localStorage', err)
  }
}

export function getChallengeHistory(): ChallengeHistoryEntry[] {
  const history = safeGetItemJson<ChallengeHistoryEntry[]>(HISTORY_KEY, [])
  if (!Array.isArray(history)) return []
  return history
}

export function saveChallengeHistoryEntry(entry: ChallengeHistoryEntry): ChallengeHistoryEntry[] {
  const current = getChallengeHistory()
  const next = [entry, ...current].slice(0, HISTORY_CAP)
  safeSetItemJson(HISTORY_KEY, next)
  return next
}

export function clearChallengeHistory(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (err) {
    console.error('Failed to clear challenge history', err)
  }
}

export function computeHistoryStats(history: ChallengeHistoryEntry[]) {
  if (!history.length) {
    return {
      totalSessions: 0,
      avgAccuracy: 0,
      totalXp: 0,
      bestStreak: 0,
    }
  }

  const totalSessions = history.length
  const totalXp = history.reduce((sum, h) => sum + (h.xpEarned || 0), 0)
  const avgAccuracy =
    history.reduce((sum, h) => sum + (h.accuracy || 0), 0) / totalSessions
  const bestStreak = Math.max(...history.map((h) => h.streakAfter || 0), 0)

  return {
    totalSessions,
    avgAccuracy,
    totalXp,
    bestStreak,
  }
}
