
import type { CipherDefinition } from '@/lib/cipher/registry'

export type PipelineDataType = 'utf8-text' | 'hex-string' | 'base64-string' | 'raw-bytes'
export type StageCategory = 'encode' | 'decode' | 'encrypt' | 'hash' | 'sign' | 'verify' | 'kdf'
export interface PipelineStage {
  id: string
  cipherId: string
  category: StageCategory
  name: string
  params: Record<string, string>
  inputType: PipelineDataType
  outputType: PipelineDataType
}
export interface PipelineStageResult {
  stageId: string
  stageName: string
  cipherId: string
  input: string
  output: string
  inputType: PipelineDataType
  outputType: PipelineDataType
  durationMs: number
  steps: Array<Record<string, unknown>>
  error?: string
}
export interface PipelineExecutionResult {
  initialInput: string
  finalOutput: string
  stageResults: PipelineStageResult[]
  success: boolean
  totalDurationMs: number
  cancelled?: boolean
}
export interface PipelinePreset {
  id: string
  name: string
  description: string
  stages: Omit<PipelineStage, 'id'>[]
}
export interface PipelineCompatibility {
  compatible: boolean
  severity: 'none' | 'warning' | 'error'
  message?: string
  adapter?: 'base64-encode' | 'hex-encode'
}
export function inferDataType(cipher: CipherDefinition, direction: 'encrypt'|'decrypt' = 'encrypt'): PipelineDataType {
  if (cipher.id === 'hex-encode') return 'hex-string'
  if (cipher.id === 'base64-encode') return 'base64-string'
  if (cipher.id === 'hex-decode' || cipher.id === 'base64-decode') return 'utf8-text'
  if (cipher.category === 'hash') return 'hex-string'
  if (cipher.category === 'asymmetric') return 'raw-bytes'
  if (cipher.category === 'symmetric') return 'raw-bytes'
  return 'utf8-text'
}
export function getStageTypes(cipher: CipherDefinition, direction: 'encrypt'|'decrypt' = 'encrypt'): Pick<PipelineStage,'inputType'|'outputType'> {
  if (cipher.id === 'hex-encode') return { inputType:'utf8-text', outputType:'hex-string' }
  if (cipher.id === 'hex-decode') return { inputType:'hex-string', outputType:'utf8-text' }
  if (cipher.id === 'base64-encode') return { inputType:'utf8-text', outputType:'base64-string' }
  if (cipher.id === 'base64-decode') return { inputType:'base64-string', outputType:'utf8-text' }
  if (cipher.category === 'hash') return { inputType:'utf8-text', outputType:'hex-string' }
  if (cipher.category === 'symmetric') return { inputType: direction === 'decrypt' ? 'raw-bytes' : 'utf8-text', outputType:'raw-bytes' }
  if (cipher.category === 'asymmetric') return { inputType:'utf8-text', outputType:'raw-bytes' }
  return { inputType:'utf8-text', outputType:'utf8-text' }
}
export function checkCompatibility(from: PipelineDataType, to: PipelineDataType): PipelineCompatibility {
  if (from === to) return { compatible:true, severity:'none' }
  if (from === 'raw-bytes' && to === 'utf8-text') {
    return { compatible:false, severity:'warning', message:'Raw bytes are being passed into a text stage. Encode the bytes first.', adapter:'base64-encode' }
  }
  if (from === 'raw-bytes' && to === 'hex-string') {
    return { compatible:false, severity:'warning', message:'Raw bytes need a textual representation before this stage.', adapter:'hex-encode' }
  }
  if (from === 'utf8-text' && to === 'raw-bytes') return { compatible:true, severity:'none', message:'Text will be encoded as bytes by the cipher implementation.' }
  if (from === 'hex-string' && to === 'utf8-text') return { compatible:false, severity:'warning', message:'Hex text is not decoded to plaintext yet.', adapter:'hex-encode' }
  return { compatible:false, severity:'warning', message:`${from} → ${to} may reinterpret the intermediate representation.` }
}
export const CATEGORY_BY_REGISTRY_CATEGORY: Record<string, StageCategory> = {
  classical:'encrypt', symmetric:'encrypt', asymmetric:'encrypt', hash:'hash'
}
