/**
 * Autokey Vigenère Cipher.
 * Keystream = key followed by the plaintext itself (encrypt) or the
 * progressively-recovered plaintext (decrypt) — removes the periodicity
 * that makes standard repeating-key Vigenère breakable via Kasiski analysis.
 * Verified vector: key="QUEENLY", plaintext="ATTACKATDAWN" -> "QNXEPVYTWTWP"
 * @see CIPHER_ENGINE.md section 1.3 (Vigenere) for the base pattern
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA = {
  name: 'Autokey Vigenère',
  securityStatus: 'broken' as const,
  breakingComplexity: 'Vulnerable to probable-word (crib) attacks since the key eventually equals shifted plaintext; not vulnerable to Kasiski examination like repeating-key Vigenère',
  yearDesigned: 1586,
}

function mod26(n: number): number {
  return ((n % 26) + 26) % 26
}

function prepareKey(key: string): string {
  validateKey(key)
  const clean = key.toUpperCase().replace(/[^A-Z]/g, '')
  if (clean.length === 0) {
    throw new CipherError('INVALID_KEY', 'Autokey Vigenère requires at least one alphabetic character in the key.')
  }
  return clean
}

function prepareText(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '')
}

function autokeyCore(input: string, key: string, decrypt: boolean, instrument: boolean): CipherResult {
  const start = performance.now()
  const cleanKey = prepareKey(key)
  const text = prepareText(input)

  const steps: CipherStep[] = []
  if (instrument) {
    steps.push({
      index: 0,
      label: 'Key setup',
      inputState: cleanKey,
      outputState: decrypt ? 'reconstructed progressively from decrypted plaintext' : `${cleanKey} + plaintext`,
      note: decrypt
        ? `Unlike encryption, the keystream beyond the key length can't be known upfront — each character must be decrypted before it can extend the stream for later positions.`
        : `Keystream = key ("${cleanKey}") followed by the plaintext itself, extending indefinitely without repetition.`,
      isMilestone: true,
    })
  }

  let output = ''
  const keystream: string[] = cleanKey.split('')

  for (let i = 0; i < text.length; i++) {
    const p = text[i]
    let outChar: string
    let kChar: string

    if (!decrypt) {
      kChar = i < keystream.length ? keystream[i] : text[i - cleanKey.length]
      const pIdx = p.charCodeAt(0) - 65
      const kIdx = kChar.charCodeAt(0) - 65
      outChar = String.fromCharCode(mod26(pIdx + kIdx) + 65)
    } else {
      kChar = keystream[i]
      const cIdx = p.charCodeAt(0) - 65
      const kIdx = kChar.charCodeAt(0) - 65
      outChar = String.fromCharCode(mod26(cIdx - kIdx) + 65)
      keystream.push(outChar) // recovered plaintext extends the stream
    }
    output += outChar

    if (instrument) {
      steps.push({
        index: steps.length,
        label: `Character ${i + 1} — '${p}'`,
        inputState: p,
        outputState: outChar,
        highlight: [i],
        note: `Key char '${kChar}' (position ${i}): ${decrypt ? `'${p}' - '${kChar}'` : `'${p}' + '${kChar}'`} mod 26 = '${outChar}'`,
      })
    }
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return autokeyCore(input, key, false, !!options.instrument)
}

export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return autokeyCore(input, key, true, !!options.instrument)
}

export const TEST_VECTORS: TestVector[] = [
  {
    input: 'ATTACKATDAWN',
    key: 'QUEENLY',
    expected: 'QNXEPVYTWTWP',
    description: 'Verified round-trip vector — key shorter than plaintext, so autokey extension kicks in',
  },
]
