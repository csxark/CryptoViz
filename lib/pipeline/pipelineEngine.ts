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

export function getPipelineAlgorithms() {
  return CIPHER_REGISTRY.filter((c) => c.id !== 'bloom-filter').map((cipher) => ({
    cipher,
    category: cipher.category === 'hash' ? ('hash' as const) : ('encrypt' as const),
    inputType: 'utf8-text' as const,
    outputType: 'raw-bytes' as const,
  }))
}

export function createPipelineStage(cipherId: string, index = 0): PipelineStage {
  const cipher = CIPHER_REGISTRY.find((c) => c.id === cipherId)
  if (!cipher) throw new Error(`Unknown cipher: ${cipherId}`)
  
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

/**
 * Executes a single pipeline stage synchronously, supporting worker fallback and direct dispatch.
 */
export function executeStage(input: string, stage: PipelineStage): string {
  const cipher = CIPHER_REGISTRY.find((c) => c.id === stage.cipherId)
  
  // Direct registry execution fallback if sync execution is requested or worker is unavailable
  switch (stage.cipherId.toLowerCase()) {
    case 'base64-encode':
      return Buffer.from(input, 'utf-8').toString('base64')
    case 'base64-decode':
      return Buffer.from(input, 'base64').toString('utf-8')
    case 'caesar': {
      const shift = Number(stage.params?.shift ?? 3)
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(((char.charCodeAt(0) - start + shift) % 26) + start)
      })
    }
    case 'rot13':
      return input.replace(/[a-zA-Z]/g, (char) => {
        const start = char <= 'z' ? 97 : 65
        return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start)
      })
    case 'sha256':
    case 'md5': {
      const crypto = require('crypto')
      const algorithm = stage.cipherId === 'md5' ? 'md5' : 'sha256'
      return crypto.createHash(algorithm).update(input).digest('hex')
    }
    default:
      if (cipher && typeof cipher.transform === 'function') {
        const options: CipherOptions = Object.fromEntries(
          Object.entries(stage.params).map(([k, v]) => [k, /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : v])
        )
        return cipher.transform(input, options)
      }
      throw new Error(`Stage execution failed: Cipher "${stage.cipherId}" lacks a synchronous transform implementation.`)
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
    if (!cipher) throw new Error(`Cipher "${stage.cipherId}" is not registered.`)

    const stageStart = performance.now()
    try {
      const options: CipherOptions = {
        instrument: true,
        ...Object.fromEntries(
          Object.entries(stage.params).map(([k, v]) => [k, /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : v])
        ),
      }

      let workerOutput: string;
      let workerSteps: any[] = [];

      try {
        const result = await runCipherInWorker({
          cipherId: stage.cipherId,
          input: current,
          key: cipher.defaultKey,
          type: 'encrypt',
          options,
          signal,
        })
        workerOutput = result.output
        workerSteps = result.steps ?? []
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
