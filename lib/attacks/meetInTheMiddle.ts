/**
 * Meet-in-the-Middle Attack on Double-DES.
 * Demonstrates why cascading two 56-bit DES keys (E_k2(E_k1(P))) only buys
 * ~57 bits of effective security instead of 112: an attacker with one known
 * (plaintext, ciphertext) pair can recover k1 and k2 by matching an
 * intermediate value from both directions, instead of brute-forcing the
 * full 2^112 keyspace.
 *
 * Reuses the existing single-DES primitives from lib/cipher/symmetric/des.ts
 * (generateSubkeys / processBlock / bytesToBlock / blockToBytes) rather than
 * re-implementing DES — this module only adds the meet-in-the-middle search.
 * @see CIPHER_ENGINE.md "Attack simulators" conventions
 */

import {
  generateSubkeys,
  processBlock,
  bytesToBlock,
  blockToBytes,
} from '../cipher/symmetric/des'
import { CipherError } from '../utils/errors'

export interface MitmStep {
  label: string
  detail: string
}

export interface MitmResult {
  keyASearchSpace: number
  foundKeyAHex: string
  foundKeyBHex: string
  matchedIntermediateHex: string
  attemptsUntilMatch: number
  steps: MitmStep[]
}

function desEncryptBlock(plaintextBlock: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const subkeys = generateSubkeys(keyBytes)
  const block = bytesToBlock(plaintextBlock, 0)
  const result = processBlock(block, subkeys, false)
  const out = new Uint8Array(8)
  blockToBytes(result, out, 0)
  return out
}

function desDecryptBlock(ciphertextBlock: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const subkeys = generateSubkeys(keyBytes)
  const block = bytesToBlock(ciphertextBlock, 0)
  const result = processBlock(block, subkeys, true)
  const out = new Uint8Array(8)
  blockToBytes(result, out, 0)
  return out
}

export function doubleDesEncrypt(plaintextBlock: Uint8Array, keyA: Uint8Array, keyB: Uint8Array): Uint8Array {
  return desEncryptBlock(desEncryptBlock(plaintextBlock, keyA), keyB)
}

function keyFromInt(n: number, keySpaceBits: number): Uint8Array {
  // DES keys are 8 bytes (56 usable bits + 8 parity bits, ignored here for
  // demo purposes — this is a *reduced* keyspace search for a browser-tractable demo).
  const bytes = new Uint8Array(8)
  for (let i = 0; i < Math.ceil(keySpaceBits / 8); i++) {
    bytes[7 - i] = (n >>> (i * 8)) & 0xff
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Runs the meet-in-the-middle search over a REDUCED keyspace (`keySpaceBits`,
 * default 16) so the attack completes in the browser in a demo-visible amount
 * of time. Full 56-bit DES keys use the same algorithm — only the search
 * space size changes; the point being illustrated (2^(n+1) work instead of
 * 2^(2n)) holds at any size.
 */
export function meetInTheMiddleAttack(
  plaintextBlock: Uint8Array,
  ciphertextBlock: Uint8Array,
  keySpaceBits: number = 16,
  onStep?: (step: MitmStep) => void
): MitmResult {
  if (plaintextBlock.length !== 8 || ciphertextBlock.length !== 8) {
    throw new CipherError('INVALID_INPUT', 'Plaintext and ciphertext blocks must each be exactly 8 bytes (one DES block).')
  }
  if (keySpaceBits < 4 || keySpaceBits > 24) {
    throw new CipherError('INVALID_INPUT', 'keySpaceBits must be between 4 and 24 for a browser-tractable demo.')
  }

  const steps: MitmStep[] = []
  const spaceSize = 2 ** keySpaceBits

  const emit = (step: MitmStep) => {
    steps.push(step)
    onStep?.(step)
  }

  const emitStep = (label: string, detail: string) => {
    emit({ label, detail })
  }

  emitStep(
    'Forward pass',
    `Encrypting the known plaintext under every candidate k1 in a ${keySpaceBits}-bit reduced keyspace (${spaceSize.toLocaleString()} candidates), storing E_k1(P) -> k1 in a lookup table.`
  )

  const forwardTable = new Map<string, number>()
  for (let k1 = 0; k1 < spaceSize; k1++) {
    const candidateKey = keyFromInt(k1, keySpaceBits)
    const intermediate = desEncryptBlock(plaintextBlock, candidateKey)
    forwardTable.set(bytesToHex(intermediate), k1)
  }

  emitStep(
    'Backward pass',
    `Decrypting the known ciphertext under every candidate k2, checking each D_k2(C) against the forward table for a match — instead of trying all k1×k2 combinations.`
  )

  let attempts = 0
  for (let k2 = 0; k2 < spaceSize; k2++) {
    attempts++
    const candidateKey = keyFromInt(k2, keySpaceBits)
    const intermediate = desDecryptBlock(ciphertextBlock, candidateKey)
    const hex = bytesToHex(intermediate)
    const matchedK1 = forwardTable.get(hex)

    if (matchedK1 !== undefined) {
      const foundKeyA = keyFromInt(matchedK1, keySpaceBits)
      const foundKeyB = keyFromInt(k2, keySpaceBits)

      emitStep(
        'Intermediate collision found',
        `E_k1(P) === D_k2(C) === ${hex} at k1=${matchedK1}, k2=${k2}, after ${attempts.toLocaleString()} backward-pass attempts (vs. up to ${spaceSize.toLocaleString()} for a naive meet).`
      )

      return {
        keyASearchSpace: spaceSize,
        foundKeyAHex: bytesToHex(foundKeyA),
        foundKeyBHex: bytesToHex(foundKeyB),
        matchedIntermediateHex: hex,
        attemptsUntilMatch: attempts,
        steps,
      }
    }
  }

  throw new CipherError(
    'INVALID_INPUT',
    'No matching intermediate value found in the given keyspace — the plaintext/ciphertext pair was not produced by a key pair inside this reduced search range.'
  )
}
