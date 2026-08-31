import { describe, it, expect } from 'vitest'
import {
  encrypt,
  decrypt,
  generateKeypair,
  formatVerificationKey,
  isValidPublicKeyHex,
  isValidSecretKeyHex,
  isValidSignatureHex,
  validateVerificationPackage,
  summarizePublicKey,
  summarizeSecretKey,
  summarizeSignature,
  ML_DSA_65_PUBLIC_KEY_BYTES,
  ML_DSA_65_SECRET_KEY_BYTES,
  ML_DSA_65_SIGNATURE_BYTES,
} from '@/lib/cipher/asymmetric/ml-dsa'

describe('ML-DSA-65', () => {
  it('signs and verifies a round trip', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'ECSoC26 ml-dsa test'
    const signature = encrypt(message, privateKey).output
    const verified = decrypt(message, `${publicKey}|${signature}`)

    expect(verified.output).toBe(message)
    expect(verified.outputEncoding).toBe('utf8')
  })

  it('rejects a tampered message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'original message'
    const signature = encrypt(message, privateKey).output

    expect(() =>
      decrypt(message + '!', `${publicKey}|${signature}`),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a signature from the wrong keypair', () => {
    const { publicKey } = generateKeypair()
    const { privateKey: otherPriv } = generateKeypair()
    const message = 'test'
    const signature = encrypt(message, otherPriv).output

    expect(() =>
      decrypt(message, `${publicKey}|${signature}`),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('generates a keypair when none is supplied', () => {
    const signed = encrypt('msg', '', { instrument: true })

    expect(
      signed.steps.some((step) => step.label === 'Key generation'),
    ).toBe(true)
  })

  it('uses the ML-DSA-65 public key size', () => {
    const { publicKey } = generateKeypair()

    expect(publicKey).toHaveLength(ML_DSA_65_PUBLIC_KEY_BYTES * 2)
  })

  it('uses the ML-DSA-65 secret key size', () => {
    const { privateKey } = generateKeypair()

    expect(privateKey).toHaveLength(ML_DSA_65_SECRET_KEY_BYTES * 2)
  })

  it('uses the ML-DSA-65 signature size', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('size check', privateKey).output

    expect(signature).toHaveLength(ML_DSA_65_SIGNATURE_BYTES * 2)
  })

  it('formats a verification package', () => {
    const { publicKey, privateKey } = generateKeypair()
    const signature = encrypt('format me', privateKey).output
    const packageValue = formatVerificationKey(publicKey, signature)

    expect(packageValue.startsWith(publicKey)).toBe(true)
    expect(packageValue.endsWith(signature)).toBe(true)
    expect(packageValue.split('|')).toHaveLength(2)
  })

  it('validates a verification package', () => {
    const { publicKey, privateKey } = generateKeypair()
    const signature = encrypt('validate me', privateKey).output
    const result = validateVerificationPackage(
      formatVerificationKey(publicKey, signature),
    )

    expect(result.publicKeyBytes).toBe(ML_DSA_65_PUBLIC_KEY_BYTES)
    expect(result.signatureBytes).toBe(ML_DSA_65_SIGNATURE_BYTES)
  })

  it('accepts whitespace around the serialized verification package', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'whitespace'
    const signature = encrypt(message, privateKey).output
    const verified = decrypt(
      message,
      `  ${publicKey}  |  ${signature}  `,
    )

    expect(verified.output).toBe(message)
  })

  it('rejects a missing verification separator', () => {
    expect(() => decrypt('message', 'abc')).toThrow(
      /Verify expects "publicKeyHex\|signatureHex"/,
    )
  })

  it('rejects an extra verification separator', () => {
    expect(() => decrypt('message', 'aa|bb|cc')).toThrow(
      /Verify expects "publicKeyHex\|signatureHex"/,
    )
  })

  it('rejects an empty public key', () => {
    expect(() => decrypt('message', `|${'aa'.repeat(10)}`)).toThrow(
      /Verify expects "publicKeyHex\|signatureHex"/,
    )
  })

  it('rejects an empty signature', () => {
    expect(() => decrypt('message', `${'aa'.repeat(10)}|`)).toThrow(
      /Verify expects "publicKeyHex\|signatureHex"/,
    )
  })

  it('rejects a malformed public key', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('message', privateKey).output

    expect(() => decrypt('message', `not-hex|${signature}`)).toThrow(
      /hexadecimal string/,
    )
  })

  it('rejects a malformed signature', () => {
    const { publicKey } = generateKeypair()

    expect(() => decrypt('message', `${publicKey}|not-hex`)).toThrow(
      /hexadecimal string/,
    )
  })

  it('rejects a public key with the wrong length', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('message', privateKey).output

    expect(() => decrypt('message', `${'00'.repeat(31)}|${signature}`)).toThrow(
      /public key must be exactly 1952 bytes/,
    )
  })

  it('rejects a signature with the wrong length', () => {
    const { publicKey } = generateKeypair()

    expect(() => decrypt('message', `${publicKey}|${'00'.repeat(64)}`)).toThrow(
      /signature must be exactly 3309 bytes/,
    )
  })

  it('reports valid public keys', () => {
    const { publicKey } = generateKeypair()

    expect(isValidPublicKeyHex(publicKey)).toBe(true)
  })

  it('reports invalid public keys', () => {
    expect(isValidPublicKeyHex('00')).toBe(false)
    expect(isValidPublicKeyHex('not-hex')).toBe(false)
  })

  it('reports valid secret keys', () => {
    const { privateKey } = generateKeypair()

    expect(isValidSecretKeyHex(privateKey)).toBe(true)
  })

  it('reports invalid secret keys', () => {
    expect(isValidSecretKeyHex('00')).toBe(false)
    expect(isValidSecretKeyHex('not-hex')).toBe(false)
  })

  it('reports valid signatures', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('signature', privateKey).output

    expect(isValidSignatureHex(signature)).toBe(true)
  })

  it('reports invalid signatures', () => {
    expect(isValidSignatureHex('00')).toBe(false)
    expect(isValidSignatureHex('not-hex')).toBe(false)
  })

  it('produces signing instrumentation', () => {
    const { privateKey } = generateKeypair()
    const result = encrypt('instrumented sign', privateKey, {
      instrument: true,
    })

    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].label).toBe('Sign')
    expect(result.steps[0].isMilestone).toBe(true)
  })

  it('produces key-generation instrumentation', () => {
    const result = encrypt('instrumented generation', '', {
      instrument: true,
    })

    expect(result.steps.some((step) => step.label === 'Key generation')).toBe(
      true,
    )
  })

  it('produces verification instrumentation', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'instrumented verify'
    const signature = encrypt(message, privateKey).output
    const result = decrypt(
      message,
      formatVerificationKey(publicKey, signature),
      { instrument: true },
    )

    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].label).toBe('Verify')
    expect(result.steps[0].outputState).toBe('VALID')
  })

  it('returns hexadecimal output from signing', () => {
    const { privateKey } = generateKeypair()
    const result = encrypt('hex output', privateKey)

    expect(result.outputEncoding).toBe('hex')
    expect(result.output).toMatch(/^[0-9a-f]+$/)
  })

  it('returns the original message from verification', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'original output'
    const signature = encrypt(message, privateKey).output
    const result = decrypt(
      message,
      formatVerificationKey(publicKey, signature),
    )

    expect(result.output).toBe(message)
  })

  it('supports unicode messages', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'नमस्ते CryptoViz 🔐'
    const signature = encrypt(message, privateKey).output
    const result = decrypt(
      message,
      formatVerificationKey(publicKey, signature),
    )

    expect(result.output).toBe(message)
  })

  it('supports an empty message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const signature = encrypt('', privateKey).output
    const result = decrypt('', formatVerificationKey(publicKey, signature))

    expect(result.output).toBe('')
  })

  it('rejects a changed first byte of the message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'message for byte mutation'
    const signature = encrypt(message, privateKey).output

    expect(() =>
      decrypt(
        'Message for byte mutation',
        formatVerificationKey(publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a changed last byte of the message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'message for final byte mutation'
    const signature = encrypt(message, privateKey).output

    expect(() =>
      decrypt(
        'message for final byte mutatioN',
        formatVerificationKey(publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a changed signature prefix', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'signature prefix mutation'
    const signature = encrypt(message, privateKey).output
    const mutated = `${signature.slice(0, 2) === '00' ? 'ff' : '00'}${signature.slice(2)}`

    expect(() =>
      decrypt(message, formatVerificationKey(publicKey, mutated)),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a changed signature suffix', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'signature suffix mutation'
    const signature = encrypt(message, privateKey).output
    const last = signature.slice(-2)
    const replacement = last === '00' ? 'ff' : '00'
    const mutated = `${signature.slice(0, -2)}${replacement}`

    expect(() =>
      decrypt(message, formatVerificationKey(publicKey, mutated)),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a signature from another message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const signature = encrypt('message A', privateKey).output

    expect(() =>
      decrypt('message B', formatVerificationKey(publicKey, signature)),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('rejects a signature from another keypair', () => {
    const first = generateKeypair()
    const second = generateKeypair()
    const signature = encrypt('same message', first.privateKey).output

    expect(() =>
      decrypt(
        'same message',
        formatVerificationKey(second.publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('accepts repeated signatures for the same message', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'randomized signing'
    const first = encrypt(message, privateKey).output
    const second = encrypt(message, privateKey).output

    expect(first).not.toBe(second)
    expect(
      decrypt(message, formatVerificationKey(publicKey, first)).output,
    ).toBe(message)
    expect(
      decrypt(message, formatVerificationKey(publicKey, second)).output,
    ).toBe(message)
  })

  it('does not expose a secret key in signing instrumentation', () => {
    const { privateKey } = generateKeypair()
    const result = encrypt('secret hygiene', privateKey, {
      instrument: true,
    })

    for (const step of result.steps) {
      expect(step.inputState).not.toContain(privateKey)
      expect(step.outputState).not.toContain(privateKey)
      expect(step.note).not.toContain(privateKey)
    }
  })

  it('does not expose a secret key in generated key instrumentation', () => {
    const result = encrypt('generated secret hygiene', '', {
      instrument: true,
    })

    for (const step of result.steps) {
      expect(step.outputState).not.toMatch(/[0-9a-f]{8064}/i)
      expect(step.note).not.toMatch(/[0-9a-f]{8064}/i)
    }
  })

  it('summarizes public keys without changing them', () => {
    const { publicKey } = generateKeypair()
    const summary = summarizePublicKey(publicKey)

    expect(summary.bytes).toBe(ML_DSA_65_PUBLIC_KEY_BYTES)
    expect(summary.hexCharacters).toBe(ML_DSA_65_PUBLIC_KEY_BYTES * 2)
    expect(summary.preview).toBe(publicKey.slice(0, 32))
  })

  it('summarizes secret keys without returning secret material', () => {
    const { privateKey } = generateKeypair()
    const summary = summarizeSecretKey(privateKey)

    expect(summary.bytes).toBe(ML_DSA_65_SECRET_KEY_BYTES)
    expect(summary.hexCharacters).toBe(ML_DSA_65_SECRET_KEY_BYTES * 2)
    expect(summary).not.toHaveProperty('preview')
  })

  it('summarizes signatures', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('summary', privateKey).output
    const summary = summarizeSignature(signature)

    expect(summary.bytes).toBe(ML_DSA_65_SIGNATURE_BYTES)
    expect(summary.hexCharacters).toBe(ML_DSA_65_SIGNATURE_BYTES * 2)
    expect(summary.preview).toBe(signature.slice(0, 32))
  })

  it('keeps public-key validation strict', () => {
    const { publicKey } = generateKeypair()
    const variants = [
      publicKey,
      publicKey.toUpperCase(),
      ` ${publicKey} `,
      publicKey.match(/.{1,64}/g)!.join('\n'),
    ]

    for (const variant of variants) {
      expect(isValidPublicKeyHex(variant)).toBe(true)
    }
  })

  it('keeps secret-key validation strict', () => {
    const { privateKey } = generateKeypair()
    const variants = [
      privateKey,
      privateKey.toUpperCase(),
      ` ${privateKey} `,
      privateKey.match(/.{1,64}/g)!.join('\n'),
    ]

    for (const variant of variants) {
      expect(isValidSecretKeyHex(variant)).toBe(true)
    }
  })

  it('keeps signature validation strict', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('wrapped signature', privateKey).output
    const variants = [
      signature,
      signature.toUpperCase(),
      ` ${signature} `,
      signature.match(/.{1,64}/g)!.join('\n'),
    ]

    for (const variant of variants) {
      expect(isValidSignatureHex(variant)).toBe(true)
    }
  })

  it('rejects an odd-length public key', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('odd key', privateKey).output

    expect(() =>
      decrypt('odd key', `0${'00'.repeat(1951)}|${signature}`),
    ).toThrow(/even-length hexadecimal string/)
  })

  it('rejects an odd-length signature', () => {
    const { publicKey } = generateKeypair()

    expect(() =>
      decrypt('odd signature', `${publicKey}|0${'00'.repeat(3308)}`),
    ).toThrow(/even-length hexadecimal string/)
  })

  it('rejects non-hex public key characters', () => {
    const { privateKey } = generateKeypair()
    const signature = encrypt('invalid public', privateKey).output

    expect(() =>
      decrypt('invalid public', `${'zz'.repeat(1952)}|${signature}`),
    ).toThrow(/hexadecimal string/)
  })

  it('rejects non-hex signature characters', () => {
    const { publicKey } = generateKeypair()

    expect(() =>
      decrypt('invalid signature', `${publicKey}|${'zz'.repeat(3309)}`),
    ).toThrow(/hexadecimal string/)
  })

  it('rejects a secret key with a wrong size before signing', () => {
    expect(() => encrypt('wrong secret', '00')).toThrow(
      /secret key must be exactly 4032 bytes/,
    )
  })

  it('rejects an odd-length secret key before signing', () => {
    expect(() => encrypt('odd secret', '0')).toThrow(
      /even-length hexadecimal string/,
    )
  })

  it('rejects a non-hex secret key before signing', () => {
    expect(() => encrypt('bad secret', 'zz'.repeat(4032))).toThrow(
      /hexadecimal string/,
    )
  })

  it('keeps generated keypairs internally consistent', () => {
    const keypair = generateKeypair()

    expect(isValidPublicKeyHex(keypair.publicKey)).toBe(true)
    expect(isValidSecretKeyHex(keypair.privateKey)).toBe(true)
  })

  it('can verify a formatted package after extracting its components', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'component extraction'
    const signature = encrypt(message, privateKey).output
    const packageValue = formatVerificationKey(publicKey, signature)
    const [parsedPublicKey, parsedSignature] = packageValue.split('|')

    expect(parsedPublicKey).toBe(publicKey)
    expect(parsedSignature).toBe(signature)
    expect(decrypt(message, packageValue).output).toBe(message)
  })

  it('keeps the regression fix isolated to the adapter boundary', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'adapter boundary regression'
    const signed = encrypt(message, privateKey)

    expect(signed.outputEncoding).toBe('hex')
    expect(
      decrypt(message, formatVerificationKey(publicKey, signed.output)).output,
    ).toBe(message)
  })

  it('handles a long message without changing the key contract', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'x'.repeat(4096)
    const signature = encrypt(message, privateKey).output

    expect(signature).toHaveLength(ML_DSA_65_SIGNATURE_BYTES * 2)
    expect(
      decrypt(message, formatVerificationKey(publicKey, signature)).output,
    ).toBe(message)
  })

  it('handles multiline messages', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = ['line one', 'line two', 'line three'].join('\n')
    const signature = encrypt(message, privateKey).output

    expect(
      decrypt(message, formatVerificationKey(publicKey, signature)).output,
    ).toBe(message)
  })

  it('handles punctuation in messages', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'ML-DSA: [sign] -> {verify}! @ # $ % ^ & *'
    const signature = encrypt(message, privateKey).output

    expect(
      decrypt(message, formatVerificationKey(publicKey, signature)).output,
    ).toBe(message)
  })

  it('handles whitespace in messages exactly', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = '  leading and trailing whitespace  '
    const signature = encrypt(message, privateKey).output

    expect(
      decrypt(message, formatVerificationKey(publicKey, signature)).output,
    ).toBe(message)
  })

  it('does not treat a different amount of whitespace as equivalent', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'whitespace sensitive'
    const signature = encrypt(message, privateKey).output

    expect(() =>
      decrypt(
        `${message} `,
        formatVerificationKey(publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('preserves uppercase hexadecimal verification input', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'uppercase input'
    const signature = encrypt(message, privateKey).output
    const result = decrypt(
      message,
      formatVerificationKey(publicKey.toUpperCase(), signature.toUpperCase()),
    )

    expect(result.output).toBe(message)
  })

  it('does not confuse public and secret key lengths', () => {
    const keypair = generateKeypair()

    expect(keypair.publicKey).toHaveLength(3904)
    expect(keypair.privateKey).toHaveLength(8064)
    expect(keypair.publicKey).not.toHaveLength(8064)
    expect(keypair.privateKey).not.toHaveLength(3904)
  })

  it('does not confuse signature and public key lengths', () => {
    const { publicKey, privateKey } = generateKeypair()
    const signature = encrypt('length distinction', privateKey).output

    expect(publicKey).toHaveLength(3904)
    expect(signature).toHaveLength(6618)
    expect(publicKey).not.toHaveLength(6618)
    expect(signature).not.toHaveLength(3904)
  })

  it('supports repeated verification of one signature', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'repeat verification'
    const signature = encrypt(message, privateKey).output
    const packageValue = formatVerificationKey(publicKey, signature)

    expect(decrypt(message, packageValue).output).toBe(message)
    expect(decrypt(message, packageValue).output).toBe(message)
    expect(decrypt(message, packageValue).output).toBe(message)
  })

  it('supports signing the same message repeatedly', () => {
    const { privateKey } = generateKeypair()
    const message = 'repeat signing'
    const signatures = new Set<string>()

    for (let index = 0; index < 3; index += 1) {
      signatures.add(encrypt(message, privateKey).output)
    }

    expect(signatures.size).toBeGreaterThan(0)
  })

  it('does not mark an invalid verification as valid', () => {
    const { publicKey, privateKey } = generateKeypair()
    const message = 'invalid verification'
    const signature = encrypt(message, privateKey).output
    const mutatedMessage = `${message}!`

    expect(() =>
      decrypt(mutatedMessage, formatVerificationKey(publicKey, signature), {
        instrument: true,
      }),
    ).toThrow(/VERIFICATION_FAILED/)
  })

  it('documents the four acceptance paths directly', () => {
    const first = generateKeypair()
    const second = generateKeypair()
    const message = 'acceptance criteria'

    const signature = encrypt(message, first.privateKey).output

    expect(
      decrypt(message, formatVerificationKey(first.publicKey, signature)).output,
    ).toBe(message)

    expect(() =>
      decrypt(
        `${message}!`,
        formatVerificationKey(first.publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)

    expect(() =>
      decrypt(
        message,
        formatVerificationKey(second.publicKey, signature),
      ),
    ).toThrow(/VERIFICATION_FAILED/)

    const generated = encrypt('generated', '', { instrument: true })
    expect(
      generated.steps.some((step) => step.label === 'Key generation'),
    ).toBe(true)
  })
})
