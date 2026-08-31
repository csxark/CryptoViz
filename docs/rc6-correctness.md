# Correct RC6 Implementation

This update fixes RC6 encryption and decryption correctness by auditing the core
algorithm against the RC6-32/20/16 specification.

## Key correctness points

- RC6 uses 32-bit words.
- The default round count is 20.
- RC6 block size is 128 bits.
- Input and output blocks are interpreted as four little-endian 32-bit words.
- Key bytes are packed into the key schedule in little-endian order.
- JavaScript multiplication must use `Math.imul` to preserve 32-bit modular
  multiplication behavior.
- Rotate counts must be masked to the low five bits for 32-bit rotations.
- Decryption must exactly reverse final subkey additions, round rotations, and
  initial whitening.

## Reference vector

For RC6-32/20/16:

```text
Key:        00000000000000000000000000000000
Plaintext:  00000000000000000000000000000000
Ciphertext: 8FC3A53656B1F778C129DF4E9848A41E
```

## Manual testing

1. Run the focused RC6 tests.
2. Confirm the all-zero reference vector matches.
3. Confirm decrypting the reference ciphertext returns the original plaintext.
4. Confirm non-zero plaintext/key round trips.
5. Confirm invalid block and key values show validation errors.
6. Run lint/build to ensure the replacement integrates cleanly.
