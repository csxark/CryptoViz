import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/cipher/symmetric/aes-xts'

describe('AES-XTS', () => {
  const key = '2b7e151628aed2a6abf7158809cf4f3c|000102030405060708090a0b0c0d0e0f'
  const sector0Data = '0'.repeat(32) // one 16-byte zero block, sector 0
  const sector1Data = '0'.repeat(32) // same plaintext, sector 1

  it('round-trips a full sector', () => {
    const enc = encrypt(`0|${sector0Data}`, key)
    const dec = decrypt(`0|${enc.output}`, key)
    expect(dec.output).toBe(sector0Data)
  })

  it('the same plaintext block encrypts differently at a different sector number', () => {
    const encA = encrypt(`0|${sector0Data}`, key)
    const encB = encrypt(`1|${sector1Data}`, key)
    expect(encA.output).not.toBe(encB.output)
  })

  it('round-trips multiple blocks within one sector', () => {
    const twoBlocks = '00'.repeat(16) + '11'.repeat(16)
    const enc = encrypt(`5|${twoBlocks}`, key)
    const dec = decrypt(`5|${enc.output}`, key)
    expect(dec.output).toBe(twoBlocks)
  })

  it('rejects identical data and tweak keys', () => {
    const badKey = '2b7e151628aed2a6abf7158809cf4f3c|2b7e151628aed2a6abf7158809cf4f3c'
    expect(() => encrypt(`0|${sector0Data}`, badKey)).toThrow(/must be different/)
  })

  it('rejects data that is not a multiple of 16 bytes', () => {
    expect(() => encrypt('0|001122', key)).toThrow(/multiple of 16 bytes/)
  })
})
