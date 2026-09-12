# Skipjack Decryption Support

Issue #606 reports that Skipjack decryption is unimplemented. This update adds
the missing decrypt path and tests it against encryption round trips and a known
Skipjack sample vector.

## Algorithm shape

Skipjack uses:

- 64-bit blocks
- 80-bit keys
- 32 rounds
- Rule A for rounds 1-8 and 17-24
- Rule B for rounds 9-16 and 25-32
- a byte-oriented G permutation built from the Skipjack F-table

## Decryption approach

Decryption reverses the 32 encryption rounds:

1. Start from round 32.
2. Apply inverse Rule B or inverse Rule A depending on the original round.
3. Use inverse G to recover the previous `w1` word.
4. Undo the counter and word mixing.
5. Continue back to round 1.

## Reference vector

```text
Key:        00998877665544332211
Plaintext:  33221100DDCCBBAA
Ciphertext: 2587CAE27A12D300
```

## Manual testing

1. Run the focused Skipjack unit tests.
2. Confirm the sample vector encrypts correctly.
3. Confirm decrypting the sample ciphertext returns the sample plaintext.
4. Confirm zero and non-zero values round trip.
5. Confirm invalid block/key inputs show validation errors.
6. Confirm trace output includes 32 encryption and decryption rounds.
