/**
 * AEAD Nonce-Reuse Catastrophe Lab — the AES-GCM "forbidden attack".
 *
 * AES-GCM's authentication tag is a polynomial in a secret key H = AES_K(0¹²⁸),
 * evaluated in GF(2¹²⁸) and masked by a per-nonce pad E_K(J0):
 *
 *   T = GHASH_H(ciphertext) ⊕ E_K(J0)
 *
 * The pad E_K(J0) depends only on the nonce, so **reusing a nonce reuses the
 * pad**. Two messages sent under one nonce leak the mask by subtraction:
 *
 *   T1 ⊕ T2 = GHASH_H(C1) ⊕ GHASH_H(C2)
 *
 * The right-hand side is a polynomial in the unknown H whose coefficients are
 * public (the ciphertext blocks). Solving it recovers H, then the pad, and from
 * there an attacker can **forge a valid tag for any message under that nonce** —
 * a total authentication break. This is the "forbidden attack" (Joux; Böck,
 * Zauner, Devlin, Somorovsky, Jovanovic) that broke real GCM deployments that
 * repeated nonces.
 *
 * To keep the algebra exact and the recovery unique, this lab uses single
 * 16-byte-block messages. Then the 128-bit length block is identical for both
 * messages and cancels, leaving
 *
 *   T1 ⊕ T2 = (C1 ⊕ C2) · H²      (all arithmetic in GF(2¹²⁸))
 *
 * so  H² = (T1 ⊕ T2) · (C1 ⊕ C2)⁻¹  and, because squaring is a bijection over a
 * field of characteristic 2, H is the *unique* square root H = (H²)^(2¹²⁷). No
 * polynomial factoring is needed for the single-block case; the general
 * multi-block attack instead finds H among the roots of the difference
 * polynomial, which extra message pairs then disambiguate.
 *
 * The GF(2¹²⁸) representation matches NIST SP 800-38D exactly (bit 0 = MSB of
 * byte 0, reduction polynomial x¹²⁸ + x⁷ + x² + x + 1), so the recovered key and
 * forged tags agree bit-for-bit with the reference GCM in
 * `lib/cipher/symmetric/aes-gcm.ts`.
 */

/** A 128-bit GF element / GCM block: exactly 16 bytes. */
export type Block = Uint8Array

const BLOCK_SIZE = 16

function block(): Block {
  return new Uint8Array(BLOCK_SIZE)
}

/** XOR of two blocks — addition in GF(2¹²⁸). */
export function xorBlocks(a: Block, b: Block): Block {
  const z = block()
  for (let i = 0; i < BLOCK_SIZE; i++) z[i] = a[i] ^ b[i]
  return z
}

/**
 * GF(2¹²⁸) multiplication per NIST SP 800-38D (bit 0 = MSB of byte 0), reduction
 * R = 0xe1 ‖ 0¹²⁰. Identical convention to the repo's GHASH so results match.
 */
export function gfMul(X: Block, Y: Block): Block {
  const Z = block()
  const V = Y.slice()
  for (let i = 0; i < 128; i++) {
    if ((X[i >> 3] >> (7 - (i & 7))) & 1) {
      for (let j = 0; j < BLOCK_SIZE; j++) Z[j] ^= V[j]
    }
    const lsb = V[15] & 1
    for (let j = 15; j > 0; j--) V[j] = ((V[j] >> 1) | (V[j - 1] << 7)) & 0xff
    V[0] = V[0] >> 1
    if (lsb) V[0] ^= 0xe1
  }
  return Z
}

/** The multiplicative identity in this bit convention: the polynomial "1". */
export const GF_ONE: Block = (() => {
  const one = block()
  one[0] = 0x80
  return one
})()

/** Fast exponentiation aᵉ in GF(2¹²⁸). */
function gfPow(a: Block, exponent: bigint): Block {
  let result: Block = GF_ONE.slice()
  let base: Block = a.slice()
  let e = exponent
  while (e > 0n) {
    if (e & 1n) result = gfMul(result, base)
    base = gfMul(base, base)
    e >>= 1n
  }
  return result
}

const isZero = (a: Block): boolean => a.every((byte) => byte === 0)

/** Multiplicative inverse a⁻¹ = a^(2¹²⁸−2) (Fermat's little theorem). */
export function gfInverse(a: Block): Block {
  if (isZero(a)) {
    throw new Error('Zero has no multiplicative inverse in GF(2¹²⁸).')
  }
  return gfPow(a, (1n << 128n) - 2n)
}

/**
 * The unique square root √a = a^(2¹²⁷). Squaring is the Frobenius automorphism
 * over GF(2ⁿ), so every element has exactly one square root — this is why the
 * single-block attack recovers H uniquely with no factoring.
 */
export function gfSqrt(a: Block): Block {
  let r: Block = a.slice()
  for (let i = 0; i < 127; i++) r = gfMul(r, r)
  return r
}

/** The GHASH length block for a single 16-byte ciphertext, no AAD: [0]₆₄ ‖ [128]₆₄. */
function singleBlockLengthBlock(): Block {
  const b = block()
  new DataView(b.buffer).setBigUint64(8, BigInt(BLOCK_SIZE) * 8n)
  return b
}

/**
 * GHASH over a single ciphertext block C (no AAD):
 *   GHASH_H(C) = ((C · H) ⊕ L) · H = C·H² ⊕ L·H
 * where L is the length block. Matches the reference GCM's GHASH.
 */
export function ghashSingleBlock(H: Block, ciphertextBlock: Block): Block {
  let Y = block()
  Y = gfMul(xorBlocks(Y, ciphertextBlock), H)
  Y = gfMul(xorBlocks(Y, singleBlockLengthBlock()), H)
  return Y
}

export function toHex(bytes: Block): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function fromHex(hex: string): Block {
  const clean = hex.trim().replace(/^0x/i, '').replace(/\s+/g, '')
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error('Input must be hexadecimal.')
  }
  if (clean.length !== BLOCK_SIZE * 2) {
    throw new Error(`Expected a 16-byte (32 hex-char) block, got ${clean.length} hex chars.`)
  }
  const out = block()
  for (let i = 0; i < BLOCK_SIZE; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** Encode up to 16 bytes of text into a block (zero-padded), for forged plaintext. */
export function textToBlock(text: string): Block {
  const b = block()
  b.set(new TextEncoder().encode(text).slice(0, BLOCK_SIZE))
  return b
}

export function blockToText(b: Block): string {
  return new TextDecoder().decode(b).replace(/\0+$/, '')
}

/** One captured single-block AES-GCM message under the reused nonce. */
export interface CapturedMessage {
  /** The ciphertext block (public). */
  ciphertext: Block
  /** The authentication tag (public). */
  tag: Block
}

export interface RecoveredSecrets {
  /** The recovered GHASH authentication key H = AES_K(0¹²⁸). */
  H: Block
  /** The recovered per-nonce pad E_K(J0) that masks the tag. */
  pad: Block
}

/**
 * Recover the GHASH key H and the nonce pad from two single-block messages that
 * reused the nonce. Throws if the two ciphertext blocks are equal (ΔC = 0 gives
 * no information).
 */
export function recoverAuthKey(msg1: CapturedMessage, msg2: CapturedMessage): RecoveredSecrets {
  const deltaC = xorBlocks(msg1.ciphertext, msg2.ciphertext)
  if (isZero(deltaC)) {
    throw new Error('The two ciphertext blocks are identical — no information about H leaks.')
  }
  const deltaT = xorBlocks(msg1.tag, msg2.tag)
  // ΔT = ΔC · H²  ⇒  H² = ΔT · ΔC⁻¹  ⇒  H = √(H²) (unique in GF(2¹²⁸)).
  const HSquared = gfMul(deltaT, gfInverse(deltaC))
  const H = gfSqrt(HSquared)
  // pad = T1 ⊕ GHASH_H(C1).
  const pad = xorBlocks(msg1.tag, ghashSingleBlock(H, msg1.ciphertext))
  return { H, pad }
}

/**
 * Forge a valid tag for an attacker-chosen ciphertext block under the same
 * (reused) nonce, using the recovered secrets. The result verifies under the
 * real key without the attacker ever knowing it.
 */
export function forgeTag(secrets: RecoveredSecrets, forgedCiphertext: Block): Block {
  return xorBlocks(ghashSingleBlock(secrets.H, forgedCiphertext), secrets.pad)
}

export interface AttackStep {
  index: number
  label: string
  detail: string
  value?: string
  isMilestone?: boolean
}

export interface ForbiddenAttackResult {
  message1: CapturedMessage
  message2: CapturedMessage
  recovered: RecoveredSecrets
  /** The keystream C1 ⊕ P1, known once one plaintext is known (known-plaintext). */
  keystream: Block
  /** The attacker's chosen forged plaintext block. */
  forgedPlaintext: Block
  /** The forged ciphertext C* = P* ⊕ keystream. */
  forgedCiphertext: Block
  /** The forged tag that a GCM verifier will accept for (nonce, C*). */
  forgedTag: Block
  steps: AttackStep[]
}

/**
 * Run the full lab from two captured single-block messages (and one known
 * plaintext, so the keystream is available to give the forgery real content):
 * recover H and the pad, then forge a valid ciphertext/tag for a chosen message.
 *
 * `verifyForgery`, if provided, is the real GCM oracle — given the forged
 * plaintext it returns the ciphertext/tag the genuine key would produce, letting
 * the lab confirm the forgery bit-for-bit.
 */
export function runForbiddenAttack(
  msg1: CapturedMessage,
  msg2: CapturedMessage,
  knownPlaintext1: Block,
  forgedPlaintext: Block,
): ForbiddenAttackResult {
  const recovered = recoverAuthKey(msg1, msg2)
  const keystream = xorBlocks(msg1.ciphertext, knownPlaintext1)
  const forgedCiphertext = xorBlocks(forgedPlaintext, keystream)
  const forgedTag = forgeTag(recovered, forgedCiphertext)

  const steps: AttackStep[] = [
    {
      index: 0,
      label: 'Two messages, one nonce',
      detail:
        'The victim encrypts two different messages under AES-GCM but (fatally) reuses the nonce. Both tags are masked by the same pad E_K(J0), because the pad depends only on the nonce.',
      value: `C1 = ${toHex(msg1.ciphertext)}\nT1 = ${toHex(msg1.tag)}\nC2 = ${toHex(msg2.ciphertext)}\nT2 = ${toHex(msg2.tag)}`,
      isMilestone: true,
    },
    {
      index: 1,
      label: 'Subtract the tags to cancel the pad',
      detail:
        'T1 ⊕ T2 = GHASH_H(C1) ⊕ GHASH_H(C2). The unknown pad cancels; with single-block messages the length block cancels too, leaving ΔT = (C1 ⊕ C2) · H² in GF(2¹²⁸).',
      value: `ΔT = ${toHex(xorBlocks(msg1.tag, msg2.tag))}\nΔC = ${toHex(xorBlocks(msg1.ciphertext, msg2.ciphertext))}`,
    },
    {
      index: 2,
      label: 'Solve for the auth key H',
      detail:
        'H² = ΔT · ΔC⁻¹, then H = √(H²). Squaring is a bijection over GF(2¹²⁸), so the square root — and therefore H — is unique. No factoring required.',
      value: `H = ${toHex(recovered.H)}`,
      isMilestone: true,
    },
    {
      index: 3,
      label: 'Recover the nonce pad',
      detail: 'pad = T1 ⊕ GHASH_H(C1). With H known, the mask falls out of a single message.',
      value: `pad E_K(J0) = ${toHex(recovered.pad)}`,
      isMilestone: true,
    },
    {
      index: 4,
      label: 'Forge a message of the attacker’s choosing',
      detail:
        'Reusing the nonce means reusing the keystream, so C* = P* ⊕ (C1 ⊕ P1) encrypts any chosen P*. The matching tag is GHASH_H(C*) ⊕ pad — a valid tag the attacker computes with no key.',
      value: `P* = ${blockToText(forgedPlaintext) || toHex(forgedPlaintext)}\nC* = ${toHex(forgedCiphertext)}\nT* = ${toHex(forgedTag)}`,
      isMilestone: true,
    },
  ]

  return {
    message1: msg1,
    message2: msg2,
    recovered,
    keystream,
    forgedPlaintext,
    forgedCiphertext,
    forgedTag,
    steps,
  }
}
