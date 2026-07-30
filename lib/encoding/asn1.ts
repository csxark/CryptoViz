/**
 * ASN.1 / DER structure decoder.
 *
 * Every asymmetric algorithm this project visualizes — RSA, ECDSA, Ed25519,
 * X25519, ML-KEM, ML-DSA — travels the real world wrapped in ASN.1 DER and
 * Base64-armoured into PEM. The mathematics is covered elsewhere on the site;
 * this module covers the envelope.
 *
 * DER is a Tag-Length-Value encoding with the "distinguished" constraints that
 * make it canonical: definite lengths only, minimal-length encoding, minimal
 * INTEGER padding, sorted SET OF. Violations are reported as per-node warnings
 * rather than hard failures, so a learner can see exactly *why* a blob is
 * BER-but-not-DER instead of getting an opaque parse error.
 *
 * Pure module: no DOM APIs, typed CipherError on malformed input.
 * @see docs/asn1-der-decoder.md
 */

import { CipherError } from '../utils/errors'

export type TagClass = 'universal' | 'application' | 'context' | 'private'

export interface Asn1Node {
  /** Byte offset of this element's first tag byte within the whole DER blob. */
  offset: number
  /** The raw first tag byte. */
  tagByte: number
  tagClass: TagClass
  /** True for SEQUENCE, SET and other elements that nest. */
  constructed: boolean
  /** Tag number, decoded across multiple bytes for high tags. */
  tagNumber: number
  /** Human-readable type, e.g. 'SEQUENCE' or '[0]'. */
  typeName: string
  /** Bytes consumed by the tag field alone — more than 1 for high tag numbers. */
  tagLength: number
  /** Bytes consumed by the tag and length fields together. */
  headerLength: number
  /** Bytes of content. */
  contentLength: number
  /** headerLength + contentLength. */
  totalLength: number
  /** Raw content bytes as hex. */
  contentHex: string
  /**
   * The element's complete encoding (tag + length + content) as hex. DER SET OF
   * ordering is defined over full encodings, not content alone (X.690 §11.6).
   */
  encodingHex: string
  /** Type-appropriate rendering of the content, when one is available. */
  value?: string
  /** Resolved OID name, for OBJECT IDENTIFIER nodes with a known OID. */
  oidName?: string
  children?: Asn1Node[]
  /** DER-strictness violations and other notes for this specific node. */
  warnings: string[]
  /** Nesting depth, zero at the root. */
  depth: number
}

export interface Asn1ParseResult {
  nodes: Asn1Node[]
  /** The complete DER blob as hex, so the UI can map node offsets onto bytes. */
  derHex: string
  /** Total bytes parsed. */
  byteLength: number
  /** Every warning in the tree, flattened with its node path. */
  warnings: { path: string; message: string }[]
  structure: StructureDescription
}

export interface StructureDescription {
  /** Best-effort identification of the top-level document. */
  type:
    | 'X.509 Certificate'
    | 'PKCS#8 PrivateKeyInfo'
    | 'SubjectPublicKeyInfo'
    | 'PKCS#10 Certification Request'
    | 'Unrecognised'
  /** How confident the identification is. */
  confidence: 'high' | 'medium' | 'none'
  /** Notable fields pulled out of the recognised layout. */
  fields: { label: string; value: string }[]
  /** Why this identification was made, or why none was. */
  reason: string
}

export interface PemBlock {
  label: string
  der: Uint8Array
}

/* ------------------------------------------------------------------------- */
/* Tables                                                                    */
/* ------------------------------------------------------------------------- */

/** Universal (class 0) tag numbers, per ITU-T X.680. */
export const UNIVERSAL_TYPES: Record<number, string> = {
  0: 'END OF CONTENT',
  1: 'BOOLEAN',
  2: 'INTEGER',
  3: 'BIT STRING',
  4: 'OCTET STRING',
  5: 'NULL',
  6: 'OBJECT IDENTIFIER',
  7: 'ObjectDescriptor',
  9: 'REAL',
  10: 'ENUMERATED',
  11: 'EMBEDDED PDV',
  12: 'UTF8String',
  13: 'RELATIVE-OID',
  16: 'SEQUENCE',
  17: 'SET',
  18: 'NumericString',
  19: 'PrintableString',
  20: 'T61String',
  21: 'VideotexString',
  22: 'IA5String',
  23: 'UTCTime',
  24: 'GeneralizedTime',
  25: 'GraphicString',
  26: 'VisibleString',
  27: 'GeneralString',
  28: 'UniversalString',
  29: 'CHARACTER STRING',
  30: 'BMPString',
}

/**
 * Curated OID registry — the algorithm, X.500 attribute and extension OIDs
 * this project actually encounters. Not exhaustive by design; an unknown OID
 * still renders its dotted form.
 */
export const OID_REGISTRY: Record<string, string> = {
  // Public-key algorithms
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10040.4.1': 'id-dsa',
  '1.2.840.10040.4.3': 'dsa-with-sha1',
  '1.2.840.10045.2.1': 'id-ecPublicKey',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',

  // Named elliptic curves
  '1.2.840.10045.3.1.7': 'prime256v1 (P-256 / secp256r1)',
  '1.3.132.0.34': 'secp384r1 (P-384)',
  '1.3.132.0.35': 'secp521r1 (P-521)',
  '1.3.132.0.10': 'secp256k1',

  // Edwards and Montgomery curves
  '1.3.101.110': 'id-X25519',
  '1.3.101.111': 'id-X448',
  '1.3.101.112': 'id-Ed25519',
  '1.3.101.113': 'id-Ed448',

  // Post-quantum (NIST FIPS 203 / 204)
  '2.16.840.1.101.3.4.4.1': 'id-ML-KEM-512',
  '2.16.840.1.101.3.4.4.2': 'id-ML-KEM-768',
  '2.16.840.1.101.3.4.4.3': 'id-ML-KEM-1024',
  '2.16.840.1.101.3.4.3.17': 'id-ML-DSA-44',
  '2.16.840.1.101.3.4.3.18': 'id-ML-DSA-65',
  '2.16.840.1.101.3.4.3.19': 'id-ML-DSA-87',

  // Hash functions
  '1.3.14.3.2.26': 'id-sha1',
  '2.16.840.1.101.3.4.2.1': 'id-sha256',
  '2.16.840.1.101.3.4.2.2': 'id-sha384',
  '2.16.840.1.101.3.4.2.3': 'id-sha512',

  // X.500 distinguished-name attributes
  '2.5.4.3': 'commonName (CN)',
  '2.5.4.6': 'countryName (C)',
  '2.5.4.7': 'localityName (L)',
  '2.5.4.8': 'stateOrProvinceName (ST)',
  '2.5.4.10': 'organizationName (O)',
  '2.5.4.11': 'organizationalUnitName (OU)',
  '2.5.4.5': 'serialNumber',
  '1.2.840.113549.1.9.1': 'emailAddress',

  // X.509 v3 extensions
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.15': 'keyUsage',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.31': 'cRLDistributionPoints',
  '2.5.29.32': 'certificatePolicies',
  '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extKeyUsage',
}

/** Universal string types decodable as text. */
const TEXT_TYPES = new Set([12, 18, 19, 20, 22, 25, 26, 27])

/** Guard against pathological nesting in hand-crafted input. */
const MAX_DEPTH = 32

/* ------------------------------------------------------------------------- */
/* Byte helpers                                                              */
/* ------------------------------------------------------------------------- */

export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0')
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.replace(/[\s:]/g, '')
  if (cleaned.length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'Hex input is empty.')
  }
  if (cleaned.length % 2 !== 0) {
    throw new CipherError('INVALID_INPUT', 'Hex input must have an even number of digits.')
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new CipherError('INVALID_INPUT', 'Hex input contains non-hexadecimal characters.')
  }

  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new CipherError('INVALID_INPUT', 'PEM body contains characters outside the Base64 alphabet.')
  }

  try {
    const binary = atob(cleaned)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    throw new CipherError('INVALID_INPUT', 'PEM body is not valid Base64.')
  }
}

/* ------------------------------------------------------------------------- */
/* PEM                                                                       */
/* ------------------------------------------------------------------------- */

const PEM_PATTERN = /-----BEGIN ([A-Z0-9 #-]+)-----([\s\S]*?)-----END ([A-Z0-9 #-]+)-----/

/**
 * Strip PEM armour and Base64-decode the body. RFC 7468 requires the BEGIN and
 * END labels to match, and a mismatch usually means two files were pasted
 * together — worth an explicit error rather than a confusing parse failure.
 */
export function pemToDer(pem: string): PemBlock {
  const match = PEM_PATTERN.exec(pem)
  if (!match) {
    throw new CipherError(
      'INVALID_INPUT',
      'No PEM block found. Expected -----BEGIN <LABEL>----- … -----END <LABEL>-----.'
    )
  }

  const [, beginLabel, body, endLabel] = match
  if (beginLabel !== endLabel) {
    throw new CipherError(
      'INVALID_INPUT',
      `PEM label mismatch: the block opens with '${beginLabel}' but closes with '${endLabel}'.`
    )
  }

  const der = base64ToBytes(body)
  if (der.length === 0) {
    throw new CipherError('INPUT_REQUIRED', `The '${beginLabel}' PEM block is empty.`)
  }

  return { label: beginLabel, der }
}

/** True when the input looks like PEM armour rather than raw hex. */
export function looksLikePem(input: string): boolean {
  return /-----BEGIN /.test(input)
}

/* ------------------------------------------------------------------------- */
/* OID decoding                                                              */
/* ------------------------------------------------------------------------- */

/**
 * Decode an OBJECT IDENTIFIER body.
 *
 * The first byte packs two arcs: `40 × arc1 + arc2`, with arc1 capped at 2.
 * Every subsequent arc is a base-128 varint whose continuation bit is the high
 * bit. BigInt is used because arcs are not bounded by 32 bits in practice.
 */
export function decodeOid(bytes: Uint8Array): { oid: string; warnings: string[] } {
  const warnings: string[] = []

  if (bytes.length === 0) {
    throw new CipherError('INVALID_INPUT', 'OBJECT IDENTIFIER content is empty.')
  }

  const first = bytes[0]
  const arcs: string[] =
    first < 40
      ? ['0', String(first)]
      : first < 80
        ? ['1', String(first - 40)]
        : ['2', String(first - 80)]

  let value = 0n
  let bitsAccumulated = false
  let subidentifierStart = 1

  for (let i = 1; i < bytes.length; i++) {
    const byte = bytes[i]

    // A subidentifier may not begin with 0x80: that is a non-minimal encoding.
    if (!bitsAccumulated && byte === 0x80) {
      warnings.push(
        `Subidentifier starting at byte ${i} begins with 0x80, which is a non-minimal ` +
          `encoding. DER requires the shortest form (X.690 §8.19.2).`
      )
    }

    value = (value << 7n) | BigInt(byte & 0x7f)
    bitsAccumulated = true

    if ((byte & 0x80) === 0) {
      arcs.push(value.toString())
      value = 0n
      bitsAccumulated = false
      subidentifierStart = i + 1
    }
  }

  if (bitsAccumulated) {
    throw new CipherError(
      'INVALID_INPUT',
      `OBJECT IDENTIFIER ends mid-subidentifier: the arc beginning at byte ` +
        `${subidentifierStart} has its continuation bit set on the final byte.`
    )
  }

  return { oid: arcs.join('.'), warnings }
}

/* ------------------------------------------------------------------------- */
/* Content decoders                                                          */
/* ------------------------------------------------------------------------- */

function decodeInteger(bytes: Uint8Array, warnings: string[]): string {
  if (bytes.length === 0) {
    warnings.push('INTEGER has zero-length content, which DER does not permit.')
    return '(empty)'
  }

  // DER requires minimal encoding: the first 9 bits may not be all-zero or all-one.
  if (bytes.length > 1) {
    if (bytes[0] === 0x00 && (bytes[1] & 0x80) === 0) {
      warnings.push(
        'Non-minimal INTEGER: a leading 0x00 is only permitted when the next byte has its ' +
          'high bit set (X.690 §8.3.2).'
      )
    }
    if (bytes[0] === 0xff && (bytes[1] & 0x80) !== 0) {
      warnings.push('Non-minimal INTEGER: redundant leading 0xFF on a negative value.')
    }
  }

  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)

  // Two's complement: a set top bit means the value is negative.
  if ((bytes[0] & 0x80) !== 0) {
    value -= 1n << BigInt(bytes.length * 8)
  }

  // Long integers (RSA moduli, serial numbers) are more legible as hex.
  if (bytes.length > 8) {
    // Report the significant bit width of the magnitude, not the byte count:
    // DER's leading zero sign-pad would otherwise report a 2048-bit RSA modulus
    // as 2056 bits.
    const magnitude = value < 0n ? -value : value
    const bitWidth = magnitude === 0n ? 0 : magnitude.toString(2).length
    return `${value.toString()} (0x${bytesToHex(bytes)}, ${bitWidth} bits)`
  }
  return value.toString()
}

function decodeBoolean(bytes: Uint8Array, warnings: string[]): string {
  if (bytes.length !== 1) {
    warnings.push(`BOOLEAN must have exactly 1 content byte, found ${bytes.length}.`)
    return '(malformed)'
  }
  if (bytes[0] !== 0x00 && bytes[0] !== 0xff) {
    warnings.push(
      `DER requires TRUE to be encoded as 0xFF, but this BOOLEAN is 0x` +
        `${bytes[0].toString(16).padStart(2, '0')}. BER allows any non-zero value.`
    )
  }
  return bytes[0] === 0x00 ? 'FALSE' : 'TRUE'
}

function decodeBitString(bytes: Uint8Array, warnings: string[]): string {
  if (bytes.length === 0) {
    warnings.push('BIT STRING must contain at least the unused-bits count byte.')
    return '(empty)'
  }

  const unusedBits = bytes[0]
  if (unusedBits > 7) {
    warnings.push(`BIT STRING declares ${unusedBits} unused bits; the maximum is 7.`)
  }

  const payload = bytes.slice(1)

  // An empty BIT STRING must declare 0 unused bits (X.690 §8.6.2.3); otherwise
  // the bit count would come out negative.
  if (payload.length === 0 && unusedBits !== 0) {
    warnings.push(
      `BIT STRING has no payload but declares ${unusedBits} unused bits. X.690 §8.6.2.3 ` +
        `requires an empty BIT STRING to declare 0 unused bits.`
    )
    return `0 bits, ${unusedBits} unused (invalid) — (empty payload)`
  }

  const bitCount = Math.max(0, payload.length * 8 - Math.min(unusedBits, 7))
  return `${bitCount} bits, ${unusedBits} unused — ${bytesToHex(payload)}`
}

function decodeTime(bytes: Uint8Array, typeNumber: number, warnings: string[]): string {
  const raw = new TextDecoder().decode(bytes)

  if (typeNumber === 23) {
    // UTCTime: YYMMDDHHMMSSZ, with the RFC 5280 §4.1.2.5.1 pivot at 50.
    const m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(raw)
    if (!m) {
      warnings.push(`UTCTime '${raw}' is not in the RFC 5280 YYMMDDHHMMSSZ form.`)
      return raw
    }
    const yy = Number(m[1])
    const year = yy >= 50 ? 1900 + yy : 2000 + yy
    return `${year}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]} UTC  (raw: ${raw})`
  }

  // GeneralizedTime: YYYYMMDDHHMMSSZ.
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(raw)
  if (!m) {
    warnings.push(`GeneralizedTime '${raw}' is not in the RFC 5280 YYYYMMDDHHMMSSZ form.`)
    return raw
  }
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]} UTC  (raw: ${raw})`
}

/* ------------------------------------------------------------------------- */
/* Core parser                                                               */
/* ------------------------------------------------------------------------- */

interface Header {
  tagByte: number
  tagClass: TagClass
  constructed: boolean
  tagNumber: number
  /** Bytes the tag field itself occupies. */
  tagLength: number
  headerLength: number
  contentLength: number
  indefinite: boolean
  warnings: string[]
}

const TAG_CLASSES: TagClass[] = ['universal', 'application', 'context', 'private']

function readHeader(bytes: Uint8Array, start: number): Header {
  const warnings: string[] = []

  if (start >= bytes.length) {
    throw new CipherError('INVALID_INPUT', `Unexpected end of data at byte ${start}: no tag byte.`)
  }

  const tagByte = bytes[start]
  const tagClass = TAG_CLASSES[(tagByte >> 6) & 0x03]
  const constructed = (tagByte & 0x20) !== 0
  let tagNumber = tagByte & 0x1f
  let cursor = start + 1

  // High-tag-number form: 0x1F escapes to a base-128 varint.
  if (tagNumber === 0x1f) {
    tagNumber = 0
    let shifted = false
    for (;;) {
      if (cursor >= bytes.length) {
        throw new CipherError(
          'INVALID_INPUT',
          `Unexpected end of data while reading a multi-byte tag at byte ${start}.`
        )
      }
      const byte = bytes[cursor++]
      if (!shifted && byte === 0x80) {
        warnings.push('Multi-byte tag number begins with 0x80, a non-minimal encoding.')
      }
      tagNumber = (tagNumber << 7) | (byte & 0x7f)
      shifted = true
      if ((byte & 0x80) === 0) break
    }
  }

  // The tag field ends here; everything after this is the length field.
  const tagLength = cursor - start

  if (cursor >= bytes.length) {
    throw new CipherError(
      'INVALID_INPUT',
      `Unexpected end of data at byte ${cursor}: no length byte after the tag.`
    )
  }

  const lengthByte = bytes[cursor++]
  let contentLength = 0
  let indefinite = false

  if (lengthByte === 0x80) {
    // Indefinite length: legal BER, forbidden in DER.
    indefinite = true
    warnings.push(
      'Indefinite length (0x80). This is valid BER but forbidden in DER, which requires ' +
        'definite lengths so the encoding is canonical (X.690 §10.1).'
    )
  } else if (lengthByte < 0x80) {
    contentLength = lengthByte
  } else {
    const numLengthBytes = lengthByte & 0x7f
    if (numLengthBytes === 0x7f) {
      throw new CipherError('INVALID_INPUT', `Reserved length form 0xFF at byte ${cursor - 1}.`)
    }
    if (numLengthBytes > 4) {
      throw new CipherError(
        'INVALID_INPUT',
        `Length field spans ${numLengthBytes} bytes at byte ${cursor - 1}; this decoder supports ` +
          `at most 4 (up to 4 GiB), which is far beyond any real certificate.`
      )
    }
    if (cursor + numLengthBytes > bytes.length) {
      throw new CipherError(
        'INVALID_INPUT',
        `Unexpected end of data while reading a ${numLengthBytes}-byte length at byte ${cursor}.`
      )
    }

    if (bytes[cursor] === 0x00) {
      warnings.push('Length field has a redundant leading zero byte, a non-minimal encoding.')
    }

    for (let i = 0; i < numLengthBytes; i++) {
      contentLength = contentLength * 256 + bytes[cursor++]
    }

    if (contentLength < 0x80) {
      warnings.push(
        `Length ${contentLength} is encoded in long form but fits the short form. DER requires ` +
          `the shortest encoding (X.690 §10.1).`
      )
    }
  }

  return {
    tagByte,
    tagClass,
    constructed,
    tagNumber,
    tagLength,
    headerLength: cursor - start,
    contentLength,
    indefinite,
    warnings,
  }
}

function typeNameFor(header: Header): string {
  if (header.tagClass === 'universal') {
    return UNIVERSAL_TYPES[header.tagNumber] ?? `UNIVERSAL ${header.tagNumber}`
  }
  if (header.tagClass === 'context') {
    return `[${header.tagNumber}]${header.constructed ? '' : ' (primitive)'}`
  }
  return `${header.tagClass.toUpperCase()} [${header.tagNumber}]`
}

/** Parse a run of TLV elements between `start` and `end`. */
function parseElements(bytes: Uint8Array, start: number, end: number, depth: number): Asn1Node[] {
  if (depth > MAX_DEPTH) {
    throw new CipherError(
      'INVALID_INPUT',
      `Nesting exceeds ${MAX_DEPTH} levels — the input is almost certainly not a real structure.`
    )
  }

  const nodes: Asn1Node[] = []
  let cursor = start

  while (cursor < end) {
    const header = readHeader(bytes, cursor)
    const warnings = [...header.warnings]
    const contentStart = cursor + header.headerLength

    // End-of-content marker closing an indefinite-length element.
    if (header.tagByte === 0x00 && header.contentLength === 0) break

    let contentLength = header.contentLength
    let totalLength: number

    if (header.indefinite) {
      if (!header.constructed) {
        throw new CipherError(
          'INVALID_INPUT',
          `Primitive element at byte ${cursor} uses indefinite length, which is never valid.`
        )
      }
      // Scan forward for the 00 00 end-of-content marker at this level.
      const closing = findEndOfContent(bytes, contentStart, end)
      contentLength = closing - contentStart
      totalLength = header.headerLength + contentLength + 2
    } else {
      totalLength = header.headerLength + contentLength
      if (contentStart + contentLength > end) {
        throw new CipherError(
          'INVALID_INPUT',
          `Element at byte ${cursor} declares ${contentLength} content bytes but only ` +
            `${end - contentStart} remain. The structure is truncated or the length is wrong.`
        )
      }
    }

    const content = bytes.slice(contentStart, contentStart + contentLength)

    const node: Asn1Node = {
      offset: cursor,
      tagByte: header.tagByte,
      tagClass: header.tagClass,
      constructed: header.constructed,
      tagNumber: header.tagNumber,
      typeName: typeNameFor(header),
      tagLength: header.tagLength,
      headerLength: header.headerLength,
      contentLength,
      totalLength,
      contentHex: bytesToHex(content),
      encodingHex: bytesToHex(bytes.slice(cursor, cursor + totalLength)),
      warnings,
      depth,
    }

    if (header.constructed) {
      node.children = parseElements(bytes, contentStart, contentStart + contentLength, depth + 1)
      if (header.tagClass === 'universal' && header.tagNumber === 17) {
        checkSetOrdering(node, warnings)
      }
    } else {
      decodePrimitive(node, content, header, warnings, depth)
    }

    nodes.push(node)
    cursor += totalLength
  }

  return nodes
}

function findEndOfContent(bytes: Uint8Array, start: number, end: number): number {
  let cursor = start
  while (cursor < end) {
    if (bytes[cursor] === 0x00 && cursor + 1 < end && bytes[cursor + 1] === 0x00) return cursor
    const header = readHeader(bytes, cursor)
    if (header.indefinite) {
      const inner = findEndOfContent(bytes, cursor + header.headerLength, end)
      cursor = inner + 2
    } else {
      cursor += header.headerLength + header.contentLength
    }
  }
  throw new CipherError(
    'INVALID_INPUT',
    'Indefinite-length element is never closed by an end-of-content marker.'
  )
}

function decodePrimitive(
  node: Asn1Node,
  content: Uint8Array,
  header: Header,
  warnings: string[],
  depth: number
): void {
  if (header.tagClass !== 'universal') {
    // Context-specific primitives are usually implicitly-tagged strings.
    if (content.length > 0 && isPrintableAscii(content)) {
      node.value = new TextDecoder().decode(content)
    }
    return
  }

  switch (header.tagNumber) {
    case 1:
      node.value = decodeBoolean(content, warnings)
      break

    case 2:
    case 10:
      node.value = decodeInteger(content, warnings)
      break

    case 3: {
      node.value = decodeBitString(content, warnings)
      // A BIT STRING with 0 unused bits often wraps another DER structure
      // (this is how SubjectPublicKeyInfo carries a key).
      if (content.length > 1 && content[0] === 0x00) {
        attachNested(node, content.slice(1), depth)
      }
      break
    }

    case 4:
      node.value = content.length === 0 ? '(empty)' : `${content.length} bytes`
      attachNested(node, content, depth)
      break

    case 5:
      if (content.length !== 0) {
        warnings.push(`NULL must have zero content bytes, found ${content.length}.`)
      }
      node.value = 'NULL'
      break

    case 6: {
      const { oid, warnings: oidWarnings } = decodeOid(content)
      warnings.push(...oidWarnings)
      node.value = oid
      node.oidName = OID_REGISTRY[oid]
      break
    }

    case 23:
    case 24:
      node.value = decodeTime(content, header.tagNumber, warnings)
      break

    default:
      if (TEXT_TYPES.has(header.tagNumber)) {
        node.value = new TextDecoder().decode(content)
        if (header.tagNumber === 19 && !/^[A-Za-z0-9 '()+,\-./:=?]*$/.test(node.value)) {
          warnings.push(
            'PrintableString contains characters outside its restricted alphabet ' +
              "(A–Z a–z 0–9 and  '()+,-./:=? ). UTF8String is the correct type for these."
          )
        }
      }
  }
}

function isPrintableAscii(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte < 0x20 || byte > 0x7e) return false
  }
  return true
}

/**
 * OCTET STRING and BIT STRING frequently wrap another DER structure. Try to
 * parse the payload; on failure leave it as opaque bytes, which is the common
 * and entirely valid case.
 */
function attachNested(node: Asn1Node, payload: Uint8Array, depth: number): void {
  if (payload.length < 2 || depth >= MAX_DEPTH - 1) return

  try {
    const nested = parseElements(payload, 0, payload.length, depth + 1)
    if (nested.length === 0) return
    // Only accept a nested parse that consumed the whole payload.
    const consumed = nested.reduce((sum, child) => sum + child.totalLength, 0)
    if (consumed !== payload.length) return

    node.children = nested
    node.warnings.push(
      'This payload also parses as a complete DER structure — it is shown nested below. ' +
        'Wrapping one encoding inside an OCTET STRING or BIT STRING is how PKCS#8 and ' +
        'SubjectPublicKeyInfo carry key material.'
    )
  } catch {
    // Genuinely opaque bytes; nothing to report.
  }
}

/**
 * DER requires the elements of a SET OF to be sorted by their **complete**
 * encoding — tag and length included, not content alone — with shorter
 * encodings zero-padded on the right for the comparison (X.690 §11.6).
 * Comparing content only would miss members that differ solely by tag.
 */
function checkSetOrdering(node: Asn1Node, warnings: string[]): void {
  const children = node.children ?? []

  for (let i = 1; i < children.length; i++) {
    const previous = children[i - 1].encodingHex
    const current = children[i].encodingHex
    const width = Math.max(previous.length, current.length)

    if (previous.padEnd(width, '0') > current.padEnd(width, '0')) {
      warnings.push(
        'SET members are not in ascending order by their complete encoding. DER requires ' +
          'SET OF to be sorted so that the same set has exactly one encoding (X.690 §11.6).'
      )
      return
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Structure recognition                                                     */
/* ------------------------------------------------------------------------- */

function findFirstOid(node: Asn1Node): Asn1Node | null {
  if (node.tagClass === 'universal' && node.tagNumber === 6) return node
  for (const child of node.children ?? []) {
    const found = findFirstOid(child)
    if (found) return found
  }
  return null
}

/** Collect every RDN attribute as "CN=value" pairs, in document order. */
function collectNameAttributes(node: Asn1Node, out: string[]): void {
  if (node.tagClass === 'universal' && node.tagNumber === 17) {
    for (const seq of node.children ?? []) {
      const [oidNode, valueNode] = seq.children ?? []
      if (oidNode?.value && valueNode?.value !== undefined) {
        const short = /\(([A-Z]+)\)$/.exec(oidNode.oidName ?? '')?.[1] ?? oidNode.value
        out.push(`${short}=${valueNode.value}`)
      }
    }
    return
  }
  for (const child of node.children ?? []) collectNameAttributes(child, out)
}

function collectTimes(node: Asn1Node, out: string[]): void {
  if (node.tagClass === 'universal' && (node.tagNumber === 23 || node.tagNumber === 24)) {
    if (node.value) out.push(node.value)
  }
  for (const child of node.children ?? []) collectTimes(child, out)
}

function isType(node: Asn1Node | undefined, tagNumber: number): boolean {
  return node?.tagClass === 'universal' && node.tagNumber === tagNumber
}

/**
 * Best-effort identification of the top-level document. Certificates and CSRs
 * share the SEQUENCE{SEQUENCE, SEQUENCE, BIT STRING} shape, so they are
 * separated by whether the body carries a validity period.
 */
export function describeStructure(nodes: Asn1Node[]): StructureDescription {
  const root = nodes[0]

  if (!root || nodes.length !== 1 || !isType(root, 16)) {
    return {
      type: 'Unrecognised',
      confidence: 'none',
      fields: [],
      reason:
        'A recognised PKIX document is a single top-level SEQUENCE. This input is not, so only ' +
        'the raw TLV tree is shown.',
    }
  }

  const children = root.children ?? []

  // SEQUENCE { SEQUENCE, SEQUENCE, BIT STRING } — certificate or CSR.
  if (children.length === 3 && isType(children[0], 16) && isType(children[1], 16) && isType(children[2], 3)) {
    const times: string[] = []
    collectTimes(children[0], times)

    const sigAlg = findFirstOid(children[1])
    const fields: { label: string; value: string }[] = []
    if (sigAlg) {
      fields.push({ label: 'Signature algorithm', value: sigAlg.oidName ?? sigAlg.value ?? '—' })
    }

    if (times.length >= 2) {
      const names: string[] = []
      collectNameAttributes(children[0], names)
      // A certificate names the issuer first, then the subject.
      const half = Math.floor(names.length / 2)
      if (names.length >= 2) {
        fields.push({ label: 'Issuer', value: names.slice(0, half).join(', ') })
        fields.push({ label: 'Subject', value: names.slice(half).join(', ') })
      }
      fields.push({ label: 'Not before', value: times[0] })
      fields.push({ label: 'Not after', value: times[1] })

      const serial = (children[0].children ?? []).find((c) => isType(c, 2))
      if (serial?.value) fields.push({ label: 'Serial number', value: serial.value })

      return {
        type: 'X.509 Certificate',
        confidence: 'high',
        fields,
        reason:
          'Matches SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue } and the body ' +
          'carries a validity period (RFC 5280 §4.1).',
      }
    }

    const names: string[] = []
    collectNameAttributes(children[0], names)
    if (names.length > 0) fields.unshift({ label: 'Subject', value: names.join(', ') })

    return {
      type: 'PKCS#10 Certification Request',
      confidence: 'medium',
      fields,
      reason:
        'Matches SEQUENCE { certificationRequestInfo, signatureAlgorithm, signature } with no ' +
        'validity period, which distinguishes a CSR from a certificate (RFC 2986).',
    }
  }

  // SEQUENCE { INTEGER, SEQUENCE, OCTET STRING } — PKCS#8.
  if (children.length >= 3 && isType(children[0], 2) && isType(children[1], 16) && isType(children[2], 4)) {
    const alg = findFirstOid(children[1])
    return {
      type: 'PKCS#8 PrivateKeyInfo',
      confidence: 'high',
      fields: [
        { label: 'Version', value: children[0].value ?? '—' },
        { label: 'Algorithm', value: alg?.oidName ?? alg?.value ?? '—' },
        { label: 'Key material', value: `${children[2].contentLength} bytes (OCTET STRING)` },
      ],
      reason:
        'Matches SEQUENCE { version, privateKeyAlgorithm, privateKey } (RFC 5208 / RFC 5958).',
    }
  }

  // SEQUENCE { SEQUENCE, BIT STRING } — SubjectPublicKeyInfo.
  if (children.length === 2 && isType(children[0], 16) && isType(children[1], 3)) {
    const alg = findFirstOid(children[0])
    return {
      type: 'SubjectPublicKeyInfo',
      confidence: 'high',
      fields: [
        { label: 'Algorithm', value: alg?.oidName ?? alg?.value ?? '—' },
        { label: 'Public key', value: children[1].value ?? '—' },
      ],
      reason: 'Matches SEQUENCE { algorithm, subjectPublicKey } (RFC 5280 §4.1.2.7).',
    }
  }

  return {
    type: 'Unrecognised',
    confidence: 'none',
    fields: [],
    reason:
      `Top-level SEQUENCE with ${children.length} child element(s) does not match a certificate, ` +
      `CSR, PKCS#8 key or SubjectPublicKeyInfo layout. The TLV tree is still fully decoded.`,
  }
}

/* ------------------------------------------------------------------------- */
/* Entry points                                                              */
/* ------------------------------------------------------------------------- */

function flattenWarnings(
  nodes: Asn1Node[],
  path: string,
  out: { path: string; message: string }[]
): void {
  nodes.forEach((node, index) => {
    const nodePath = path ? `${path} › ${node.typeName}[${index}]` : `${node.typeName}[${index}]`
    for (const message of node.warnings) out.push({ path: nodePath, message })
    if (node.children) flattenWarnings(node.children, nodePath, out)
  })
}

/** Parse raw DER bytes into a TLV tree. */
export function parseDer(der: Uint8Array): Asn1ParseResult {
  if (der.length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'DER input is empty.')
  }

  const nodes = parseElements(der, 0, der.length, 0)
  const consumed = nodes.reduce((sum, node) => sum + node.totalLength, 0)

  const warnings: { path: string; message: string }[] = []
  flattenWarnings(nodes, '', warnings)

  if (consumed < der.length) {
    warnings.push({
      path: '(root)',
      message:
        `${der.length - consumed} trailing byte(s) after the last complete element. This usually ` +
        `means two structures were concatenated or the input was padded.`,
    })
  }

  return {
    nodes,
    derHex: bytesToHex(der),
    byteLength: der.length,
    warnings,
    structure: describeStructure(nodes),
  }
}

/**
 * Parse PEM text or raw hex, detecting the format automatically. This is the
 * entry point the UI uses.
 */
export function decodeAsn1(input: string): Asn1ParseResult & { sourceFormat: 'pem' | 'hex'; pemLabel?: string } {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new CipherError('INPUT_REQUIRED', 'Provide a PEM block or raw DER hex to decode.')
  }

  if (looksLikePem(input)) {
    const { label, der } = pemToDer(input)
    return { ...parseDer(der), sourceFormat: 'pem', pemLabel: label }
  }

  return { ...parseDer(hexToBytes(input)), sourceFormat: 'hex' }
}
