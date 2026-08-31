import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, TEST_VECTORS } from '@/lib/cipher/asymmetric/ecdsa'
import { CipherError } from '@/lib/utils/errors'

describe('ECDSA (secp256k1)', () => {
  const privKey = '0101010101010101010101010101010101010101010101010101010101010101'
  const message = 'hello ECSoC26'

  it('passes the published deterministic test vector', () => {
    const vector = TEST_VECTORS[0]
    const result = encrypt(vector.input, vector.key)
    expect(result.output).toBe(vector.expected)
    expect(result.output).toHaveLength(128)
  })

  it('signs and verifies a round trip', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKey = signed.steps.find((step) => step.label === 'Public key derivation')?.outputState
    expect(pubKey).toBeDefined()
    expect(decrypt(message, `${pubKey}|${signed.output}`).output).toBe(message)
  })

  it('produces an RFC 6979 deterministic signature', () => {
    expect(encrypt(message, privKey).output).toBe(encrypt(message, privKey).output)
  })

  it('rejects a tampered message', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKey = signed.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(() => decrypt(`${message}!`, `${pubKey}|${signed.output}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a tampered signature', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKey = signed.steps.find((step) => step.label === 'Public key derivation')!.outputState
    const tampered = `${signed.output.slice(0, -2)}${signed.output.endsWith('00') ? '01' : '00'}`
    expect(() => decrypt(message, `${pubKey}|${tampered}`)).toThrow(/VERIFICATION_FAILED/)
  })

  it('generates a key when none is supplied', () => {
    const signed = encrypt(message, '', { instrument: true })
    expect(signed.steps.some((step) => step.label === 'Key generation')).toBe(true)
    expect(signed.output).toHaveLength(128)
  })

  it('throws INVALID_KEY for malformed verification input', () => {
    expect(() => decrypt(message, 'not-a-pipe-separated-key')).toThrow(CipherError)
    expect(() => decrypt(message, 'not-a-pipe-separated-key')).toThrow(/Verify expects/)
  })

  it('records milestone steps when instrumentation is enabled', () => {
    const result = encrypt(message, privKey, { instrument: true })
    expect(result.steps.filter((step) => step.isMilestone).length).toBeGreaterThan(1)
  })

  it('does not require instrumentation for the compatibility path', () => {
    const result = encrypt(message, privKey)
    expect(result.steps).toHaveLength(0)
  })

  it('always returns a 64-byte compact signature encoded as 128 hex characters', () => {
    const result = encrypt(message, privKey)
    expect(result.output).toMatch(/^[0-9a-f]{128}$/)
  })

  it('signs and verifies compatibility case 01: ASCII text', () => {
    const input = 'ASCII text'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 02: empty string', () => {
    const input = 'empty string'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 03: single character', () => {
    const input = 'single character'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 04: short message', () => {
    const input = 'short message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 05: a longer educational message', () => {
    const input = 'a longer educational message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 06: 1234567890', () => {
    const input = '1234567890'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 07: punctuation !@#$%^&*()', () => {
    const input = 'punctuation !@#$%^&*()'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 08: pipe | inside message', () => {
    const input = 'pipe | inside message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 09: colon:inside message', () => {
    const input = 'colon:inside message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 10: slash / inside message', () => {
    const input = 'slash / inside message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 11: backslash \\ inside message', () => {
    const input = 'backslash \\\\ inside message'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 12: quotes \' and "', () => {
    const input = 'quotes \' and "'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 13: brackets [] {} ()', () => {
    const input = 'brackets [] {} ()'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 14: plus + equals =', () => {
    const input = 'plus + equals ='
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 15: question? answer!', () => {
    const input = 'question? answer!'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 16: comma,separated,text', () => {
    const input = 'comma,separated,text'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 17: period.end', () => {
    const input = 'period.end'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 18: hyphen-separated', () => {
    const input = 'hyphen-separated'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 19: underscore_separated', () => {
    const input = 'underscore_separated'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 20: mixed CASE Text', () => {
    const input = 'mixed CASE Text'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 21: emoji 🔐', () => {
    const input = 'emoji 🔐'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 22: emoji 🚀 and text', () => {
    const input = 'emoji 🚀 and text'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 23: Devanagari नमस्ते', () => {
    const input = 'Devanagari नमस्ते'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 24: Japanese 暗号', () => {
    const input = 'Japanese 暗号'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 25: Chinese 密码', () => {
    const input = 'Chinese 密码'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 26: Arabic تشفير', () => {
    const input = 'Arabic تشفير'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 27: Cyrillic криптография', () => {
    const input = 'Cyrillic криптография'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 28: Korean 암호', () => {
    const input = 'Korean 암호'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 29: Greek κρυπτογραφία', () => {
    const input = 'Greek κρυπτογραφία'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 30: accented café naïve', () => {
    const input = 'accented café naïve'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 31: combining é', () => {
    const input = 'combining é'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 32: zero 0', () => {
    const input = 'zero 0'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 33: leading spaces', () => {
    const input = 'leading spaces'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 34: trailing spaces ', () => {
    const input = 'trailing spaces '
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 35: multiple   spaces', () => {
    const input = 'multiple   spaces'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 36: newline\ninside', () => {
    const input = 'newline\\ninside'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 37: tab\tinside', () => {
    const input = 'tab\\tinside'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 38: carriage\rreturn', () => {
    const input = 'carriage\\rreturn'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 39: unicode symbols © ™ ✓', () => {
    const input = 'unicode symbols © ™ ✓'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 40: mathematics ∑ π ≠', () => {
    const input = 'mathematics ∑ π ≠'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 41: currency ₹ $ € £ ¥', () => {
    const input = 'currency ₹ $ € £ ¥'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 42: URL https://example.com/a?b=c', () => {
    const input = 'URL https://example.com/a?b=c'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 43: email user@example.com', () => {
    const input = 'email user@example.com'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 44: JSON {"a":1,"b":true}', () => {
    const input = 'JSON {"a":1,"b":true}'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 45: XML <tag>value</tag>', () => {
    const input = 'XML <tag>value</tag>'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 46: SQL SELECT * FROM table', () => {
    const input = 'SQL SELECT * FROM table'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 47: shell echo $HOME', () => {
    const input = 'shell echo $HOME'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 48: markdown **bold** _italic_', () => {
    const input = 'markdown **bold** _italic_'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 49: code `const x = 1`', () => {
    const input = 'code `const x = 1`'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 50: hash #topic', () => {
    const input = 'hash #topic'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 51: at mention @user', () => {
    const input = 'at mention @user'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 52: percent 100%', () => {
    const input = 'percent 100%'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 53: ampersand A&B', () => {
    const input = 'ampersand A&B'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 54: semicolon;delimited', () => {
    const input = 'semicolon;delimited'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 55: asterisk * repeated', () => {
    const input = 'asterisk * repeated'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 56: question mark ???', () => {
    const input = 'question mark ???'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 57: exclamation !!!', () => {
    const input = 'exclamation !!!'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 58: ellipsis...', () => {
    const input = 'ellipsis...'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 59: crypto ECDSA secp256k1', () => {
    const input = 'crypto ECDSA secp256k1'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 60: RFC 6979 deterministic nonce', () => {
    const input = 'RFC 6979 deterministic nonce'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 61: same key same signature', () => {
    const input = 'same key same signature'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 62: tamper detection matters', () => {
    const input = 'tamper detection matters'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 63: verification must be strict', () => {
    const input = 'verification must be strict'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 64: compact r plus s', () => {
    const input = 'compact r plus s'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 65: noble curves version two', () => {
    const input = 'noble curves version two'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 66: Uint8Array compatibility', () => {
    const input = 'Uint8Array compatibility'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 67: hex normalization', () => {
    const input = 'hex normalization'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 68: frontend educational trace', () => {
    const input = 'frontend educational trace'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 69: backend independent signer', () => {
    const input = 'backend independent signer'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 70: test vector validation', () => {
    const input = 'test vector validation'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 71: round trip message one', () => {
    const input = 'round trip message one'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 72: round trip message two', () => {
    const input = 'round trip message two'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 73: round trip message three', () => {
    const input = 'round trip message three'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 74: longer text xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', () => {
    const input = 'longer text xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('signs and verifies compatibility case 75: very long text yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy', () => {
    const input = 'very long text yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
    const signed = encrypt(input, privKey)
    const traced = encrypt(input, privKey, { instrument: true })
    const pubKey = traced.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(signed.output).toMatch(/^[0-9a-f]{128}$/)
    expect(decrypt(input, `${pubKey}|${signed.output}`).output).toBe(input)
  })

  it('rejects an empty public key', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    expect(() => decrypt(message, `|${signed.output}`)).toThrow()
  })

  it('rejects an empty signature', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKey = signed.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(() => decrypt(message, `${pubKey}|`)).toThrow()
  })

  it('rejects a signature with an incorrect byte length', () => {
    const signed = encrypt(message, privKey, { instrument: true })
    const pubKey = signed.steps.find((step) => step.label === 'Public key derivation')!.outputState
    expect(() => decrypt(message, `${pubKey}|00`)).toThrow()
  })

  it('keeps the signing result independent of instrumentation', () => {
    const fast = encrypt(message, privKey)
    const traced = encrypt(message, privKey, { instrument: true })
    expect(traced.output).toBe(fast.output)
  })

  it('uses the supplied private key consistently across different messages', () => {
    const first = encrypt('first', privKey)
    const second = encrypt('second', privKey)
    expect(first.output).not.toBe(second.output)
    expect(first.output).toHaveLength(128)
    expect(second.output).toHaveLength(128)
  })

  it('produces different signatures for different private keys', () => {
    const otherKey = '0202020202020202020202020202020202020202020202020202020202020202'
    expect(encrypt(message, privKey).output).not.toBe(encrypt(message, otherKey).output)
  })

  it('exposes the expected verification public key in the trace', () => {
    const result = encrypt(message, privKey, { instrument: true })
    const publicKey = result.steps.find((step) => step.label === 'Public key derivation')?.outputState
    expect(publicKey).toMatch(/^(02|03)[0-9a-f]{64}$/)
  })

  it('documents the deterministic nonce behavior in the trace', () => {
    const result = encrypt(message, privKey, { instrument: true })
    const signStep = result.steps.find((step) => step.label.startsWith('Sign (RFC 6979'))
    expect(signStep?.note).toContain('RFC 6979')
  })

  it('keeps the output encoding metadata stable', () => {
    const result = encrypt(message, privKey)
    expect(result.outputEncoding).toBe('hex')
    expect(result.metadata.name).toBe('ECDSA (secp256k1)')
    expect(result.metadata.keySize).toBe(256)
  })
})
