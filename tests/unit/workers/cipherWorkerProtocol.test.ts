import { describe, expect, it } from 'vitest'
import { validateWorkerMessage } from '@/lib/workers/cipher-worker-protocol'

describe('cipher worker runtime protocol validation', () => {
  it('accepts a valid EXECUTE message', () => {
    const result = validateWorkerMessage({
      type: 'EXECUTE',
      requestId: 'req-1',
      payload: {
        type: 'encrypt',
        cipherId: 'caesar',
        input: 'HELLO',
        key: '3',
        options: { instrument: true },
      },
    })

    expect(result.success).toBe(true)
  })

  it('rejects malformed execute payloads before dispatch', () => {
    const result = validateWorkerMessage({
      type: 'EXECUTE',
      requestId: 'req-malformed',
      payload: {
        type: 'encrypt',
        cipherId: { malicious: true },
        input: 'HELLO',
        key: '3',
      },
    })

    expect(result).toEqual({
      success: false,
      requestId: 'req-malformed',
      error: 'EXECUTE payload.cipherId must be a non-empty string.',
    })
  })

  it('rejects unsafe nested option values', () => {
    const result = validateWorkerMessage({
      type: 'EXECUTE',
      requestId: 'req-malicious',
      payload: {
        type: 'decrypt',
        cipherId: 'aes',
        input: 'ciphertext',
        key: 'secret',
        options: { callback: () => 'unexpected function' },
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('options')
  })

  it('validates CANCEL independently', () => {
    expect(validateWorkerMessage({ type: 'CANCEL', jobId: 'job-1' }).success).toBe(true)

    const invalid = validateWorkerMessage({ type: 'CANCEL', jobId: 123 })
    expect(invalid).toEqual({
      success: false,
      requestId: 'unknown',
      error: 'CANCEL jobId must be a non-empty string.',
    })
  })

  it('accepts PING and rejects unknown message types', () => {
    expect(validateWorkerMessage({ type: 'PING', requestId: 'ping-1' }).success).toBe(true)

    const invalid = validateWorkerMessage({ type: 'EXECUTE', requestId: 'req-2' })
    expect(invalid.success).toBe(false)

    const unknown = validateWorkerMessage({ type: 'DELETE_ALL', requestId: 'req-3' })
    expect(unknown).toEqual({
      success: false,
      requestId: 'req-3',
      error: 'Unsupported worker message type: DELETE_ALL.',
    })
  })

  it('rejects prototype-pollution keys inside options', () => {
    const options = JSON.parse('{"__proto__":{"polluted":true}}')
    const result = validateWorkerMessage({
      type: 'EXECUTE',
      requestId: 'req-prototype',
      payload: {
        type: 'encrypt',
        cipherId: 'caesar',
        input: 'HELLO',
        key: '3',
        options,
      },
    })

    expect(result.success).toBe(false)
  })
})
