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

function autokeyCore(
  input: string,
  key: string,
  decrypt: boolean,
  instrument: boolean,
  options: CipherOptions = {}
): CipherResult {
  const start = performance.now()
  const cleanKey = prepareKey(key)
  const preserveFormatting = !!options.preserveFormatting

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

  if (preserveFormatting) {
    const plainLetters: string[] = []
    let alphaIdx = 0

    for (let i = 0; i < input.length; i++) {
      const char = input[i]
      if (!/[a-zA-Z]/.test(char)) {
        output += char
        continue
      }

      const isUpper = char >= 'A' && char <= 'Z'
      const pUpper = char.toUpperCase()
      const pIdx = pUpper.charCodeAt(0) - 65
      let kChar: string
      let outUpper: string

      if (!decrypt) {
        kChar = alphaIdx < cleanKey.length ? cleanKey[alphaIdx] : plainLetters[alphaIdx - cleanKey.length]
        const kIdx = kChar.charCodeAt(0) - 65
        outUpper = String.fromCharCode(mod26(pIdx + kIdx) + 65)
        plainLetters.push(pUpper)
      } else {
        kChar = keystream[alphaIdx]
        const kIdx = kChar.charCodeAt(0) - 65
        outUpper = String.fromCharCode(mod26(pIdx - kIdx) + 65)
        keystream.push(outUpper)
      }

      const outChar = isUpper ? outUpper : outUpper.toLowerCase()
      output += outChar

      if (instrument) {
        steps.push({
          index: steps.length,
          label: `Character ${alphaIdx + 1} — '${char}'`,
          inputState: char,
          outputState: outChar,
          highlight: [i],
          note: `Key char '${kChar}' (alpha position ${alphaIdx}): ${decrypt ? `'${pUpper}' - '${kChar}'` : `'${pUpper}' + '${kChar}'`} mod 26 = '${outUpper}'`,
        })
      }

      alphaIdx++
    }
  } else {
    const text = prepareText(input)
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
  }

  return {
    output,
    outputEncoding: 'utf8',
    steps,
    metadata: METADATA,
    durationMs: performance.now() - start,
  }
}

/**
 * Encrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Encrypt operation.
 * @param key Input required by the Encrypt operation.
 * @param options Input required by the Encrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function encrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return autokeyCore(input, key, false, !!options.instrument, options)
}

/**
 * Decrypt cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @param input Input required by the Decrypt operation.
 * @param key Input required by the Decrypt operation.
 * @param options Input required by the Decrypt operation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export function decrypt(input: string, key: string, options: CipherOptions = {}): CipherResult {
  validateInput(input)
  return autokeyCore(input, key, true, !!options.instrument, options)
}

/**
 * TEST VECTORS cipher-engine utility export.
 *
 * This API is intentionally documented at the engine boundary so callers
 * can understand the input contract without opening the implementation.
 * @returns The operation result produced by the cipher engine.
 * @see https://csrc.nist.gov/pubs/fips/46-3/final — FIPS 46-3.
 */
export const TEST_VECTORS: TestVector[] = [
  {
    input: 'ATTACKATDAWN',
    key: 'QUEENLY',
    expected: 'QNXEPVYTWTWP',
    description: 'Verified round-trip vector — key shorter than plaintext, so autokey extension kicks in',
  },
]
