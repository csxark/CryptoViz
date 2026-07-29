# DES Key Schedule Visualizer

DES uses a 64-bit key input, but the key schedule removes parity bits and
generates sixteen 48-bit round subkeys.

## What the visualizer shows

1. Convert the 16-character hex key into 64 bits.
2. Apply PC-1 to remove parity bits and permute into 56 bits.
3. Split the key into 28-bit `C0` and `D0`.
4. Rotate both halves according to the DES shift schedule.
5. Join `C` and `D`.
6. Apply PC-2 to produce each 48-bit round subkey.

## Default reference key

```text
133457799BBCDFF1
```

Expected subkeys include:

```text
Round 1:  1B02EFFC7072
Round 2:  79AED9DBC9E5
Round 16: CB3D8B0E17F5
```

## Security note

DES is no longer secure for real cryptographic use. This page is for learning
the historical key schedule only.

## Manual testing

1. Open `/visualizer/des-key-schedule`.
2. Confirm the default key generates 16 round subkeys.
3. Confirm round 1 subkey is `1B02EFFC7072`.
4. Click several rounds and confirm C, D, shift count, and subkey update.
5. Enter invalid hex and confirm a friendly error appears.
6. Enter a short key and confirm validation prevents generation.
7. Resize to mobile width and confirm the page remains usable.
