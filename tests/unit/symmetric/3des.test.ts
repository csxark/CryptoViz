/**
 * Regression test for 3DES instrumentation issue.
 * Verifies that the instrumented path exactly matches the fast path.
 */
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../../lib/cipher/symmetric/3des'

describe('3DES Instrumented vs Fast Path', () => {
  const input = 'HELLO'
  const key3 = '0123456789abcdef0123456789abcdef0123456789abcdef' // 24 bytes (3-key mode)
  const key2 = '0123456789abcdef0123456789abcdef' // 16 bytes (2-key mode)

  it('instrumented encrypt produces IDENTICAL output to fast encrypt (3-key)', () => {
    const fast = encrypt(input, key3, { instrument: false })
    const instrumented = encrypt(input, key3, { instrument: true })

    expect(instrumented.output).toBe(fast.output)
  })

  it('instrumented encrypt produces IDENTICAL output to fast encrypt (2-key)', () => {
    const fast = encrypt(input, key2, { instrument: false })
    const instrumented = encrypt(input, key2, { instrument: true })

    expect(instrumented.output).toBe(fast.output)
  })

  it('encrypt(instrument:true) then decrypt(instrument:false) correctly round-trips', () => {
    const enc = encrypt(input, key3, { instrument: true })
    const dec = decrypt(enc.output, key3, { instrument: false })

    expect(dec.output).toBe(input)
  })

  it('multi-block input — instrumented correctly mirrors fast path', () => {
    // 17 bytes of input -> padded to 24 bytes -> 3 blocks of 8
    const longInput = 'ABCDEFGHIJKLMNOPQ'
    const enc = encrypt(longInput, key3, { instrument: true })

    // Now encrypt the same thing without instrumentation
    const encFast = encrypt(longInput, key3, { instrument: false })

    expect(enc.output).toBe(encFast.output)
  })
})
