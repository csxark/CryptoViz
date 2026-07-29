# SHA-256 Compression Round Visualizer

SHA-256 processes data in 512-bit blocks. For each block, the compression
function expands sixteen input words into a 64-word message schedule and then
runs 64 rounds over eight working variables.

## What the visualizer shows

- single-block message padding
- 512-bit padded block
- 64-word message schedule
- round constants `K[t]`
- working variables `a` through `h`
- `Ch(e,f,g)`
- `Maj(a,b,c)`
- uppercase sigma functions
- temporary values `T1` and `T2`
- final compressed digest

## Default test vector

Input:

```text
abc
```

Expected SHA-256 digest:

```text
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

## Manual testing

1. Open `/visualizer/sha256-compression`.
2. Confirm the default message `abc` produces the expected digest.
3. Confirm the padded 512-bit block is shown.
4. Confirm the message schedule contains 64 words.
5. Click several rounds and confirm variables and formulas update.
6. Enter an empty message and confirm an error appears.
7. Enter a message longer than 55 UTF-8 bytes and confirm validation prevents it.
8. Resize to mobile width and confirm the page remains usable.
