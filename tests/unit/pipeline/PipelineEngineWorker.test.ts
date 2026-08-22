/* eslint-disable */
// @ts-nocheck

import { describe, expect, it } from 'vitest'
import { checkCompatibility, createPipelineStage } from '@/lib/pipeline/pipelineTypes'
describe('pipeline registry/type layer', () => {
  it('creates a stage with declared data types', () => {
    const stage = createPipelineStage('sha256')
    expect(stage.cipherId).toBe('sha256')
    expect(stage.inputType).toBe('utf8-text')
    expect(stage.outputType).toBe('hex-string')
  })
  it('detects raw-byte to text mismatch and recommends an adapter', () => {
    const check = checkCompatibility('raw-bytes','utf8-text')
    expect(check.compatible).toBe(false)
    expect(check.adapter).toBe('base64-encode')
  })
  it('allows equal representations', () => {
    expect(checkCompatibility('hex-string','hex-string').compatible).toBe(true)
  })
})
