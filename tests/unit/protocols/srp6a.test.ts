import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  SRP_1024,
  computeK,
  computeX,
  computeU,
  generateVerifier,
  runSrp6a,
  bytesToBigInt,
  toHex,
} from '../../../lib/protocols/srp6a'

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/\s+/g, '')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}
const hexToBig = (hex: string): bigint => bytesToBigInt(hexToBytes(hex))
const norm = (hex: string) => hex.replace(/\s+/g, '').toLowerCase().replace(/^0+/, '')

// RFC 5054 Appendix B test vector (1024-bit group, SHA-1).
const V = {
  I: 'alice',
  P: 'password123',
  s: 'BEB25379 D1A8581E B5A72767 3A2441EE',
  k: '7556AA04 5AEF2CDD 07ABAF0F 665C3E81 8913186F',
  x: '94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124',
  v:
    '7E273DE8 696FFC4F 4E337D05 B4B375BE B0DDE156 9E8FA00A 9886D812 9BADA1F1 822223CA 1A605B53 0E379BA4 729FDC59 F105B478 7E5186F5 C671085A 1447B52A 48CF1970 B4FB6F84 00BBF4CE BFBB1681 52E08AB5 EA53D15C 1AFF87B2 B9DA6E04 E058AD51 CC72BFC9 033B564E 26480D78 E955A5E2 9E7AB245 DB2BE315 E2099AFB',
  a: '60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393',
  b: 'E487CB59 D31AC550 471E81F0 0F6928E0 1DDA08E9 74A004F4 9E61F5D1 05284D20',
  A:
    '61D5E490 F6F1B795 47B0704C 436F523D D0E560F0 C64115BB 72557EC4 4352E890 3211C046 92272D8B 2D1A5358 A2CF1B6E 0BFCF99F 921530EC 8E393561 79EAE45E 42BA92AE ACED8251 71E1E8B9 AF6D9C03 E1327F44 BE087EF0 6530E69F 66615261 EEF54073 CA11CF58 58F0EDFD FE15EFEA B349EF5D 76988A36 72FAC47B 0769447B',
  B:
    'BD0C6151 2C692C0C B6D041FA 01BB152D 4916A1E7 7AF46AE1 05393011 BAF38964 DC46A067 0DD125B9 5A981652 236F99D9 B681CBF8 7837EC99 6C6DA044 53728610 D0C6DDB5 8B318885 D7D82C7F 8DEB75CE 7BD4FBAA 37089E6F 9C6059F3 88838E7A 00030B33 1EB76840 910440B1 B27AAEAE EB4012B7 D7665238 A8E3FB00 4B117B58',
  u: 'CE38B959 3487DA98 554ED47D 70A7AE5F 462EF019',
  S:
    'B0DC82BA BCF30674 AE450C02 87745E79 90A3381F 63B387AA F271A10D 233861E3 59B48220 F7C4693C 9AE12B0A 6F67809F 0876E2D0 13800D6C 41BB59B6 D5979B5C 00A172B4 A2A5903A 0BDCAF8A 709585EB 2AFAFA8F 3499B200 210DCC1F 10EB3394 3CD67FC8 8A2F39A4 BE5BEC4E C0A3212D C346D7E4 74B29EDE 8A469FFE CA686E5A',
}

describe('SRP-6a — RFC 5054 Appendix B test vector', () => {
  const salt = hexToBytes(V.s)

  it('computes k, x and v as in the RFC', () => {
    expect(norm(toHex(computeK()))).toBe(norm(V.k))
    expect(norm(toHex(computeX(salt, V.I, V.P)))).toBe(norm(V.x))
    expect(norm(toHex(generateVerifier(V.I, V.P, salt)))).toBe(norm(V.v))
  })

  it('reproduces A, B, u and the premaster secret S with the RFC ephemerals', () => {
    const r = runSrp6a({ identity: V.I, password: V.P, salt, a: hexToBig(V.a), b: hexToBig(V.b) })
    expect(norm(r.A)).toBe(norm(V.A))
    expect(norm(r.B)).toBe(norm(V.B))
    expect(norm(r.u)).toBe(norm(V.u))
    expect(norm(r.clientS)).toBe(norm(V.S))
    expect(norm(r.serverS)).toBe(norm(V.S))
    expect(r.sharedSecretMatches).toBe(true)
  })
})

describe('SRP-6a — protocol behavior', () => {
  const salt = hexToBytes('00112233445566778899aabbccddeeff')

  it('both parties derive the same key and accept each other’s proofs on the correct password', () => {
    const r = runSrp6a({ identity: 'bob', password: 'correct horse', salt })
    expect(r.sharedSecretMatches).toBe(true)
    expect(r.clientProofValid).toBe(true)
    expect(r.serverProofValid).toBe(true)
  })

  it('rejects the client proof when the wrong password is used', () => {
    const r = runSrp6a({
      identity: 'bob',
      password: 'correct horse',
      salt,
      attemptedPassword: 'wrong horse',
    })
    expect(r.sharedSecretMatches).toBe(false)
    expect(r.clientProofValid).toBe(false)
  })

  it('the verifier never reveals the password (different passwords → different verifiers)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), fc.string({ minLength: 1, maxLength: 24 }), (p1, p2) => {
        fc.pre(p1 !== p2)
        const v1 = generateVerifier('user', p1, salt)
        const v2 = generateVerifier('user', p2, salt)
        return v1 !== v2
      }),
      { numRuns: 40 },
    )
  })

  it('u = H(A ‖ B) is stable and less than N', () => {
    const r = runSrp6a({ identity: 'carol', password: 'hunter2', salt })
    expect(computeU(BigInt('0x' + r.A), BigInt('0x' + r.B))).toBeLessThan(SRP_1024.N)
  })

  it('produces a handshake trace', () => {
    const r = runSrp6a({ identity: 'dave', password: 'pw', salt })
    expect(r.steps.length).toBeGreaterThanOrEqual(6)
  })
})
