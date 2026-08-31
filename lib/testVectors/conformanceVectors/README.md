# Cryptographic Conformance Test Vectors

This directory contains known-answer test vectors for validating CryptoViz cipher implementations against authoritative standards.

## Format

Vectors follow the `TestVectorSet` schema defined in `lib/testing/testVectorFormat.ts`:

```json
{
  "algorithm": "aes",
  "variant": "128",
  "vectors": [
    {
      "testId": "unique-id",
      "inputs": {
        "key": "hex-string",
        "plaintext": "hex-string"
      },
      "expectedOutput": {
        "ciphertext": "hex-string"
      }
    }
  ]
}
```

## Sources

- **AES**: FIPS 197 (Federal Information Processing Standards Publication 197)
- **SHA-256**: FIPS 180-4 (Secure Hash Standard)

## Adding New Vectors

1. Create `algorithm.json` in this directory
2. Follow the schema with proper metadata attribution
3. Run: `npm run conformance algorithm-name`

## Running Tests

```bash
# Run conformance for all algorithms
npm run conformance

# Run conformance for specific algorithm
npm run conformance aes

# Run full test suite (includes conformance)
npm test
```

## CI Integration

Conformance tests run automatically in CI via `npm test`.