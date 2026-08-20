import {
  buildLessonPackage,
  computeManifestHash,
  verifyLessonIntegrity,
  validateLessonPackage,
  parseLessonPackageJson,
  getLessonFilename,
  LESSON_SCHEMA_VERSION,
  type LessonPackage,
  type LessonAnnotatedStep,
  type LessonQuizCheckpoint,
} from '../../../lib/utils/lessonPackage'
import type { CipherStep } from '../../../lib/cipher/types'

const SAMPLE_STEPS: CipherStep[] = [
  {
    index: 0,
    label: 'Initial State',
    inputState: '48656c6c6f',
    outputState: '48656c6c6f',
    note: 'Starting plaintext',
    isMilestone: true,
  },
  {
    index: 1,
    label: 'SubBytes',
    inputState: '48656c6c6f',
    outputState: 'a1b2c3d4e5',
    note: 'S-box substitution',
  },
  {
    index: 2,
    label: 'ShiftRows',
    inputState: 'a1b2c3d4e5',
    outputState: 'b2c3d4e5a1',
  },
]

const VALID_LESSON_OMITTING_INTEGRITY = {
  schemaVersion: LESSON_SCHEMA_VERSION,
  metadata: {
    title: 'AES Walkthrough',
    author: 'Prof. Smith',
    targetCipher: 'aes',
    prerequisites: ['caesar'],
    createdAt: '2025-01-15T10:00:00.000Z',
  },
  executionContext: {
    algorithmId: 'aes',
    key: '2b7e151628aed2a6abf7158809cf4f3c',
    input: '3243f6a8885a308d313198a2e0370734',
    options: { hexInput: true, mode: 'ECB', padding: true },
    direction: 'encrypt' as const,
  },
  annotatedSteps: [
    {
      stepIndex: 0,
      markdownExplanation: 'This is the initial state of the AES algorithm.',
      highlightConcepts: ['plaintext', 'state matrix'],
    },
  ],
  quizCheckpoints: [
    {
      stepIndex: 1,
      question: 'What does SubBytes do?',
      options: ['Shifts rows', 'Substitutes bytes via S-box', 'Mixes columns', 'Adds round key'],
      correctOptionIndex: 1,
      explanation: 'SubBytes performs a non-linear byte substitution using the Rijndael S-box.',
    },
  ],
  steps: SAMPLE_STEPS,
  output: 'a1b2c3d4e5',
  outputEncoding: 'hex',
  stepNotes: { '0': 'Remember the initial state' },
}

function makeValidLesson(): LessonPackage {
  return buildLessonPackage({
    metadata: VALID_LESSON_OMITTING_INTEGRITY.metadata,
    executionContext: VALID_LESSON_OMITTING_INTEGRITY.executionContext,
    annotatedSteps: VALID_LESSON_OMITTING_INTEGRITY.annotatedSteps,
    quizCheckpoints: VALID_LESSON_OMITTING_INTEGRITY.quizCheckpoints,
    steps: VALID_LESSON_OMITTING_INTEGRITY.steps,
    output: VALID_LESSON_OMITTING_INTEGRITY.output,
    outputEncoding: VALID_LESSON_OMITTING_INTEGRITY.outputEncoding,
    stepNotes: VALID_LESSON_OMITTING_INTEGRITY.stepNotes,
  })
}

describe('lessonPackage utilities', () => {
  describe('buildLessonPackage', () => {
    it('should create a lesson package with valid integrity hash', () => {
      const lesson = makeValidLesson()

      expect(lesson.schemaVersion).toBe(LESSON_SCHEMA_VERSION)
      expect(lesson.metadata.title).toBe('AES Walkthrough')
      expect(lesson.integrity.manifestHash).toBeTruthy()
      expect(typeof lesson.integrity.manifestHash).toBe('string')
      expect(lesson.integrity.manifestHash.length).toBe(64)
    })

    it('should include all provided steps', () => {
      const lesson = makeValidLesson()
      expect(lesson.steps).toHaveLength(3)
      expect(lesson.steps[0].label).toBe('Initial State')
      expect(lesson.steps[2].label).toBe('ShiftRows')
    })

    it('should include annotated steps', () => {
      const lesson = makeValidLesson()
      expect(lesson.annotatedSteps).toHaveLength(1)
      expect(lesson.annotatedSteps[0].markdownExplanation).toContain('initial state')
    })

    it('should include quiz checkpoints', () => {
      const lesson = makeValidLesson()
      expect(lesson.quizCheckpoints).toHaveLength(1)
      expect(lesson.quizCheckpoints[0].question).toBe('What does SubBytes do?')
    })

    it('should include step notes', () => {
      const lesson = makeValidLesson()
      expect(lesson.stepNotes[0]).toBe('Remember the initial state')
    })
  })

  describe('computeManifestHash', () => {
    it('should produce a deterministic 64-character hex string', () => {
      const lesson = makeValidLesson()
      const { integrity, ...rest } = lesson
      const hash1 = computeManifestHash(rest)
      const hash2 = computeManifestHash(rest)
      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(64)
      expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true)
    })

    it('should change when content changes', () => {
      const lesson1 = makeValidLesson()
      const { integrity: _i1, ...rest1 } = lesson1
      const lesson2 = makeValidLesson()
      lesson2.metadata.title = 'Different Title'
      const { integrity: _i2, ...rest2 } = lesson2

      const hash1 = computeManifestHash(rest1)
      const hash2 = computeManifestHash(rest2)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyLessonIntegrity', () => {
    it('should return true for a valid lesson', () => {
      const lesson = makeValidLesson()
      expect(verifyLessonIntegrity(lesson)).toBe(true)
    })

    it('should return false when title is tampered', () => {
      const lesson = makeValidLesson()
      lesson.metadata.title = 'Tampered Title'
      expect(verifyLessonIntegrity(lesson)).toBe(false)
    })

    it('should return false when steps are tampered', () => {
      const lesson = makeValidLesson()
      lesson.steps[0].label = 'Tampered Step'
      expect(verifyLessonIntegrity(lesson)).toBe(false)
    })

    it('should return false when output is tampered', () => {
      const lesson = makeValidLesson()
      lesson.output = 'tampered_output'
      expect(verifyLessonIntegrity(lesson)).toBe(false)
    })

    it('should return false when quiz content is tampered', () => {
      const lesson = makeValidLesson()
      lesson.quizCheckpoints[0].question = 'Modified question'
      expect(verifyLessonIntegrity(lesson)).toBe(false)
    })
  })

  describe('validateLessonPackage', () => {
    it('should accept a valid lesson package', () => {
      const lesson = makeValidLesson()
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.metadata.title).toBe('AES Walkthrough')
      }
    })

    it('should reject non-object input', () => {
      const result = validateLessonPackage('not an object')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('JSON object')
      }
    })

    it('should reject wrong schema version', () => {
      const lesson = makeValidLesson()
      ;(lesson as any).schemaVersion = 999
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('schema version')
      }
    })

    it('should reject missing title', () => {
      const lesson = makeValidLesson()
      lesson.metadata.title = ''
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('title')
      }
    })

    it('should reject unsupported cipher', () => {
      const lesson = makeValidLesson()
      lesson.executionContext.algorithmId = 'nonexistent-cipher-xyz'
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('unsupported cipher')
      }
    })

    it('should reject invalid direction', () => {
      const lesson = makeValidLesson()
      ;(lesson.executionContext as any).direction = 'sideways'
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('direction')
      }
    })

    it('should reject tampered integrity', () => {
      const lesson = makeValidLesson()
      lesson.integrity.manifestHash = 'a'.repeat(64)
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('tampered')
      }
    })

    it('should reject invalid quiz checkpoint', () => {
      const lesson = makeValidLesson()
      lesson.quizCheckpoints = [{ stepIndex: 0, question: '', options: ['a'], correctOptionIndex: 5, explanation: '' }]
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Quiz')
      }
    })

    it('should reject quiz with correctOptionIndex out of bounds', () => {
      const lesson = makeValidLesson()
      lesson.quizCheckpoints = [{ stepIndex: 0, question: 'Q?', options: ['A', 'B'], correctOptionIndex: 99, explanation: '' }]
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Quiz')
      }
    })
  })

  describe('parseLessonPackageJson', () => {
    it('should parse valid JSON lesson', () => {
      const lesson = makeValidLesson()
      const result = parseLessonPackageJson(JSON.stringify(lesson))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.lesson.metadata.title).toBe('AES Walkthrough')
      }
    })

    it('should reject invalid JSON', () => {
      const result = parseLessonPackageJson('{invalid json')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('valid JSON')
      }
    })

    it('should reject JSON that fails validation', () => {
      const result = parseLessonPackageJson(JSON.stringify({ foo: 'bar' }))
      expect(result.success).toBe(false)
    })
  })

  describe('getLessonFilename', () => {
    it('should generate a filename with .cryptoviz extension', () => {
      const lesson = makeValidLesson()
      const filename = getLessonFilename(lesson)
      expect(filename).toBe('aes-walkthrough.cryptoviz')
    })

    it('should sanitize special characters', () => {
      const lesson = makeValidLesson()
      lesson.metadata.title = 'My Lesson! @#$%^&*()'
      const filename = getLessonFilename(lesson)
      expect(filename).toBe('my-lesson.cryptoviz')
    })
  })

  describe('tolerance for missing optional fields', () => {
    it('should accept a lesson with empty annotated steps and quiz checkpoints', () => {
      const lesson = buildLessonPackage({
        metadata: VALID_LESSON_OMITTING_INTEGRITY.metadata,
        executionContext: VALID_LESSON_OMITTING_INTEGRITY.executionContext,
        annotatedSteps: [],
        quizCheckpoints: [],
        steps: VALID_LESSON_OMITTING_INTEGRITY.steps,
        output: VALID_LESSON_OMITTING_INTEGRITY.output,
        outputEncoding: VALID_LESSON_OMITTING_INTEGRITY.outputEncoding,
        stepNotes: {},
      })
      expect(verifyLessonIntegrity(lesson)).toBe(true)
      const result = validateLessonPackage(lesson)
      expect(result.success).toBe(true)
    })
  })
})
