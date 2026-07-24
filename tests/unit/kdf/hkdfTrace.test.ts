import { describe, it, expect } from 'vitest'
import { describeHkdfStages, RFC_5869_PRESETS } from '../../../lib/kdf/hkdfTrace'
import { deriveHkdfKey } from '../../../lib/kdf/hkdf'

describe('HKDF UI Trace Helpers', () => {
  it('generates 4 stage steps for HKDF derivation', () => {
    const stages = describeHkdfStages({
      ikmLength: 20,
      saltHex: '000102030405060708090a0b0c',
      infoStr: 'context-info',
      hash: 'SHA-256',
      keyLength: 42,
    })

    expect(stages).toHaveLength(4)
    expect(stages[0].label).toContain('Stage 1')
    expect(stages[1].label).toContain('Stage 2')
    expect(stages[2].label).toContain('Stage 3')
    expect(stages[3].label).toContain('Stage 4')
  })

  it('handles empty salt in stage descriptions', () => {
    const stages = describeHkdfStages({
      ikmLength: 20,
      saltHex: '',
      infoStr: '',
      hash: 'SHA-256',
      keyLength: 32,
    })

    expect(stages[0].detail).toContain('default zero-padded salt')
  })

  it('contains valid RFC 5869 presets', () => {
    expect(RFC_5869_PRESETS.length).toBeGreaterThanOrEqual(3)

    const preset1 = RFC_5869_PRESETS[0]
    const derived = deriveHkdfKey({
      ikm: preset1.ikm,
      salt: preset1.salt,
      info: preset1.info,
      keyLength: preset1.keyLength,
      hash: preset1.hash,
    })

    expect(derived.derivedKeyHex).toBe(preset1.expectedOkm)
  })
})
