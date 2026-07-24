# Argon2id Visualizer

Argon2id is a password hashing mode from the Argon2 family. It combines ideas
from Argon2i and Argon2d to balance side-channel resistance and GPU/ASIC
resistance.

CryptoViz's Argon2id page is an educational visualizer. It shows how password,
salt, memory, iterations, lanes, and finalization interact conceptually.

## What the visualizer shows

- password and salt inputs
- memory block count
- iteration count
- lane count
- output length
- initialization phase
- Argon2i-style data-independent memory access
- Argon2d-style data-dependent memory access
- finalization into a derived digest
- security notes and safe parameter discussion

## Important note

The visualizer uses deterministic demo mixing so the memory map can be shown in
the browser without heavy computation or native dependencies.

It is **not** a production Argon2id implementation.

For real password storage, use trusted libraries such as libsodium, argon2, or
platform-approved password hashing APIs.

## Manual testing

1. Open `/visualizer/argon2id`.
2. Confirm the page renders with the Argon2id Visualizer heading.
3. Confirm the default digest appears.
4. Change password and confirm the digest changes.
5. Change salt and confirm the digest changes.
6. Increase memory blocks and confirm more cells render.
7. Click memory blocks and confirm details update.
8. Enter invalid memory/iteration/lane values and confirm friendly errors.
9. Resize to mobile width and confirm the layout remains usable.
