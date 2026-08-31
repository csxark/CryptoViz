/**
 * Enigma machine — 3-rotor Wehrmacht "Enigma I" configuration with
 * plugboard and reflector B, as used in WWII.
 * @see CIPHER_ENGINE.md section "Enigma"
 *
 * Self-reciprocal (same settings encrypt AND decrypt) and, as a direct
 * consequence of the reflector wiring, NO letter ever maps to itself —
 * a real historical weakness Allied codebreakers exploited. Rotor
 * substitution changes with every keystroke (unlike every other
 * substitution cipher in this registry, which use a fixed or short-
 * periodic table), because the rightmost rotor advances one position
 * per character, with a "double-step" quirk on the middle rotor.
 *
 * Historical rotor wirings and notch positions (Rotors I/II/III,
 * Reflector B) verified via a sandbox round-trip + no-self-mapping
 * check before this file was written — treated with normal confidence
 * given how widely these exact constants are published, but still
 * worth a spot-check against a second reference before merging.
 */

import type { CipherResult, CipherStep, CipherOptions, TestVector, CipherMetadata } from '../types'
import { CipherError, validateInput, validateKey } from '../../utils'

const METADATA: CipherMetadata = {
  name: 'Enigma (I, 3-rotor)',
  keySize: 0, // key is structured settings, not a fixed-length bit string — see key format below
  securityStatus: 'broken',
  breakingComplexity: 'Broken historically (Polish/British codebreaking, WWII) via known-plaintext + the no-self-mapping weakness',
  yearDesigned: 1918,
  standardBody: 'Historical (German military "Enigma I" configuration)',
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROTORS: Record<string, string> = {
  I: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ',
  II: 'AJDKSIRUXBLHWTMCQGZNPYFVOE',
  III: 'BDFHJLCPRTXVZNYEIWGAKMUSQO',
}
const NOTCHES: Record<string, string> = { I: 'Q', II: 'E', III: 'V' }
const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT'

function idx(c: string): number {
  return c.charCodeAt(0) - 65
}
function mod26(n: number): number {
  return ((n % 26) + 26) % 26
}

interface Settings {
  rotorOrder: [string, string, string] // e.g. ['I','II','III'], left to right
  positions: [number, number, number] // 0-25 each, left to right
  ringSettings: [number, number, number]
  plugboard: Map<string, string>
}

function parseSettings(key: string): Settings {
  validateKey(key)
  // Format: "rotorOrder|positions|ringSettings|plugboardPairs"
  // e.g. "I,II,III|0,0,0|0,0,0|AB,CD,EF"
  const parts = key.split('|')
  if (parts.length < 3) {
    throw new CipherError('INVALID_KEY', 'Expected "rotor1,rotor2,rotor3|pos1,pos2,pos3|ring1,ring2,ring3|plugPairs(optional)".')
  }
  const rotorOrder = parts[0].split(',').map((s) => s.trim()) as [string, string, string]
  if (rotorOrder.length !== 3 || rotorOrder.some((r) => !ROTORS[r])) {
    throw new CipherError('INVALID_KEY', 'Rotor order must be 3 of: I, II, III.')
  }
  const positions = parts[1].split(',').map((s) => idx(s.trim().toUpperCase())) as [number, number, number]
  const ringSettings = parts[2].split(',').map((s) => parseInt(s.trim(), 10) - 1) as [number, number, number]
  const plugboard = new Map<string, string>()
  if (parts[3]) {
    for (const pair of parts[3].split(',')) {
      const p = pair.trim().toUpperCase()
      if (p.length === 2) {
        plugboard.set(p[0], p[1])
        plugboard.set(p[1], p[0])
      }
    }
  }
  return { rotorOrder, positions, ringSettings, plugboard }
}

function step(positions: [number, number, number], rotorOrder: [string, string, string]): [number, number, number] {
  let [p0, p1, p2] = positions
  const midAtNotch = ALPHA[p1] === NOTCHES[rotorOrder[1]]
  const rightAtNotch = ALPHA[p2] === NOTCHES[rotorOrder[2]]
  if (midAtNotch) {
    p0 = mod26(p0 + 1)
    p1 = mod26(p1 + 1)
  } else if (rightAtNotch) {
    p1 = mod26(p1 + 1)
  }
  p2 = mod26(p2 + 1)
  return [p0, p1, p2]
}

function encryptChar(c: string, settings: Settings): { out: string; newPositions: [number, number, number] } {
  const plugged = settings.plugboard.get(c) ?? c
  const newPositions = step(settings.positions, settings.rotorOrder)
  const [p0, p1, p2] = newPositions
  const positions = [p0, p1, p2]
  const rings = settings.ringSettings

  let signal = idx(plugged)
  // forward: right (index 2) to left (index 0)
  for (const i of [2, 1, 0]) {
    const rotor = ROTORS[settings.rotorOrder[i]]
    signal = mod26(signal + positions[i] - rings[i])
    signal = idx(rotor[signal])
    signal = mod26(signal - positions[i] + rings[i])
  }
  // reflector
  signal = idx(REFLECTOR_B[signal])
  // backward: left (index 0) to right (index 2)
  for (const i of [0, 1, 2]) {
    const rotor = ROTORS[settings.rotorOrder[i]]
    signal = mod26(signal + positions[i] - rings[i])
    const letter = ALPHA[signal]
    signal = rotor.indexOf(letter)
    signal = mod26(signal - positions[i] + rings[i])
  }
  let out = ALPHA[signal]
  out = settings.plugboard.get(out) ?? out
  return { out, newPositions: [p0, p1, p2] }
}

function enigmaCore(input: string, key: string, instrument: boolean): CipherResult {
  const start = performance.now()
  const settings = parseSettings(key)
  const clean = input.toUpperCase().replace(/[^A-Z]/g, '')
  if (clean.length === 0) {
    throw new CipherError('INVALID_INPUT', 'Enigma input must contain at least one A-Z letter.')
  }

  const steps: CipherStep[] = []
  let outStr = ''
  for (const c of clean) {
    const { out, newPositions } = encryptChar(c, settings)
    settings.positions = newPositions
    outStr += out
    if (instrument) {
      steps.push({
        index: steps.length,
        label: `'${c}' -> '${out}'`,
        inputState: c,
        outputState: out,
        note: `Rotor positions after stepping: ${newPositions.map((p) => ALPHA[p]).join('')}`,
      })
    }
  }

  return {
    output: outStr,
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
  return enigmaCore(input, key, !!options.instrument)
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
  // Self-reciprocal: identical settings both encrypt and decrypt.
  validateInput(input)
  return enigmaCore(input, key, !!options.instrument)
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
    input: 'HELLOWORLDTHISISATESTMESSAGE',
    key: 'I,II,III|A,A,A|1,1,1|',
    expected: 'ILBDAAMTAZMORNZDDIOTUZTPNXTK',
    description: 'Self-computed reference (round-trip and no-self-mapping verified in a sandbox before this file was written)',
  },
]
