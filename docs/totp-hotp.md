# TOTP / HOTP Authenticator Visualizer

The six digits in an authenticator app are HMAC with a very specific squeeze
applied. Both RFCs are short, and the visualizer at `/otp` traces every step.

## HOTP (RFC 4226)

```text
HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^Digit
```

`K` is the shared secret, `C` is an 8-byte big-endian counter.

### Dynamic truncation (§5.3)

This is the step worth understanding, and the one hand-rolled implementations
get wrong:

```text
offset  = mac[19] & 0x0f                       // low nibble of the LAST byte
binCode = (mac[offset]   & 0x7f) << 24
        | (mac[offset+1] & 0xff) << 16
        | (mac[offset+2] & 0xff) <<  8
        | (mac[offset+3] & 0xff)
code    = binCode mod 10^digits
```

Two details:

- **The offset is data-dependent.** The last digest byte chooses where to read,
  so the extracted bits are not a fixed slice of the MAC.
- **`& 0x7f` is not security, it is portability.** Clearing the high bit makes
  the value an unambiguously positive 31-bit integer, so implementations on
  platforms with signed 32-bit integers cannot disagree about the same digest.

### Counter resynchronization (§7.4)

A hardware token's counter advances every time the button is pressed, whether or
not the code is submitted. The server therefore searches a look-ahead window
rather than testing a single counter value. Too small a window and users lock
themselves out by fidgeting; too large and an attacker gets more valid codes to
guess against.

### Appendix D test vectors

Secret `12345678901234567890` (ASCII, 20 bytes):

| Counter | Code | Counter | Code |
| :--- | :--- | :--- | :--- |
| 0 | 755224 | 5 | 254676 |
| 1 | 287082 | 6 | 287922 |
| 2 | 359152 | 7 | 162583 |
| 3 | 969429 | 8 | 399871 |
| 4 | 338314 | 9 | 520489 |

All ten are asserted in `tests/unit/otp/hotp.test.ts`.

## TOTP (RFC 6238)

TOTP is HOTP with one substitution:

```text
T = floor((unixTime − T0) / X)        T0 = 0, X = 30 seconds
TOTP(K) = HOTP(K, T)
```

That is the entire difference. Two devices that agree on the clock compute the
same `T`, therefore the same code, without ever exchanging a message.

### The verification window

The trade is direct. A skewed phone clock produces a code from the wrong step,
so servers accept `T ± window`. RFC 6238 §5.2 recommends `window = 1`. Each
extra step you allow is another 30 seconds during which a captured code can be
replayed — the visualizer's skew slider and verifier make that trade visible.

### Appendix B test vectors

Codes are 8 digits, `X = 30`. Seeds are the ASCII digits repeated to 20, 32 and
64 bytes for SHA-1, SHA-256 and SHA-512 respectively.

| Unix time | SHA-1 | SHA-256 | SHA-512 |
| :--- | :--- | :--- | :--- |
| 59 | 94287082 | 46119246 | 90693936 |
| 1111111109 | 07081804 | 68084774 | 25091201 |
| 1111111111 | 14050471 | 67062674 | 99943326 |
| 1234567890 | 89005924 | 91819424 | 93441116 |
| 2000000000 | 69279037 | 90698825 | 38618901 |
| 20000000000 | 65353130 | 77737706 | 47863826 |

All eighteen are asserted in `tests/unit/otp/totp.test.ts`. Note the last row:
`T = 666666666` exceeds what a 32-bit shift can express, which is why
`counterToBytes()` uses `BigInt`.

## Base32 (RFC 4648 §6)

Authenticator secrets are Base32, not hex or Base64. The alphabet is `A–Z` plus
`2–7`; `0`, `1`, `8` and `9` are excluded so they cannot be confused with `O`,
`I`, `B` and `g` when a human transcribes a secret by hand.

`base32Decode()` deliberately **throws** on a character outside the alphabet
rather than skipping it. Silently dropping a bad character yields a wrong secret
and an unexplained wrong code, which is a far worse failure than a clear error.

## The provisioning URI

```text
otpauth://totp/Issuer:account?secret=...&issuer=...&algorithm=SHA1&digits=6&period=30
```

The enrolment QR code is just this URL. Nothing cryptographic happens during the
scan — the secret travels in the clear. That is why enrolment must occur over an
already-trusted channel, and why a screenshot of that QR is equivalent to the
secret itself.

## Security notes

- **TOTP is a second factor, not an authentication protocol.** The code is
  phishable: a relay site that collects it and replays it within the window
  authenticates successfully. WebAuthn/FIDO2 solves this by binding the
  assertion to the origin; TOTP cannot.
- **The secret is symmetric.** The server stores a value that can generate codes,
  so a server-side database breach exposes every user's generator.
- **The modulo introduces a slight bias.** `2^31` is not a multiple of `10^6`, so
  some codes are marginally more likely. This is accepted because codes are
  short-lived and rate-limited rather than long-term keys.

## Manual testing

1. Open `/otp`. The code should tick over every 30 seconds with the ring
   emptying alongside it.
2. Press **Use the code above**, then **Verify** — accepted, zero drift.
3. Drag the clock-skew slider to +60s. The displayed code changes. Verify it
   with a window of 1 → rejected; raise the window to 3 → accepted, with the
   drift reported in seconds.
4. Switch to **HOTP**, press **+1** repeatedly, and confirm the code changes only
   when the counter does and never expires on its own.
5. Switch the algorithm to SHA-512 and watch the digest in the byte map grow from
   20 to 64 bytes while the truncation window stays four bytes wide.

## References

- RFC 4226 — HOTP: An HMAC-Based One-Time Password Algorithm.
- RFC 6238 — TOTP: Time-Based One-Time Password Algorithm.
- RFC 4648 §6 — Base32 encoding.
- RFC 2104 — HMAC: Keyed-Hashing for Message Authentication.
