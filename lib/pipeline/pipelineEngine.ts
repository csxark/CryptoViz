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

      const result = await runCipherInWorker({
        cipherId: stage.cipherId,
        input: current,
        key: cipher.defaultKey,
        type: 'encrypt',
        options,
        signal,
      })

      current = result.output
      stageResults.push({
        stageId: stage.id,
        stageName: stage.name,
        cipherId: stage.cipherId,
        input: stageResults.at(-1)?.output ?? initialInput,
        output: result.output,
        inputType: stage.inputType,
        outputType: stage.outputType,
        durationMs: performance.now() - stageStart,
        steps: result.steps ?? [],
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
