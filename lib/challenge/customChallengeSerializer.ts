import type { CipherName } from '../cipher/types'
import type { ChallengeDifficulty } from './generator'
import { CIPHER_REGISTRY } from '../cipher/registry'

export const CUSTOM_CHALLENGE_VERSION = 1
export const CUSTOM_CHALLENGE_MAX_QUESTIONS = 20
export const CUSTOM_CHALLENGE_MAX_FIELD_LENGTH = 2000

export interface CustomChallengeQuestion {
  id: string
  cipherId: CipherName
  ciphertext: string
  answerHash: string
  hints: string[]
}

export interface CustomChallengeSet {
  version: number
  title: string
  difficulty: ChallengeDifficulty
  timeLimit: 0 | 30 | 60 | 120
  questions: CustomChallengeQuestion[]
}

type WireQuestion = Omit<CustomChallengeQuestion, 'id'> & { i: string }
type WirePayload = {
  v: number
  t: string
  d: ChallengeDifficulty
  l: 0 | 30 | 60 | 120
  q: WireQuestion[]
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function compress(bytes: Uint8Array): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === 'undefined') return { bytes, compressed: false }
  const stream = new CompressionStream('deflate')
  const writer = stream.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  return { bytes: new Uint8Array(await new Response(stream.readable).arrayBuffer()), compressed: true }
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed challenge links.')
  const stream = new DecompressionStream('deflate')
  const writer = stream.writable.getWriter()
  await writer.write(bytes)
  await writer.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

function validateQuestion(q: unknown): q is WireQuestion {
  if (!q || typeof q !== 'object') return false
  const value = q as Record<string, unknown>
  return typeof value.i === 'string' && value.i.length <= 100 &&
    typeof value.cipherId === 'string' && value.cipherId.length <= 80 &&
    typeof value.ciphertext === 'string' && value.ciphertext.length <= CUSTOM_CHALLENGE_MAX_FIELD_LENGTH &&
    typeof value.answerHash === 'string' && /^[0-9a-f]{64}$/i.test(value.answerHash) &&
    Array.isArray(value.hints) && value.hints.length <= 4 && value.hints.every((h) => typeof h === 'string' && h.length <= 500)
}

export function normalizeAnswer(answer: string): string {
  return answer.trim().toUpperCase()
}

export async function hashChallengeAnswer(answer: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeAnswer(answer))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function serializeCustomChallengeSet(input: CustomChallengeSet): Promise<string> {
  if (!input || input.version !== CUSTOM_CHALLENGE_VERSION) throw new Error('Unsupported custom challenge version.')
  if (!input.questions.length || input.questions.length > CUSTOM_CHALLENGE_MAX_QUESTIONS) throw new Error('Invalid custom challenge question count.')
  if (input.title.length > 120) throw new Error('Challenge title is too long.')

  const payload: WirePayload = {
    v: CUSTOM_CHALLENGE_VERSION,
    t: input.title.slice(0, 120),
    d: input.difficulty,
    l: input.timeLimit,
    q: input.questions.map((q) => ({ i: q.id, cipherId: q.cipherId, ciphertext: q.ciphertext, answerHash: q.answerHash, hints: q.hints.slice(0, 4) })),
  }
  const raw = new TextEncoder().encode(JSON.stringify(payload))
  const packed = await compress(raw)
  return `${packed.compressed ? 'c' : 'j'}${bytesToBase64Url(packed.bytes)}`
}

export async function deserializeCustomChallengeSet(serialized: string): Promise<CustomChallengeSet> {
  if (!serialized || serialized.length > 100_000) throw new Error('Challenge link is invalid or too large.')
  const mode = serialized[0]
  if (mode !== 'c' && mode !== 'j') throw new Error('Unknown challenge encoding.')
  const encoded = serialized.slice(1)
  const rawBytes = base64UrlToBytes(encoded)
  const bytes = mode === 'c' ? await decompress(rawBytes) : rawBytes
  if (bytes.byteLength > 250_000) throw new Error('Challenge payload is too large.')
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid challenge payload.')
  const payload = parsed as Partial<WirePayload>
  if (payload.v !== CUSTOM_CHALLENGE_VERSION || !Array.isArray(payload.q) || !payload.q.every(validateQuestion)) throw new Error('Invalid challenge payload.')
  if (payload.q.length === 0 || payload.q.length > CUSTOM_CHALLENGE_MAX_QUESTIONS) throw new Error('Invalid challenge question count.')
  if (payload.q.some((q) => !CIPHER_REGISTRY.some((cipher) => cipher.id === q.cipherId && cipher.category !== 'hash' && cipher.category !== 'asymmetric'))) throw new Error('Unsupported cipher in challenge payload.')
  if (typeof payload.t !== 'string' || payload.t.length > 120) throw new Error('Invalid challenge title.')
  if (!['easy', 'medium', 'hard'].includes(String(payload.d))) throw new Error('Invalid challenge difficulty.')
  if (![0, 30, 60, 120].includes(Number(payload.l))) throw new Error('Invalid challenge time limit.')

  return {
    version: CUSTOM_CHALLENGE_VERSION,
    title: payload.t,
    difficulty: payload.d as ChallengeDifficulty,
    timeLimit: payload.l as CustomChallengeSet['timeLimit'],
    questions: payload.q.map((q) => ({ id: q.i, cipherId: q.cipherId as CipherName, ciphertext: q.ciphertext, answerHash: q.answerHash.toLowerCase(), hints: q.hints })),
  }
}
