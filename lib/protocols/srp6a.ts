/**
 * SRP-6a — Secure Remote Password (RFC 5054), an augmented PAKE.
 *
 * SRP lets a client and server agree on a strong shared key from a *password*
 * without the password (or anything from which it can be brute-forced offline)
 * ever crossing the wire. The server stores only a verifier `v = g^x`, never the
 * password, so a stolen database still can't be replayed as the user.
 *
 * Handshake (this module uses the RFC 5054 1024-bit group and SHA-1, so it
 * reproduces the RFC 5054 Appendix B test vector exactly):
 *
 *   registration: x = H(s ‖ H(I ‖ ":" ‖ P)),  v = g^x mod N
 *   client  → A = g^a
 *   server  → B = k·v + g^b     (k = H(N ‖ PAD(g)))
 *   both:     u = H(PAD(A) ‖ PAD(B))
 *   client:   S = (B − k·g^x)^(a + u·x) mod N
 *   server:   S = (A · v^u)^b mod N          ← same S
 *   K  = H(S);  M1 = H(H(N)⊕H(g) ‖ H(I) ‖ s ‖ A ‖ B ‖ K);  M2 = H(A ‖ M1 ‖ K)
 *
 * A passive eavesdropper sees A, B, s but not the password; a fake server that
 * only holds `v` still can't recover it. The client proves knowledge with M1 and
 * the server proves it computed the same key with M2.
 */
import { sha1 } from '@noble/hashes/legacy.js'

/** The RFC 5054 1024-bit group. */
export const SRP_1024 = {
  N: BigInt(
    '0x' +
      'EEAF0AB9ADB38DD69C33F80AFA8FC5E8607261877 5FF3C0B9EA2314C9C256576D674DF7496EA81D3383B4813D692C6E0E0D5D8E250B98BE48E495C1D6089DAD15DC7D7B46154D6B6CE8EF4AD69B15D4982559B297BCF1885C529F566660E57EC68EDBC3C05726CC02FD4CBF4976EAA9AFD5138FE8376435B9FC61D2FC0EB06E3'
        .replace(/\s+/g, ''),
  ),
  g: 2n,
}

function mod(a: bigint, m: bigint): bigint {
  const r = a % m
  return r >= 0n ? r : r + m
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n
  let b = mod(base, m)
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m
    e >>= 1n
    b = (b * b) % m
  }
  return result
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let x = 0n
  for (const b of bytes) x = (x << 8n) | BigInt(b)
  return x
}

export function bigIntToBytes(value: bigint): Uint8Array {
  let hex = value.toString(16)
  if (hex.length % 2) hex = '0' + hex
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function toHex(value: bigint): string {
  return bigIntToBytes(value).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
}

/** Left-pad a byte array with zeros to `len` bytes (RFC 5054 PAD). */
function pad(bytes: Uint8Array, len: number): Uint8Array {
  if (bytes.length >= len) return bytes
  const out = new Uint8Array(len)
  out.set(bytes, len - bytes.length)
  return out
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

const H = (...parts: Uint8Array[]): Uint8Array => sha1(concat(...parts))
const Hi = (...parts: Uint8Array[]): bigint => bytesToBigInt(H(...parts))
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)

export interface SrpGroup {
  N: bigint
  g: bigint
}

function groupByteLength(group: SrpGroup): number {
  return bigIntToBytes(group.N).length
}

/** Multiplier parameter k = H(N ‖ PAD(g)). */
export function computeK(group: SrpGroup = SRP_1024): bigint {
  const len = groupByteLength(group)
  return Hi(bigIntToBytes(group.N), pad(bigIntToBytes(group.g), len))
}

/** Private key derived from salt+credentials: x = H(s ‖ H(I ‖ ":" ‖ P)). */
export function computeX(salt: Uint8Array, identity: string, password: string): bigint {
  const inner = H(concat(utf8(identity), utf8(':'), utf8(password)))
  return Hi(salt, inner)
}

/** The password verifier v = g^x mod N, stored by the server (never the password). */
export function generateVerifier(
  identity: string,
  password: string,
  salt: Uint8Array,
  group: SrpGroup = SRP_1024,
): bigint {
  return modPow(group.g, computeX(salt, identity, password), group.N)
}

/** Scrambling parameter u = H(PAD(A) ‖ PAD(B)). */
export function computeU(A: bigint, B: bigint, group: SrpGroup = SRP_1024): bigint {
  const len = groupByteLength(group)
  return Hi(pad(bigIntToBytes(A), len), pad(bigIntToBytes(B), len))
}

export interface HandshakeStep {
  label: string
  detail: string
  value?: string
}

export interface Srp6aResult {
  salt: string
  verifier: string
  k: string
  A: string
  B: string
  u: string
  clientS: string
  serverS: string
  /** True when both parties derived the same premaster secret S. */
  sharedSecretMatches: boolean
  sessionKey: string
  M1: string
  /** True when the server accepts the client's proof M1. */
  clientProofValid: boolean
  M2: string
  /** True when the client accepts the server's proof M2. */
  serverProofValid: boolean
  steps: HandshakeStep[]
}

export interface Srp6aInputs {
  identity: string
  password: string
  salt: Uint8Array
  /** Client ephemeral private a (defaults to random). */
  a?: bigint
  /** Server ephemeral private b (defaults to random). */
  b?: bigint
  /** Password the client actually types, if different from the registered one. */
  attemptedPassword?: string
  group?: SrpGroup
}

function randomExponent(group: SrpGroup): bigint {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return mod(bytesToBigInt(bytes), group.N - 1n) + 1n
}

/**
 * Run a full SRP-6a handshake and return every intermediate value plus a trace.
 * The client authenticates with `attemptedPassword` (default: the real one); a
 * wrong password makes the proofs fail while S/K still get computed on each side.
 */
export function runSrp6a(inputs: Srp6aInputs): Srp6aResult {
  const group = inputs.group ?? SRP_1024
  const { N, g } = group
  const len = groupByteLength(group)
  const { identity, password, salt } = inputs
  const attempted = inputs.attemptedPassword ?? password

  // Registration (server stores salt + verifier only).
  const verifier = generateVerifier(identity, password, salt, group)
  const k = computeK(group)

  // Ephemerals.
  const a = inputs.a ?? randomExponent(group)
  const b = inputs.b ?? randomExponent(group)
  const A = modPow(g, a, N)
  const B = mod(k * verifier + modPow(g, b, N), N)
  const u = computeU(A, B, group)

  // Client side: derive S from its typed password.
  const xClient = computeX(salt, identity, attempted)
  const clientS = modPow(mod(B - mod(k * modPow(g, xClient, N), N), N), a + u * xClient, N)

  // Server side: derive S from the stored verifier.
  const serverS = modPow(mod(A * modPow(verifier, u, N), N), b, N)

  const sharedSecretMatches = clientS === serverS

  const clientK = H(bigIntToBytes(clientS))
  const serverK = H(bigIntToBytes(serverS))

  // Proofs. M1 = H(H(N)⊕H(g) ‖ H(I) ‖ s ‖ A ‖ B ‖ K).
  const hN = H(bigIntToBytes(N))
  const hg = H(pad(bigIntToBytes(g), len))
  const hXor = new Uint8Array(hN.length)
  for (let i = 0; i < hN.length; i++) hXor[i] = hN[i] ^ hg[i]
  const hI = H(utf8(identity))

  const clientM1 = H(hXor, hI, salt, bigIntToBytes(A), bigIntToBytes(B), clientK)
  const serverExpectedM1 = H(hXor, hI, salt, bigIntToBytes(A), bigIntToBytes(B), serverK)
  const clientProofValid = toHexBytes(clientM1) === toHexBytes(serverExpectedM1)

  // Server proves back: M2 = H(A ‖ M1 ‖ K).
  const serverM2 = H(bigIntToBytes(A), serverExpectedM1, serverK)
  const clientExpectedM2 = H(bigIntToBytes(A), clientM1, clientK)
  const serverProofValid = toHexBytes(serverM2) === toHexBytes(clientExpectedM2)

  const steps: HandshakeStep[] = [
    { label: 'Registration', detail: 'The server stores only salt + verifier v = g^x. The password is never sent or stored.', value: `v = ${toHex(verifier)}` },
    { label: 'Client → A = g^a', detail: 'The client sends its public ephemeral A. Its private a never leaves the client.', value: `A = ${toHex(A)}` },
    { label: 'Server → B = k·v + g^b', detail: 'The server blends the verifier into its public ephemeral B so B alone reveals nothing.', value: `B = ${toHex(B)}` },
    { label: 'Both compute u = H(A ‖ B)', detail: 'A public scrambling parameter binding both ephemerals.', value: `u = ${toHex(u)}` },
    { label: 'Both derive the premaster secret S', detail: sharedSecretMatches ? 'Client and server reach the SAME S by different formulas — without exchanging the password.' : 'The values differ: the client used the wrong password.', value: `client S = ${toHex(clientS)}\nserver S = ${toHex(serverS)}` },
    { label: 'Client proof M1', detail: clientProofValid ? 'The server accepts M1 — the client proved it knows the password.' : 'M1 rejected — authentication fails (wrong password).' },
    { label: 'Server proof M2', detail: serverProofValid ? 'The client accepts M2 — the server proved it derived the same key.' : 'M2 rejected.' },
  ]

  return {
    salt: toHexBytes(salt),
    verifier: toHex(verifier),
    k: toHex(k),
    A: toHex(A),
    B: toHex(B),
    u: toHex(u),
    clientS: toHex(clientS),
    serverS: toHex(serverS),
    sharedSecretMatches,
    sessionKey: toHexBytes(clientK),
    M1: toHexBytes(clientM1),
    clientProofValid,
    M2: toHexBytes(serverM2),
    serverProofValid,
    steps,
  }
}

function toHexBytes(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
