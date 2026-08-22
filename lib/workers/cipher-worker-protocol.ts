import type { CipherResult, CipherOptions } from '../cipher/types'
import type { WorkerMessage, WorkerPriority, WorkerRequestType } from '../../types/worker'

export interface WorkerProgressMessage {
  type: 'PROGRESS'
  jobId: string
  percent: number
  currentMilestone: string
}

export interface CipherWorkerRequestPayload {
  action: 'encrypt' | 'decrypt'
  cipherId: string
  input: string
  key: string
  id: string
  options?: CipherOptions
  priority?: WorkerPriority
  jobId?: string
}

export interface CipherWorkerResponsePayload {
  id: string
  success: boolean
  data?: {
    output: string
    ciphertext?: string
    steps?: Array<Record<string, unknown>>
    executionTimeMs?: number
  }
  error?: string
}

export interface CipherWorkerDoneMessage {
  type: 'DONE'
  jobId: string
  payload: { result: CipherResult }
}

export function createProgressMessage(
  jobId: string,
  percent: number,
  currentMilestone: string,
): WorkerProgressMessage {
  return {
    type: 'PROGRESS',
    jobId,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    currentMilestone,
  }
}

export function normalizeWorkerResponseData(result: Record<string, unknown>) {
  const outputStr = String(result.output || result.ciphertext || '')
  return {
    output: outputStr,
    ciphertext: String(result.ciphertext || outputStr),
    steps: Array.isArray(result.steps) ? result.steps as Array<Record<string, unknown>> : [],
    executionTimeMs: typeof result.durationMs === 'number' ? result.durationMs : 0,
  }
}

export function validateWorkerPayload(payload: unknown): asserts payload is CipherWorkerRequestPayload {
  if (!payload || typeof payload !== 'object') throw new Error('Worker request payload must be a non-null object.')
  const req = payload as Record<string, unknown>
  if (req.action !== 'encrypt' && req.action !== 'decrypt') throw new Error('Worker action must be "encrypt" or "decrypt".')
  if (typeof req.cipherId !== 'string' || !req.cipherId) throw new Error('Worker cipherId must be a valid non-empty string.')
  if (typeof req.id !== 'string' || !req.id) throw new Error('Worker request id must be a non-empty string.')
  if (req.priority !== undefined && !['INTERACTIVE', 'NORMAL', 'BACKGROUND'].includes(String(req.priority))) {
    throw new Error('Worker priority must be INTERACTIVE, NORMAL, or BACKGROUND.')
  }
}

const MAX_STRING_LENGTH = 1_000_000
const MAX_OPTIONS_DEPTH = 8

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isValidString(value: unknown, optional = false): value is string {
  if (value === undefined && optional) return true
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_STRING_LENGTH
}

function isPriority(value: unknown): value is WorkerPriority | undefined {
  return value === undefined || value === 'INTERACTIVE' || value === 'NORMAL' || value === 'BACKGROUND'
}

function isDirection(value: unknown): value is WorkerRequestType {
  return value === 'encrypt' || value === 'decrypt'
}

function isUnsafeKey(key: string): boolean {
  return key === '__proto__' || key === 'prototype' || key === 'constructor'
}

function isSafeOptionValue(value: unknown, depth = 0): boolean {
  if (depth > MAX_OPTIONS_DEPTH) return false
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return value.every((item) => isSafeOptionValue(item, depth + 1))
  if (!isPlainRecord(value)) return false
  return Object.entries(value).every(([key, item]) => !isUnsafeKey(key) && isSafeOptionValue(item, depth + 1))
}

function requestIdFor(raw: unknown): string {
  if (isPlainRecord(raw) && typeof raw.requestId === 'string' && raw.requestId) return raw.requestId.slice(0, MAX_STRING_LENGTH)
  return 'unknown'
}

function invalid(raw: unknown, error: string) {
  return { success: false as const, requestId: requestIdFor(raw), error }
}

export function validateWorkerMessage(raw: unknown):
  | { success: true; value: WorkerMessage }
  | { success: false; requestId: string; error: string } {
  if (!isPlainRecord(raw)) return invalid(raw, 'Worker message must be a plain object.')
  if (typeof raw.type !== 'string') return invalid(raw, 'Worker message type is required.')

  if (raw.type === 'PING') {
    if (!isValidString(raw.requestId, true)) return invalid(raw, 'PING requestId must be a non-empty string when provided.')
    return { success: true, value: raw as unknown as WorkerMessage }
  }

  if (raw.type === 'CANCEL') {
    if (!isValidString(raw.jobId)) return invalid(raw, 'CANCEL jobId must be a non-empty string.')
    if (!isValidString(raw.requestId, true)) return invalid(raw, 'CANCEL requestId must be a non-empty string when provided.')
    return { success: true, value: raw as unknown as WorkerMessage }
  }

  if (raw.type !== 'EXECUTE') return invalid(raw, `Unsupported worker message type: ${String(raw.type)}.`)
  if (!isValidString(raw.requestId)) return invalid(raw, 'EXECUTE requestId must be a non-empty string.')
  if (!isValidString(raw.jobId, true)) return invalid(raw, 'EXECUTE jobId must be a non-empty string when provided.')
  if (!isPriority(raw.priority)) return invalid(raw, 'EXECUTE priority is invalid.')
  if (!isPlainRecord(raw.payload)) return invalid(raw, 'EXECUTE payload must be a plain object.')

  const payload = raw.payload
  if (!isDirection(payload.type)) return invalid(raw, 'EXECUTE payload.type must be encrypt or decrypt.')
  if (!isValidString(payload.cipherId)) return invalid(raw, 'EXECUTE payload.cipherId must be a non-empty string.')
  if (typeof payload.input !== 'string' || payload.input.length > MAX_STRING_LENGTH) return invalid(raw, 'EXECUTE payload.input must be a string within the allowed size.')
  if (typeof payload.key !== 'string' || payload.key.length > MAX_STRING_LENGTH) return invalid(raw, 'EXECUTE payload.key must be a string within the allowed size.')
  if (payload.options !== undefined && (!isPlainRecord(payload.options) || !isSafeOptionValue(payload.options))) return invalid(raw, 'EXECUTE payload.options contains unsupported or unsafe values.')
  if (!isPriority(payload.priority)) return invalid(raw, 'EXECUTE payload.priority is invalid.')
  if (!isValidString(payload.jobId, true)) return invalid(raw, 'EXECUTE payload.jobId must be a non-empty string when provided.')

  return { success: true, value: raw as unknown as WorkerMessage }
}
