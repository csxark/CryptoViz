# ECB Pattern Leakage Playground

Electronic Codebook (ECB) mode encrypts each plaintext block independently.
That means identical plaintext blocks produce identical ciphertext blocks when
the same key is used.

## What the playground shows

- plaintext split into fixed-size blocks
- repeated plaintext detection
- ECB ciphertext for each block
- highlighted repeated ECB ciphertext
- CBC-style comparison showing how chaining hides repeated block patterns
- leakage summary

## Why ECB is unsafe

ECB does not use an IV, nonce, or chaining state. It leaks structure when data
contains repeated blocks. This is why images, records, templates, and structured
messages can still reveal patterns after ECB encryption.

## Defensive guidance

Use authenticated encryption modes such as AES-GCM or ChaCha20-Poly1305 when
available. Avoid raw ECB mode for real applications.

## Manual testing

1. Open `/visualizer/ecb-pattern`.
2. Confirm the default repeated plaintext shows repeated ECB ciphertext blocks.
3. Confirm CBC comparison produces different ciphertext for repeated blocks.
4. Change block size and confirm grouping updates.
5. Change key or IV and confirm ciphertext updates.
6. Enter empty plaintext and confirm validation appears.
7. Resize to mobile width and confirm the page remains usable.
