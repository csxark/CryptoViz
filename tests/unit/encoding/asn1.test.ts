import { describe, it, expect } from 'vitest'
import {
  OID_REGISTRY,
  UNIVERSAL_TYPES,
  bytesToHex,
  decodeAsn1,
  decodeOid,
  describeStructure,
  hexToBytes,
  looksLikePem,
  parseDer,
  pemToDer,
} from '@/lib/encoding/asn1'

/**
 * A real self-signed RSA-2048 certificate generated with OpenSSL for these
 * tests. Certificates are public by definition, so nothing sensitive is
 * committed here — no private key material appears anywhere in this suite.
 */
const TEST_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDuTCCAqGgAwIBAgIUM9FSM29CjWz40vQMUryf8jsnynowDQYJKoZIhvcNAQEL
BQAwbDELMAkGA1UEBhMCSU4xDTALBgNVBAgMBFRlc3QxDTALBgNVBAcMBFRlc3Qx
EjAQBgNVBAoMCUNyeXB0b1ZpejESMBAGA1UECwwJRWR1Y2F0aW9uMRcwFQYDVQQD
DA5jcnlwdG92aXoudGVzdDAeFw0yNjA3MzAxMTE5NThaFw0zNjA3MjcxMTE5NTha
MGwxCzAJBgNVBAYTAklOMQ0wCwYDVQQIDARUZXN0MQ0wCwYDVQQHDARUZXN0MRIw
EAYDVQQKDAlDcnlwdG9WaXoxEjAQBgNVBAsMCUVkdWNhdGlvbjEXMBUGA1UEAwwO
Y3J5cHRvdml6LnRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCQ
2jZBXe6XUWo6flaDl3zVZXDpFMZvteRUcTAXmytXJamyKS3ds+ssM3vDAGkBCuBB
9Evc2bLgOoc6jmh89xoWXNUy85t2q/COFifVI7D0OEoWKWpNythUGYnSE5PSLNoS
qOnUHs8gXqD77NWHffe9CKhyo5iJnIQ3B/mit2ntb0t5cHxR9fr63A8K+/0NmDm1
tptB9qjZ5O0TS1qaF2IhjAvWDJxjFs37gGDhc4CCjnR5AEZl63vMyXBzY2xaJxnK
LTosKQQR+hlT6kU7fmz0mF/Zruyhr+66U+7AlUo/MIzEE/JwTmKFutO4g0xl5ove
dKpp32A43BAy+gNgAKXZAgMBAAGjUzBRMB0GA1UdDgQWBBTjozI7MjbcKfB17fol
keigiyfjdjAfBgNVHSMEGDAWgBTjozI7MjbcKfB17folkeigiyfjdjAPBgNVHRMB
Af8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAzu7G92hLqp9XaXPIUqJ1ijaeV
VJ62D9eeVwC1QLUdn/MhOBbu6FmkL7ai9JIH8CcSWmIh3sOmeFH4nu2YwoIl03fN
z6P5nQ6f30XYzn2npA/LuzuJ1jOjjQ7WP9HbSq6aATsoGwacEjPiFiz9Bq9hJXJu
CHFtSARODHWwEWuLK3fOQPoFIgtx4c9SKZeJhmWOE194CQmM07+7gASK5AG0BncB
92vpq8P7lLh7UgzOAM6HMactoWCrRPy5iYtVk7nYQj0RsShveV7yF8/3PEnpAbGm
57XLZYmcecV2/tnCC219DIBIjcVqirA7CYv7phFrJ1hQRtfwLL11nwMgTy1i
-----END CERTIFICATE-----`

/** An Ed25519 SubjectPublicKeyInfo — public key material only. */
const TEST_ED25519_SPKI_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAmG1/Uuly/gMpkcjknF7uTc9LyYMjAcXZWbCcFbAy9QI=
-----END PUBLIC KEY-----`

/**
 * A PKCS#8 PrivateKeyInfo whose key bytes are all zero. The *structure* is what
 * is under test; using a zero key keeps a real private key out of the repo.
 */
const PKCS8_ZERO_KEY_HEX = '302e020100300506032b657004220420' + '00'.repeat(32)

describe('hexToBytes / bytesToHex', () => {
  it('round-trips and tolerates the colon-separated form openssl prints', () => {
    expect(bytesToHex(hexToBytes('30 82 01 0a'))).toBe('3082010a')
    expect(bytesToHex(hexToBytes('30:82:01:0a'))).toBe('3082010a')
    expect(bytesToHex(hexToBytes('3082010A'))).toBe('3082010a')
  })

  it('rejects malformed hex', () => {
    expect(() => hexToBytes('')).toThrowError(/empty/)
    expect(() => hexToBytes('abc')).toThrowError(/even number/)
    expect(() => hexToBytes('zzzz')).toThrowError(/non-hexadecimal/)
  })
})

describe('pemToDer', () => {
  it('extracts the label and decodes the body', () => {
    const { label, der } = pemToDer(TEST_CERT_PEM)
    expect(label).toBe('CERTIFICATE')
    expect(der[0]).toBe(0x30) // SEQUENCE
    expect(der.length).toBeGreaterThan(900)
  })

  it('detects PEM armour', () => {
    expect(looksLikePem(TEST_CERT_PEM)).toBe(true)
    expect(looksLikePem('3003020101')).toBe(false)
  })

  it('rejects a block with no armour', () => {
    expect(() => pemToDer('just some text')).toThrowError(/No PEM block found/)
  })

  it('rejects mismatched BEGIN and END labels', () => {
    const mismatched = '-----BEGIN CERTIFICATE-----\nMAMCAQE=\n-----END PUBLIC KEY-----'
    expect(() => pemToDer(mismatched)).toThrowError(/label mismatch/)
  })

  it('rejects a non-Base64 body', () => {
    const bad = '-----BEGIN CERTIFICATE-----\n!!!!not base64!!!!\n-----END CERTIFICATE-----'
    expect(() => pemToDer(bad)).toThrowError(/Base64/)
  })
})

describe('decodeOid', () => {
  it('applies the 40 × arc1 + arc2 rule to the first byte', () => {
    // 2a 86 48 86 f7 0d 01 01 0b → 1.2.840.113549.1.1.11
    expect(decodeOid(hexToBytes('2a864886f70d01010b')).oid).toBe('1.2.840.113549.1.1.11')
    // 2b 65 70 → 1.3.101.112
    expect(decodeOid(hexToBytes('2b6570')).oid).toBe('1.3.101.112')
    // 55 04 03 → 2.5.4.3
    expect(decodeOid(hexToBytes('550403')).oid).toBe('2.5.4.3')
  })

  it('handles each of the three first-byte ranges', () => {
    expect(decodeOid(Uint8Array.from([0x00])).oid).toBe('0.0') // < 40
    expect(decodeOid(Uint8Array.from([0x27])).oid).toBe('0.39')
    expect(decodeOid(Uint8Array.from([0x28])).oid).toBe('1.0') // 40–79
    expect(decodeOid(Uint8Array.from([0x4f])).oid).toBe('1.39')
    expect(decodeOid(Uint8Array.from([0x50])).oid).toBe('2.0') // >= 80
  })

  it('decodes multi-byte base-128 arcs', () => {
    // 0x86 0x48 = (0x06 << 7) | 0x48 = 840
    expect(decodeOid(hexToBytes('2a8648')).oid).toBe('1.2.840')
    // 0x86 0xf7 0x0d = 113549
    expect(decodeOid(hexToBytes('2a864886f70d')).oid).toBe('1.2.840.113549')
  })

  it('flags a non-minimal subidentifier that starts with 0x80', () => {
    const { warnings } = decodeOid(hexToBytes('2a8001'))
    expect(warnings.some((w) => /non-minimal/.test(w))).toBe(true)
  })

  it('throws on an empty body or a dangling continuation bit', () => {
    expect(() => decodeOid(new Uint8Array(0))).toThrowError(/content is empty/)
    expect(() => decodeOid(hexToBytes('2a86'))).toThrowError(/mid-subidentifier/)
  })

  it('resolves the OIDs this project cares about', () => {
    expect(OID_REGISTRY['1.2.840.113549.1.1.11']).toBe('sha256WithRSAEncryption')
    expect(OID_REGISTRY['1.3.101.112']).toBe('id-Ed25519')
    expect(OID_REGISTRY['2.16.840.1.101.3.4.4.2']).toBe('id-ML-KEM-768')
    expect(OID_REGISTRY['2.5.4.3']).toBe('commonName (CN)')
  })
})

describe('parseDer — universal types', () => {
  it('decodes BOOLEAN, and flags a non-DER TRUE encoding', () => {
    expect(parseDer(hexToBytes('0101ff')).nodes[0].value).toBe('TRUE')
    expect(parseDer(hexToBytes('010100')).nodes[0].value).toBe('FALSE')

    const loose = parseDer(hexToBytes('010101'))
    expect(loose.nodes[0].value).toBe('TRUE')
    expect(loose.nodes[0].warnings.some((w) => /0xFF/.test(w))).toBe(true)
  })

  it('decodes INTEGER, including negatives and the leading-zero convention', () => {
    expect(parseDer(hexToBytes('020100')).nodes[0].value).toBe('0')
    expect(parseDer(hexToBytes('020101')).nodes[0].value).toBe('1')
    expect(parseDer(hexToBytes('02017f')).nodes[0].value).toBe('127')
    // 0x00 0x80 — the leading zero marks 128 as positive, not −128.
    expect(parseDer(hexToBytes('02020080')).nodes[0].value).toBe('128')
    expect(parseDer(hexToBytes('020180')).nodes[0].value).toBe('-128')
    expect(parseDer(hexToBytes('0201ff')).nodes[0].value).toBe('-1')
  })

  it('flags a non-minimal INTEGER', () => {
    // 0x00 0x01 — the leading zero is redundant because 0x01's high bit is clear.
    const node = parseDer(hexToBytes('02020001')).nodes[0]
    expect(node.value).toBe('1')
    expect(node.warnings.some((w) => /Non-minimal INTEGER/.test(w))).toBe(true)
  })

  it('renders a long INTEGER as decimal plus hex and its significant bit width', () => {
    // 9 content bytes, but the leading 0x00 is DER's sign pad, not magnitude,
    // so the value is 64 bits wide rather than 72.
    const node = parseDer(hexToBytes('0209' + '00ffffffffffffffff')).nodes[0]
    expect(node.value).toContain('18446744073709551615')
    expect(node.value).toContain('64 bits')
    expect(node.value).not.toContain('72 bits')
  })

  it('reports a 2048-bit RSA modulus as 2048 bits, not 2056', () => {
    // 257 content bytes: one 0x00 sign pad plus 256 bytes of magnitude.
    const modulus = '00' + 'ff'.repeat(256)
    const node = parseDer(hexToBytes('02820101' + modulus)).nodes[0]
    expect(node.contentLength).toBe(257)
    expect(node.value).toContain('2048 bits')
  })

  it('decodes NULL and flags content where there should be none', () => {
    expect(parseDer(hexToBytes('0500')).nodes[0].value).toBe('NULL')
    const bad = parseDer(hexToBytes('050100')).nodes[0]
    expect(bad.warnings.some((w) => /zero content bytes/.test(w))).toBe(true)
  })

  it('decodes BIT STRING with its unused-bits prefix', () => {
    // 03 03 05 a3 b0 → 2 payload bytes, 5 unused bits → 11 significant bits.
    const node = parseDer(hexToBytes('030305a3b0')).nodes[0]
    expect(node.value).toContain('11 bits')
    expect(node.value).toContain('5 unused')
    expect(node.value).toContain('a3b0')
  })

  it('flags a BIT STRING claiming more than 7 unused bits', () => {
    const node = parseDer(hexToBytes('03020800')).nodes[0]
    expect(node.warnings.some((w) => /maximum is 7/.test(w))).toBe(true)
  })

  it('never reports a negative bit count for an empty BIT STRING payload', () => {
    // 03 01 05 — the unused-bits byte only, declaring 5 unused bits.
    const node = parseDer(hexToBytes('030105')).nodes[0]
    expect(node.value).toContain('0 bits')
    expect(node.value).not.toContain('-')
    expect(node.warnings.some((w) => /requires an empty BIT STRING to declare 0/.test(w))).toBe(true)
  })

  it('decodes the string types', () => {
    // PrintableString "Test"
    expect(parseDer(hexToBytes('1304' + '54657374')).nodes[0].value).toBe('Test')
    // UTF8String "Test"
    expect(parseDer(hexToBytes('0c04' + '54657374')).nodes[0].value).toBe('Test')
    // IA5String "a@b.c"
    expect(parseDer(hexToBytes('1605' + '6140622e63')).nodes[0].value).toBe('a@b.c')
  })

  it('flags a PrintableString holding characters outside its alphabet', () => {
    // '@' is not in the PrintableString repertoire.
    const node = parseDer(hexToBytes('1301' + '40')).nodes[0]
    expect(node.warnings.some((w) => /restricted alphabet/.test(w))).toBe(true)
  })

  it('decodes UTCTime with the RFC 5280 year pivot at 50', () => {
    // 260730111958Z → 2026; 960730111958Z → 1996.
    const recent = parseDer(hexToBytes('170d' + '3236303733303131313935385a')).nodes[0]
    expect(recent.value).toContain('2026-07-30 11:19:58 UTC')

    const old = parseDer(hexToBytes('170d' + '3936303733303131313935385a')).nodes[0]
    expect(old.value).toContain('1996-07-30')
  })

  it('decodes GeneralizedTime', () => {
    const node = parseDer(hexToBytes('180f' + '32303236303733303131313935385a')).nodes[0]
    expect(node.value).toContain('2026-07-30 11:19:58 UTC')
  })

  it('names every universal type it claims to support', () => {
    expect(UNIVERSAL_TYPES[16]).toBe('SEQUENCE')
    expect(UNIVERSAL_TYPES[17]).toBe('SET')
    expect(UNIVERSAL_TYPES[6]).toBe('OBJECT IDENTIFIER')
  })
})

describe('parseDer — structure', () => {
  it('recurses into SEQUENCE and records offsets and lengths', () => {
    // SEQUENCE { INTEGER 1, INTEGER 2 }
    const result = parseDer(hexToBytes('3006020101020102'))
    const seq = result.nodes[0]

    expect(seq.typeName).toBe('SEQUENCE')
    expect(seq.constructed).toBe(true)
    expect(seq.offset).toBe(0)
    expect(seq.headerLength).toBe(2)
    expect(seq.contentLength).toBe(6)
    expect(seq.totalLength).toBe(8)
    expect(seq.children).toHaveLength(2)
    expect(seq.children![0].offset).toBe(2)
    expect(seq.children![1].offset).toBe(5)
    expect(seq.children!.map((c) => c.value)).toEqual(['1', '2'])
    expect(seq.children!.every((c) => c.depth === 1)).toBe(true)
  })

  it('decodes context-specific tags', () => {
    // [0] { INTEGER 2 } — the X.509 version wrapper.
    const node = parseDer(hexToBytes('a003020102')).nodes[0]
    expect(node.tagClass).toBe('context')
    expect(node.tagNumber).toBe(0)
    expect(node.typeName).toBe('[0]')
    expect(node.constructed).toBe(true)
    expect(node.children![0].value).toBe('2')
  })

  it('parses the long-form length used by anything over 127 bytes', () => {
    // 0x81 → one length byte; 200 bytes of content.
    const der = hexToBytes('0481c8' + '00'.repeat(200))
    const node = parseDer(der).nodes[0]
    expect(node.headerLength).toBe(3)
    expect(node.contentLength).toBe(200)
  })

  it('parses a two-byte long-form length', () => {
    const der = hexToBytes('048201f4' + '00'.repeat(500))
    const node = parseDer(der).nodes[0]
    expect(node.headerLength).toBe(4)
    expect(node.contentLength).toBe(500)
  })

  it('flags a long-form length that should have used the short form', () => {
    const node = parseDer(hexToBytes('048101' + '00')).nodes[0]
    expect(node.warnings.some((w) => /fits the short form/.test(w))).toBe(true)
  })

  it('flags indefinite length as BER rather than DER', () => {
    // SEQUENCE (indefinite) { INTEGER 1 } EOC
    const result = parseDer(hexToBytes('30800201010000'))
    expect(result.nodes[0].warnings.some((w) => /Indefinite length/.test(w))).toBe(true)
    expect(result.nodes[0].children![0].value).toBe('1')
  })

  it('flags an unsorted SET', () => {
    // SET { INTEGER 2, INTEGER 1 } — descending, which DER forbids.
    const node = parseDer(hexToBytes('3106020102020101')).nodes[0]
    expect(node.warnings.some((w) => /ascending order by their complete encoding/.test(w))).toBe(
      true
    )
  })

  it('accepts a correctly sorted SET', () => {
    const node = parseDer(hexToBytes('3106020101020102')).nodes[0]
    expect(node.warnings).toHaveLength(0)
  })

  it('orders SET members by their full encoding, not just their content', () => {
    // Two members with identical content (0x01) but different tags:
    // BOOLEAN (0x01) then INTEGER (0x02) is ascending; the reverse is not.
    // Comparing content alone would see both as equal and miss the violation.
    const sorted = parseDer(hexToBytes('3106010101020101')).nodes[0]
    expect(sorted.warnings).toHaveLength(0)

    const unsorted = parseDer(hexToBytes('3106020101010101')).nodes[0]
    expect(unsorted.children![0].contentHex).toBe(unsorted.children![1].contentHex)
    expect(unsorted.warnings.some((w) => /complete encoding/.test(w))).toBe(true)
  })

  it('exposes the tag length separately, so a multi-byte tag is not mistaken for length bytes', () => {
    // Single-byte tag, single-byte length.
    const simple = parseDer(hexToBytes('020101')).nodes[0]
    expect(simple.tagLength).toBe(1)
    expect(simple.headerLength).toBe(2)

    // 0x1F escape with a two-byte tag number, then a one-byte length.
    const highTag = parseDer(hexToBytes('1f810000')).nodes[0]
    expect(highTag.tagNumber).toBe(128)
    expect(highTag.tagLength).toBe(3)
    expect(highTag.headerLength).toBe(4)
  })

  it('records each element complete encoding', () => {
    const seq = parseDer(hexToBytes('3006020101020102')).nodes[0]
    expect(seq.encodingHex).toBe('3006020101020102')
    expect(seq.children![0].encodingHex).toBe('020101')
    expect(seq.children![1].encodingHex).toBe('020102')
  })

  it('reports trailing bytes after the last complete element', () => {
    // INTEGER 1 followed by a stray 00 00 and padding — parsing stops at the
    // end-of-content marker, leaving bytes unconsumed.
    const result = parseDer(hexToBytes('020101' + '0000' + '01'))
    expect(result.nodes).toHaveLength(1)
    expect(result.warnings.some((w) => /trailing byte/.test(w.message))).toBe(true)
  })

  it('treats two concatenated structures as two root elements, not an error', () => {
    const result = parseDer(hexToBytes('3003020101' + '3003020102'))
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[0].offset).toBe(0)
    expect(result.nodes[1].offset).toBe(5)
    expect(result.warnings.some((w) => /trailing byte/.test(w.message))).toBe(false)
  })

  it('parses a multi-byte tag number', () => {
    // 0x1F escape, tag number 0x81 0x00 = 128.
    const node = parseDer(hexToBytes('1f810000')).nodes[0]
    expect(node.tagNumber).toBe(128)
  })
})

describe('parseDer — error handling', () => {
  it('rejects empty input', () => {
    expect(() => parseDer(new Uint8Array(0))).toThrowError(/empty/)
  })

  it('rejects a length that runs past the end of the buffer', () => {
    expect(() => parseDer(hexToBytes('0410' + '0011'))).toThrowError(/truncated or the length/)
  })

  it('rejects a tag with no length byte', () => {
    expect(() => parseDer(hexToBytes('30'))).toThrowError(/no length byte/)
  })

  it('rejects a length field wider than this decoder supports', () => {
    expect(() => parseDer(hexToBytes('0485' + '0000000001'))).toThrowError(/at most 4/)
  })

  it('rejects the reserved 0xFF length form', () => {
    expect(() => parseDer(hexToBytes('04ff00'))).toThrowError(/Reserved length form/)
  })

  it('rejects a primitive element using indefinite length', () => {
    expect(() => parseDer(hexToBytes('04800000'))).toThrowError(/never valid/)
  })

  it('rejects an indefinite-length element that is never closed', () => {
    expect(() => parseDer(hexToBytes('3080020101'))).toThrowError(/never closed/)
  })
})

describe('nested structure detection', () => {
  it('parses the DER hidden inside a BIT STRING or OCTET STRING', () => {
    // OCTET STRING wrapping SEQUENCE { INTEGER 1 }
    const node = parseDer(hexToBytes('0405' + '3003020101')).nodes[0]
    expect(node.children).toHaveLength(1)
    expect(node.children![0].typeName).toBe('SEQUENCE')
    expect(node.warnings.some((w) => /parses as a complete DER structure/.test(w))).toBe(true)
  })

  it('leaves genuinely opaque bytes alone', () => {
    const node = parseDer(hexToBytes('0404' + 'deadbeef')).nodes[0]
    expect(node.children).toBeUndefined()
    expect(node.value).toBe('4 bytes')
  })
})

describe('describeStructure', () => {
  it('recognises a real X.509 certificate and pulls out its fields', () => {
    const result = decodeAsn1(TEST_CERT_PEM)

    expect(result.sourceFormat).toBe('pem')
    expect(result.pemLabel).toBe('CERTIFICATE')
    expect(result.structure.type).toBe('X.509 Certificate')
    expect(result.structure.confidence).toBe('high')

    const fields = Object.fromEntries(result.structure.fields.map((f) => [f.label, f.value]))
    expect(fields['Signature algorithm']).toBe('sha256WithRSAEncryption')
    expect(fields['Subject']).toContain('CN=cryptoviz.test')
    expect(fields['Subject']).toContain('O=CryptoViz')
    expect(fields['Issuer']).toContain('CN=cryptoviz.test')
    expect(fields['Not before']).toContain('2026-07-30')
    expect(fields['Not after']).toContain('2036-07-27')
  })

  it('finds the RSA public key and the v3 extensions inside that certificate', () => {
    const result = decodeAsn1(TEST_CERT_PEM)
    const flat: string[] = []
    const walk = (nodes: typeof result.nodes) => {
      for (const node of nodes) {
        if (node.oidName) flat.push(node.oidName)
        if (node.children) walk(node.children)
      }
    }
    walk(result.nodes)

    expect(flat).toContain('rsaEncryption')
    expect(flat).toContain('commonName (CN)')
    expect(flat).toContain('basicConstraints')
    expect(flat).toContain('subjectKeyIdentifier')
    expect(flat).toContain('authorityKeyIdentifier')
  })

  it('recognises an Ed25519 SubjectPublicKeyInfo', () => {
    const result = decodeAsn1(TEST_ED25519_SPKI_PEM)

    expect(result.structure.type).toBe('SubjectPublicKeyInfo')
    expect(result.structure.confidence).toBe('high')

    const fields = Object.fromEntries(result.structure.fields.map((f) => [f.label, f.value]))
    expect(fields['Algorithm']).toBe('id-Ed25519')
    // Ed25519 public keys are exactly 32 bytes.
    expect(fields['Public key']).toContain('256 bits')
  })

  it('recognises a PKCS#8 PrivateKeyInfo layout', () => {
    const result = decodeAsn1(PKCS8_ZERO_KEY_HEX)

    expect(result.sourceFormat).toBe('hex')
    expect(result.structure.type).toBe('PKCS#8 PrivateKeyInfo')

    const fields = Object.fromEntries(result.structure.fields.map((f) => [f.label, f.value]))
    expect(fields['Version']).toBe('0')
    expect(fields['Algorithm']).toBe('id-Ed25519')
  })

  it('reports Unrecognised rather than guessing, and still decodes the tree', () => {
    const result = parseDer(hexToBytes('3006020101020102'))
    expect(result.structure.type).toBe('Unrecognised')
    expect(result.structure.confidence).toBe('none')
    expect(result.nodes[0].children).toHaveLength(2)
  })

  it('returns Unrecognised for input that is not a single top-level SEQUENCE', () => {
    expect(describeStructure(parseDer(hexToBytes('020101')).nodes).type).toBe('Unrecognised')
    expect(describeStructure([]).type).toBe('Unrecognised')
  })
})

describe('decodeAsn1', () => {
  it('auto-detects PEM and hex', () => {
    expect(decodeAsn1(TEST_CERT_PEM).sourceFormat).toBe('pem')
    expect(decodeAsn1('3003020101').sourceFormat).toBe('hex')
    expect(decodeAsn1('30 03 02 01 01').sourceFormat).toBe('hex')
  })

  it('rejects blank input', () => {
    expect(() => decodeAsn1('')).toThrowError(/Provide a PEM block or raw DER hex/)
    expect(() => decodeAsn1('   ')).toThrowError(/Provide a PEM block or raw DER hex/)
  })

  it('produces no DER-strictness warnings for a real OpenSSL certificate', () => {
    const result = decodeAsn1(TEST_CERT_PEM)
    const strictness = result.warnings.filter(
      (w) => /non-minimal|Indefinite|ascending|trailing/i.test(w.message)
    )
    expect(strictness).toHaveLength(0)
  })
})
