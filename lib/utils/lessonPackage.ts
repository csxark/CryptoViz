import { sha256 } from '@noble/hashes/sha2.js'
import type { CipherDirection, CipherStep, CipherMetadata, Encoding } from '../cipher/types'
import { CIPHER_REGISTRY } from '../cipher/registry'

export const LESSON_SCHEMA_VERSION = 1 as const
export const LESSON_FILE_EXTENSION = '.cryptoviz' as const

export interface LessonQuizCheckpoint {
  stepIndex: number
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export interface LessonAnnotatedStep {
  stepIndex: number
  markdownExplanation: string
  highlightConcepts: string[]
}

export interface LessonMetadata {
  title: string
  author: string
  targetCipher: string
  prerequisites: string[]
  createdAt: string
}

export interface LessonExecutionContext {
  algorithmId: string
  key: string
  input: string
  options: Record<string, string | number | boolean>
  direction: CipherDirection
}

export interface LessonIntegrity {
  manifestHash: string
}

export interface LessonPackage {
  schemaVersion: typeof LESSON_SCHEMA_VERSION
  metadata: LessonMetadata
  executionContext: LessonExecutionContext
  annotatedSteps: LessonAnnotatedStep[]
  quizCheckpoints: LessonQuizCheckpoint[]
  steps: CipherStep[]
  output: string
  outputEncoding: Encoding
  stepNotes: Record<number, string>
  integrity: LessonIntegrity
}

export type LessonPackageValidationResult =
  | { success: true; lesson: LessonPackage }
  | { success: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'string') return JSON.stringify(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']'
  }
  if (isRecord(obj)) {
    const keys = Object.keys(obj).sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}'
  }
  return String(obj)
}

export function computeManifestHash(lesson: Omit<LessonPackage, 'integrity'>): string {
  const canonical = canonicalStringify(lesson)
  const hashBytes = sha256(new TextEncoder().encode(canonical))
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function buildLessonPackage({
  metadata,
  executionContext,
  annotatedSteps,
  quizCheckpoints,
  steps,
  output,
  outputEncoding,
  stepNotes,
}: {
  metadata: LessonMetadata
  executionContext: LessonExecutionContext
  annotatedSteps: LessonAnnotatedStep[]
  quizCheckpoints: LessonQuizCheckpoint[]
  steps: CipherStep[]
  output: string
  outputEncoding: Encoding
  stepNotes: Record<number, string>
}): LessonPackage {
  const packageWithoutIntegrity = {
    schemaVersion: LESSON_SCHEMA_VERSION,
    metadata: structuredClone(metadata),
    executionContext: structuredClone(executionContext),
    annotatedSteps: structuredClone(annotatedSteps),
    quizCheckpoints: structuredClone(quizCheckpoints),
    steps: structuredClone(steps),
    output,
    outputEncoding,
    stepNotes: structuredClone(stepNotes),
  }

  const manifestHash = computeManifestHash(packageWithoutIntegrity)

  return {
    ...packageWithoutIntegrity,
    integrity: { manifestHash },
  }
}

export function verifyLessonIntegrity(lesson: LessonPackage): boolean {
  const { integrity, ...rest } = lesson
  const expectedHash = computeManifestHash(rest as Omit<LessonPackage, 'integrity'>)
  return integrity.manifestHash === expectedHash
}

function validateAnnotatedStep(value: unknown): value is LessonAnnotatedStep {
  if (!isRecord(value)) return false
  if (typeof value.stepIndex !== 'number' || !Number.isInteger(value.stepIndex) || value.stepIndex < 0) return false
  if (typeof value.markdownExplanation !== 'string') return false
  if (!Array.isArray(value.highlightConcepts) || !isStringArray(value.highlightConcepts)) return false
  return true
}

function validateQuizCheckpoint(value: unknown): value is LessonQuizCheckpoint {
  if (!isRecord(value)) return false
  if (typeof value.stepIndex !== 'number' || !Number.isInteger(value.stepIndex) || value.stepIndex < 0) return false
  if (typeof value.question !== 'string' || !value.question.trim()) return false
  if (!Array.isArray(value.options) || value.options.length < 2 || !isStringArray(value.options)) return false
  if (typeof value.correctOptionIndex !== 'number' || !Number.isInteger(value.correctOptionIndex)) return false
  if (value.correctOptionIndex < 0 || value.correctOptionIndex >= value.options.length) return false
  if (typeof value.explanation !== 'string') return false
  return true
}

function validateCipherStep(value: unknown): value is CipherStep {
  if (!isRecord(value)) return false
  if (typeof value.index !== 'number' || !Number.isInteger(value.index) || value.index < 0) return false
  if (typeof value.label !== 'string') return false
  if (typeof value.inputState !== 'string') return false
  if (typeof value.outputState !== 'string') return false
  if (typeof value.note !== 'string' && value.note !== undefined) return false
  return true
}

export function validateLessonPackage(value: unknown): LessonPackageValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: 'Lesson file must contain a JSON object.' }
  }

  if (value.schemaVersion !== LESSON_SCHEMA_VERSION) {
    return { success: false, error: `Unsupported lesson schema version. Expected ${LESSON_SCHEMA_VERSION}.` }
  }

  if (!isRecord(value.metadata)) {
    return { success: false, error: 'Lesson metadata is missing or invalid.' }
  }

  if (typeof value.metadata.title !== 'string' || !value.metadata.title.trim()) {
    return { success: false, error: 'Lesson title is required.' }
  }

  if (typeof value.metadata.author !== 'string') {
    return { success: false, error: 'Lesson author is required.' }
  }

  if (typeof value.metadata.targetCipher !== 'string') {
    return { success: false, error: 'Lesson target cipher is required.' }
  }

  if (!Array.isArray(value.metadata.prerequisites) || !isStringArray(value.metadata.prerequisites)) {
    return { success: false, error: 'Lesson prerequisites must be an array of strings.' }
  }

  if (!isRecord(value.executionContext)) {
    return { success: false, error: 'Execution context is missing.' }
  }

  if (
    typeof value.executionContext.algorithmId !== 'string' ||
    !CIPHER_REGISTRY.some((c) => c.id === value.executionContext.algorithmId)
  ) {
    return { success: false, error: 'Execution context references an unsupported cipher.' }
  }

  if (value.executionContext.direction !== 'encrypt' && value.executionContext.direction !== 'decrypt') {
    return { success: false, error: 'Execution context direction is invalid.' }
  }

  if (typeof value.executionContext.input !== 'string' || typeof value.executionContext.key !== 'string') {
    return { success: false, error: 'Execution context input and key are required.' }
  }

  if (!isRecord(value.executionContext.options)) {
    return { success: false, error: 'Execution context options must be an object.' }
  }

  if (!Array.isArray(value.annotatedSteps) || !value.annotatedSteps.every(validateAnnotatedStep)) {
    return { success: false, error: 'Annotated steps are missing or malformed.' }
  }

  if (!Array.isArray(value.quizCheckpoints) || !value.quizCheckpoints.every(validateQuizCheckpoint)) {
    return { success: false, error: 'Quiz checkpoints are missing or malformed.' }
  }

  if (!Array.isArray(value.steps) || !value.steps.every(validateCipherStep)) {
    return { success: false, error: 'Cipher steps are missing or malformed.' }
  }

  if (typeof value.output !== 'string') {
    return { success: false, error: 'Output is required.' }
  }

  if (typeof value.outputEncoding !== 'string') {
    return { success: false, error: 'Output encoding is required.' }
  }

  if (!isRecord(value.stepNotes)) {
    return { success: false, error: 'Step notes must be an object.' }
  }

  if (!isRecord(value.integrity) || typeof value.integrity.manifestHash !== 'string') {
    return { success: false, error: 'Integrity hash is missing.' }
  }

  const lesson: LessonPackage = {
    schemaVersion: LESSON_SCHEMA_VERSION,
    metadata: {
      title: String(value.metadata.title),
      author: String(value.metadata.author),
      targetCipher: String(value.metadata.targetCipher),
      prerequisites: value.metadata.prerequisites,
      createdAt: typeof value.metadata.createdAt === 'string' ? value.metadata.createdAt : new Date().toISOString(),
    },
    executionContext: {
      algorithmId: String(value.executionContext.algorithmId),
      key: String(value.executionContext.key),
      input: String(value.executionContext.input),
      options: value.executionContext.options as Record<string, string | number | boolean>,
      direction: value.executionContext.direction as CipherDirection,
    },
    annotatedSteps: value.annotatedSteps as LessonAnnotatedStep[],
    quizCheckpoints: value.quizCheckpoints as LessonQuizCheckpoint[],
    steps: value.steps as CipherStep[],
    output: String(value.output),
    outputEncoding: value.outputEncoding as Encoding,
    stepNotes: value.stepNotes as Record<number, string>,
    integrity: { manifestHash: String(value.integrity.manifestHash) },
  }

  if (!verifyLessonIntegrity(lesson)) {
    return { success: false, error: 'Integrity check failed — the lesson file may have been tampered with.' }
  }

  return { success: true, lesson }
}

export function parseLessonPackageJson(json: string): LessonPackageValidationResult {
  try {
    return validateLessonPackage(JSON.parse(json))
  } catch {
    return { success: false, error: 'The selected file is not valid JSON.' }
  }
}

export function getLessonFilename(lesson: LessonPackage): string {
  const safe = lesson.metadata.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${safe}${LESSON_FILE_EXTENSION}`
}

export function downloadLessonPackage(lesson: LessonPackage): void {
  const blob = new Blob([JSON.stringify(lesson, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = getLessonFilename(lesson)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
