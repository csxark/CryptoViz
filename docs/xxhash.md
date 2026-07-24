# XXHash32 Visualization

XXHash is a very fast non-cryptographic hash family commonly used for checksums,
hash tables, file comparison, and data-processing pipelines.

CryptoViz implements **XXH32** for educational visualization. The module shows:

- input byte conversion
- optional 32-bit seed handling
- four-lane 16-byte stripe processing
- short-input path
- remaining 4-byte and 1-byte tail mixing
- avalanche finalization
- final 32-bit hex digest

## Important security note

XXHash is **not a cryptographic hash**.

Do not use it for:

- passwords
- message authentication
- digital signatures
- tamper-proof integrity
- security decisions

Use SHA-256, SHA-512, HMAC, bcrypt, or another suitable cryptographic primitive
for security-sensitive workflows.

## Default example

Input:

```text
Hello, World!
```

Seed:

```text
0
```

Output:

```text
4007de50
```

## Files

- `lib/cipher/hash/xxhash.ts`
- `lib/cipher/registry.ts`
- `lib/cipher/types.ts`
- `lib/workers/cipher.worker.ts`
- `tests/unit/cipher/hash/xxhash.test.ts`
