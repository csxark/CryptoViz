# Interactive AES Key Expansion Visualizer

AES-128 does not use the original 128-bit key directly for every round. Instead,
it expands the key into 44 32-bit words, grouped into 11 round keys.

## Concepts shown

- Original key words `w[0]` through `w[3]`
- `RotWord`
- `SubWord`
- `Rcon`
- XOR with the word four positions back
- Round keys 0 through 10
- Friendly validation for malformed AES-128 keys

## Default key

```text
000102030405060708090a0b0c0d0e0f
```

The first expanded round key should be:

```text
d6aa74fdd2af72fadaa678f1d6ab76fe
```

The final round key should be:

```text
13111d7fe3944a17f307a78b4d2b30c5
```

## Manual testing

1. Open `/visualizer/aes-key-expansion`.
2. Confirm the default key expands into 44 words.
3. Confirm round 0 is the original key.
4. Click round 1 and confirm the expected round key appears.
5. Inspect `w[4]` and confirm RotWord/SubWord/Rcon explanation is shown.
6. Enter non-hex input and confirm an error appears.
7. Enter a short key and confirm validation prevents expansion.
8. Resize to mobile width and confirm the page remains usable.
