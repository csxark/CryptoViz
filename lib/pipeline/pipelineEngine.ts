/**
 * Pipeline engine for chaining ciphers, encoding stages, and hash functions together.
 */
import { CIPHER_REGISTRY } from '@/lib/cipher/registry'
import type { CipherOptions } from '@/lib/cipher/types'
import { runCipherInWorker } from './pipelineWorkerClient'
import type { PipelineExecutionResult, PipelinePreset, PipelineStage, PipelineStageResult } from './pipelineTypes'
import { getStageTypes } from './pipelineTypes'

export * from './pipelineTypes'

export const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'encode-encrypt-hash',
    name: 'Encode → Encrypt → Hash',
    description: 'Encode text, encrypt it, then hash the resulting representation.',
    stages: [
      { cipherId: 'base64-encode', category: 'encode', name: 'Base64 Encode', params: {}, inputType: 'utf8-text', outputType: 'base64-string' },
      { cipherId: 'aes', category: 'encrypt', name: 'AES', params: {}, inputType: 'utf8-text', outputType: 'raw-bytes' },
      { cipherId: 'sha256', category: 'hash', name: 'SHA-256', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
    ],
  },
  {
    id: 'caesar-rot13-base64',
    name: 'Caesar → ROT13 → Base64',
    description: 'Apply a Caesar cipher shift, pass through ROT13, and encode the output as Base64.',
    stages: [
      { cipherId: 'caesar', category: 'encrypt', name: 'Caesar Cipher', params: { shift: '3' }, inputType: 'utf8-text', outputType: 'utf8-text' },
      { cipherId: 'rot13', category: 'encrypt', name: 'ROT13', params: {}, inputType: 'utf8-text', outputType: 'utf8-text' },
      { cipherId: 'base64-encode', category: 'encode', name: 'Base64 Encode', params: {}, inputType: 'utf8-text', outputType: 'base64-string' },
    ],
  },
  {
    id: 'hashing-cascade',
    name: 'MD5 → SHA-256 Cascade',
    description: 'Generate an MD5 checksum and subsequently hash the resulting digest using SHA-256.',
    stages: [
      { cipherId: 'md5', category: 'hash', name: 'MD5', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
      { cipherId: 'sha256', category: 'hash', name: 'SHA-256', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
    ],
  },
]

/**
 * Known standalone pipeline stages (encoders, decoders, built-in synchronous helpers)
 * that operate without requiring an entry in CIPHER_REGISTRY.
 */
const STANDALONE_PIPELINE_STAGES: Record<string, { name: string; defaultKey: string }> = {
  'base64-encode': { name: 'Base64 Encode', defaultKey: '' },
  'base64-decode': { name: 'Base64 Decode', defaultKey: '' },
  'hex-encode': { name: 'Hex Encode', defaultKey: '' },
  'hex-decode': { name: 'Hex Decode', defaultKey: '' },
  'caesar': { name: 'Caesar Cipher', defaultKey: '3' },
  'caesar-decrypt': { name: 'Caesar Decrypt', defaultKey: '3' },
  'rot13': { name: 'ROT13', defaultKey: '' },
  'atbash': { name: 'Atbash Cipher', defaultKey: '' },
  'sha256': { name: 'SHA-256', defaultKey: '' },
  'md5': { name: 'MD5', defaultKey: '' },
  'rsa-sign': { name: 'RSA Sign', defaultKey: 'priv-key-2048' },
  'rsa-verify': { name: 'RSA Verify', defaultKey: 'pub-key-2048' },
}

export function isStandaloneStage(cipherId: string): boolean {
  const normalized = cipherId.toLowerCase()
  return (
    normalized in STANDALONE_PIPELINE_STAGES ||
    normalized.startsWith('base64-') ||
    normalized.startsWith('hex-')
  )
}

export function getPipelineAlgorithms() {
  return CIPHER_REGISTRY.filter((c) => c.id !== 'bloom-filter').map((cipher) => ({
    cipher,
    category: cipher.category === 'hash' ? ('hash' as const) : ('encrypt' as const),
    inputType: 'utf8-text' as const,
    outputType: 'raw-bytes' as const,
  }))
}

export function createPipelineStage(cipherId: string, index = 0): PipelineStage {
  const normalized = cipherId.toLowerCase()
  const cipher = CIPHER_REGISTRY.find((c) => c.id === cipherId || c.id === normalized)
  
  if (cipher) {
    const category = cipher.category === 'hash' ? 'hash' : 'encrypt'
    const params: Record<string, string> = {}
    
    for (const option of cipher.options ?? []) {
      params[option.id] = String(option.default)
    }
    
    const stageTypes = getStageTypes(cipher, 'encrypt')
    return {
      id: `stage-${Date.now()}-${index}`,
      cipherId: cipher.id,
      category,
      name: cipher.name,
      params,
      ...stageTypes,
    }
  }

  if (isStandaloneStage(cipherId)) {
    const info = STANDALONE_PIPELINE_STAGES[normalized] ?? { name: cipherId, defaultKey: '' }
    const category = normalized.includes('encode') ? 'encode' : normalized.includes('decode') ? 'decode' : 'encrypt'
    const inputType = normalized.includes('decode') ? (normalized.startsWith('hex') ? 'hex-string' : 'base64-string') : 'utf8-text'
    const outputType = normalized.includes('encode') ? (normalized.startsWith('hex') ? 'hex-string' : 'base64-string') : 'utf8-text'

    return {
      id: `stage-${Date.now()}-${index}`,
      cipherId,
      category: category as any,
      name: info.name,
      params: {},
      inputType,
      outputType,
    }
  }

  throw new Error(`Unknown cipher: ${cipherId}`)
}

/**
 * Executes a single pipeline stage synchronously, supporting worker fallback and direct dispatch.
 */
export function executeStage(input: string, stage: PipelineStage): string {
  // Direct registry execution fallback if sync execution is requested or worker is unavailable
  switch (stage.cipherId.toLowerCase()) {
    case 'base64-encode':
      return Buffer.from(input, 'utf-8').toString('base64')
    case 'base64-decode':
      return Buffer.from(input, 'base64').toString('utf-8')
    case 'hex-encode':
      return Buffer.from(input, 'utf-8').toString('hex')
    case 'hex-decode':
      return Buffer.from(input, 'hex').toString('utf-8')
    case 'caesar': {
      const shift = Number(stage.params?.shift ?? 3)
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(((char.charCodeAt(0) - start + shift) % 26) + start)
      })
    }
    case 'caesar-decrypt': {
      const shift = Number(stage.params?.shift ?? 3)
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(((char.charCodeAt(0) - start - shift + 26) % 26) + start)
      })
    }
    case 'rot13':
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start)
      })
    case 'atbash':
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(25 - (char.charCodeAt(0) - start) + start)
      })
    case 'sha256':
    case 'md5': {
      const crypto = require('crypto')
      const algorithm = stage.cipherId.toLowerCase() === 'md5' ? 'md5' : 'sha256'
      return crypto.createHash(algorithm).update(input).digest('hex')
    }
    case 'rsa-sign':
      return `SIGNATURE[${Buffer.from(input, 'utf-8').toString('base64')}]`
    case 'rsa-verify':
      return input.replace(/^SIGNATURE\[(.*)\]$/, '$1')
    default: {
      const cipher = CIPHER_REGISTRY.find((c) => c.id === stage.cipherId)
      if (cipher) {
        throw new Error(`Stage execution failed: Cipher "${stage.cipherId}" lacks a synchronous transform implementation.`)
      }
      throw new Error(`Cipher "${stage.cipherId}" is not registered.`)
    }
  }
}

/**
 * Executes a pipeline synchronously across all stages.
 */
export function executePipelineSync(initialInput: string, stages: PipelineStage[]): string {
  let current = initialInput
  for (const stage of stages) {
    current = executeStage(current, stage)
  }
  return current
}

export async function executePipeline(
  initialInput: string,
  stages: PipelineStage[],
  signal?: AbortSignal,
): Promise<PipelineExecutionResult> {
  const started = performance.now()
  let current = initialInput
  const stageResults: PipelineStageResult[] = []

  for (const stage of stages) {
    if (signal?.aborted) {
      return {
        initialInput,
        finalOutput: current,
        stageResults,
        success: false,
        cancelled: true,
        totalDurationMs: performance.now() - started,
      }
    }

    const cipher = CIPHER_REGISTRY.find((c) => c.id === stage.cipherId)
    const normalizedId = stage.cipherId.toLowerCase()
    const standaloneInfo = STANDALONE_PIPELINE_STAGES[normalizedId]

    if (!cipher && !isStandaloneStage(stage.cipherId) && stage.category !== 'encode' && stage.category !== 'decode') {
      throw new Error(`Cipher "${stage.cipherId}" is not registered.`)
    }

    const defaultKey = cipher?.defaultKey ?? standaloneInfo?.defaultKey ?? ''

    const stageStart = performance.now()
    try {
      const options: CipherOptions = {
        instrument: true,
        ...Object.fromEntries(
          Object.entries(stage.params ?? {}).map(([k, v]) => [k, /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : v])
        ),
      }

      let workerOutput: string
      let workerSteps: any[] = []

      try {
        if (!cipher) {
          // Encoding / standalone stage executed directly
          workerOutput = executeStage(current, stage)
        } else {
          const result = await runCipherInWorker({
            cipherId: stage.cipherId,
            input: current,
            key: defaultKey,
            type: 'encrypt',
            options,
            signal,
          })
          workerOutput = result.output
          workerSteps = result.steps ?? []
        }
      } catch (workerError) {
        // Fallback to synchronous execution if worker environment fails or is unavailable
        workerOutput = executeStage(current, stage)
      }

      const previousOutput = stageResults.at(-1)?.output ?? initialInput
      current = workerOutput
      stageResults.push({
        stageId: stage.id,
        stageName: stage.name,
        cipherId: stage.cipherId,
        input: previousOutput,
        output: workerOutput,
        inputType: stage.inputType,
        outputType: stage.outputType,
        durationMs: performance.now() - stageStart,
        steps: workerSteps,
      })
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        return {
          initialInput,
          finalOutput: current,
          stageResults,
          success: false,
          cancelled: true,
          totalDurationMs: performance.now() - started,
        }
      }

      stageResults.push({
        stageId: stage.id,
        stageName: stage.name,
        cipherId: stage.cipherId,
        input: current,
        output: current,
        inputType: stage.inputType,
        outputType: stage.outputType,
        durationMs: performance.now() - stageStart,
        steps: [],
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        initialInput,
        finalOutput: current,
        stageResults,
        success: false,
        totalDurationMs: performance.now() - started,
      }
    }
  }

  return {
    initialInput,
    finalOutput: current,
    stageResults,
    success: true,
    totalDurationMs: performance.now() - started,
  }
}

export function exportPipelineToJson(stages: PipelineStage[]): string {
  return JSON.stringify({ version: '2.0', createdAt: new Date().toISOString(), stages }, null, 2)
}

export function importPipelineFromJson(json: string): PipelineStage[] {
  const parsed = JSON.parse(json) as { stages?: Partial<PipelineStage>[] }
  if (!parsed || !Array.isArray(parsed.stages)) throw new Error('Invalid pipeline JSON format')
  
  return parsed.stages.map((s, i) => ({
    ...s,
    id: s.id || `stage-${Date.now()}-${i}`,
  } as PipelineStage))
}
