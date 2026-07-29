# CRC32 Visualization

CRC32 is a checksum commonly used to detect accidental data corruption. It is
not a cryptographic hash.

## What the visualizer shows

- message bytes
- reflected CRC32 polynomial
- generated lookup table preview
- current CRC register before each byte
- table index
- table value
- shifted/XORed CRC register
- final XOR
- final checksum

## Standard test vector

Input:

```text
123456789
```

Expected CRC32:

```text
CBF43926
```

## Security note

CRC32 is useful for accidental error detection, but it is not collision-resistant
and should not be used for passwords, signatures, authentication, or tamper
protection.

## Manual testing

1. Open `/visualizer/crc32`.
2. Confirm the default message renders a CRC32 checksum.
3. Change the message and confirm the checksum updates.
4. Confirm each byte appears in the step table.
5. Use `123456789` and confirm checksum `CBF43926`.
6. Enter an empty message and confirm validation appears.
7. Enter invalid hex values and confirm validation appears.
8. Resize to mobile width and confirm the page remains usable.
