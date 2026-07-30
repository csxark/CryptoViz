# ASN.1 / DER Structure Decoder

Available at `/encoding/asn1`. Decodes a PEM block or raw DER hex into its full
Tag-Length-Value tree, resolves OIDs, and reports DER-strictness violations.

## TLV

Every ASN.1 element is three fields, and nothing else:

```text
┌──────────┬────────────┬─────────────────┐
│   Tag    │   Length   │     Content     │
└──────────┴────────────┴─────────────────┘
```

### Tag byte

```text
bit  7 6   5    4 3 2 1 0
     ├─┤   │    └─────┬─┘
   class  form      number
```

| Bits 7–6 | Class |
| :--- | :--- |
| `00` | universal (SEQUENCE, INTEGER, …) |
| `01` | application |
| `10` | context-specific — the `[0]`, `[1]` wrappers in X.509 |
| `11` | private |

Bit 5 is the **form**: 0 primitive, 1 constructed (nests other elements).

Bits 4–0 are the tag number. `11111` (0x1F) escapes to a multi-byte
base-128 varint for tag numbers above 30.

### Length field

| Form | Encoding |
| :--- | :--- |
| Short | one byte, `0x00`–`0x7F`, the length itself |
| Long | `0x80 \| n`, then `n` big-endian length bytes |
| Indefinite | `0x80` alone, terminated by `00 00` — **BER only** |

DER requires the **shortest** form. A length of 5 encoded as `81 05` is legal
BER and invalid DER; the decoder flags it.

## Type-specific rules the decoder checks

**INTEGER** — two's complement, big-endian, minimally padded. A leading `0x00`
is only permitted when the next byte has its high bit set. This is why an RSA
modulus so often starts with `00`: without it, the high bit would make the value
negative. `02 02 00 80` is 128; `02 01 80` is −128.

**BIT STRING** — the first content byte is the count of unused bits in the final
byte (0–7). A `BIT STRING` with 0 unused bits very often wraps another complete
DER structure; that is exactly how `SubjectPublicKeyInfo` carries a key, and the
decoder parses the payload and nests it when it parses cleanly.

**BOOLEAN** — DER requires TRUE to be `0xFF` exactly. BER allows any non-zero
byte, so `01 01 01` is flagged.

**NULL** — must have zero content bytes.

**SET** — DER requires members to be sorted by their encoding, so that a given
set has exactly one representation. Unsorted members are flagged.

**PrintableString** — restricted to `A–Z a–z 0–9` and `' ( ) + , - . / : = ?`
plus space. An `@` in a PrintableString is a common real-world bug; the correct
type is `UTF8String`.

**UTCTime** — `YYMMDDHHMMSSZ`. RFC 5280 §4.1.2.5.1 pivots the two-digit year at
50: `49` means 2049, `50` means 1950.

## Object identifiers

An OID is a base-128 varint sequence with one special case at the front: the
first byte packs two arcs as `40 × arc1 + arc2`, with arc1 capped at 2.

```text
06 09 2A 86 48 86 F7 0D 01 01 0B
      └┬┘ └──┬──┘ └────┬────┘
    1.2   840      113549 . 1 . 1 . 11
    │
    0x2A = 42 = 40×1 + 2  →  arcs 1 and 2
```

`0x86 0x48` is `(0x06 << 7) | 0x48` = 840. Result:
`1.2.840.113549.1.1.11` = `sha256WithRSAEncryption`.

A subidentifier may not begin with `0x80` — that is a non-minimal encoding, and
it is flagged.

## Recognised structures

The decoder identifies four PKIX layouts and labels their fields:

| Shape | Document |
| :--- | :--- |
| `SEQUENCE { SEQUENCE, SEQUENCE, BIT STRING }` + validity period | X.509 Certificate (RFC 5280) |
| `SEQUENCE { SEQUENCE, SEQUENCE, BIT STRING }`, no validity | PKCS#10 CSR (RFC 2986) |
| `SEQUENCE { INTEGER, SEQUENCE, OCTET STRING }` | PKCS#8 PrivateKeyInfo (RFC 5208) |
| `SEQUENCE { SEQUENCE, BIT STRING }` | SubjectPublicKeyInfo (RFC 5280 §4.1.2.7) |

Certificates and CSRs share a shape, so they are separated by whether the body
carries a validity period. Identification is best-effort and reports its own
confidence; anything unrecognised still gets a fully decoded TLV tree.

## Scope

This decodes **structure**, not trust. It does not verify signatures, build
chains, check revocation, or validate name constraints. A certificate that
parses cleanly here may still be expired, revoked, or signed by nobody you
trust — structural validity and trustworthiness are unrelated properties.

## Manual testing

1. Open `/encoding/asn1`. The default sample is a self-signed RSA-2048
   certificate.
2. The summary should read **X.509 Certificate** with the subject, issuer,
   validity dates and `sha256WithRSAEncryption`.
3. Click any tree row — its tag, length and content bytes highlight in three
   colours in the hex dump below.
4. Expand into `tbsCertificate` and find the `SubjectPublicKeyInfo`: its
   `BIT STRING` nests the RSA modulus and exponent, parsed one level deeper.
5. Press **Ed25519 public key** — a 44-byte structure small enough to read whole,
   with the `1.3.101.112` OID resolved.
6. Press **Invalid DER** — the notes panel should list indefinite length, an
   unsorted SET, and a non-minimal INTEGER.

## References

- ITU-T X.690 — BER, CER and DER encoding rules.
- ITU-T X.680 — ASN.1 notation and universal tag numbers.
- RFC 5280 — X.509 certificate and CRL profile.
- RFC 5208 / RFC 5958 — PKCS#8 private key information.
- RFC 7468 — textual encodings of PKIX structures (PEM).
- RFC 2986 — PKCS#10 certification request syntax.
