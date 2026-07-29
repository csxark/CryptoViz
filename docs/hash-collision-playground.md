# Hash Collision Playground

A hash collision happens when two different inputs produce the same hash output.
Strong cryptographic hashes make useful collisions extremely hard to find, but
collisions are unavoidable when many inputs are mapped into a fixed-size output
space.

This playground intentionally truncates a toy demo hash so collisions are easy
to see.

## What the playground shows

- full demo hash for each value
- shortened/truncated hash
- bucket number
- collision groups
- estimated birthday-bound collision chance
- effect of changing output size

## Why this matters

If a hash output is too small, collisions become likely. Cryptographic hash
functions use large outputs and careful design to make practical collision
attacks infeasible.

## Security note

This module is educational. It does not replace SHA-256, SHA-3, BLAKE2, or other
real hash functions. Do not use the demo hash for security decisions.

## Manual testing

1. Open `/visualizer/hash-collision`.
2. Confirm the default values render hash buckets.
3. Lower hash bits and confirm collisions become more likely.
4. Raise hash bits and confirm collisions become less likely.
5. Edit values and confirm hashes update.
6. Enter only one value and confirm validation appears.
7. Resize to mobile width and confirm the page remains usable.
