import { DifferencePair, DDTCell } from "@/types/differential-cryptanalysis";

/**
 * Standard 4-bit S-box used in Heys' Toy Cipher model:
 * Input:  0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
 * Output: E  4  D  1  2  F  B  8  3  A  6  C  5  9  0  7
 */
export const DEFAULT_SBOX: number[] = [
  0xe, 0x4, 0xd, 0x1, 0x2, 0xf, 0xb, 0x8,
  0x3, 0xa, 0x6, 0xc, 0x5, 0x9, 0x0, 0x7,
];

/**
 * Computes the 16x16 Difference Distribution Table (DDT) for a given 4-bit S-box.
 * DDT[ΔX][ΔY] counts how many input pairs with XOR difference ΔX result in output difference ΔY.
 */
export function generateDDT(sbox: number[] = DEFAULT_SBOX): DDTCell[][] {
  const table: number[][] = Array.from({ length: 16 }, () => Array(16).fill(0));

  for (let x1 = 0; x1 < 16; x1++) {
    for (let x2 = 0; x2 < 16; x2++) {
      const inputDiff = x1 ^ x2;
      const outputDiff = sbox[x1] ^ sbox[x2];
      table[inputDiff][outputDiff]++;
    }
  }

  return table.map((row, inDiff) =>
    row.map((count, outDiff) => ({
      inputDiff: inDiff,
      outputDiff: outDiff,
      count,
      probability: count / 16,
    }))
  );
}

/**
 * Applies the S-box substitution to a 16-bit block (4 nibbles).
 */
export function substituteNibbles(block: number, sbox: number[] = DEFAULT_SBOX): number {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const nibble = (block >> (i * 4)) & 0xf;
    const substituted = sbox[nibble];
    result |= substituted << (i * 4);
  }
  return result;
}

/**
 * Bit-permutation layer (P-box) for a 16-bit state.
 * Maps bit i to position P[i].
 */
export function permuteBits(block: number): number {
  const pBox = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15];
  let result = 0;

  for (let i = 0; i < 16; i++) {
    if ((block >> i) & 1) {
      result |= 1 << pBox[i];
    }
  }

  return result;
}

/**
 * Encrypts a 16-bit plaintext using a simple 4-round SPN cipher.
 */
export function encryptSPN(plaintext: number, roundKeys: number[], sbox: number[] = DEFAULT_SBOX): number {
  let state = plaintext;

  // Rounds 1 to 3
  for (let round = 0; round < 3; round++) {
    state ^= roundKeys[round];
    state = substituteNibbles(state, sbox);
    state = permuteBits(state);
  }

  // Final Round 4 (Key Addition + S-Box, no Permutation)
  state ^= roundKeys[3];
  state = substituteNibbles(state, sbox);
  state ^= roundKeys[4];

  return state;
}

/**
 * Generates differential ciphertext pairs given a fixed input difference ΔP.
 */
export function generateDifferentialPairs(
  count: number,
  inputDiff: number,
  roundKeys: number[],
  sbox: number[] = DEFAULT_SBOX
): DifferencePair[] {
  const pairs: DifferencePair[] = [];

  for (let i = 0; i < count; i++) {
    const p1 = Math.floor(Math.random() * 0xffff);
    const p2 = p1 ^ inputDiff;

    const c1 = encryptSPN(p1, roundKeys, sbox);
    const c2 = encryptSPN(p2, roundKeys, sbox);

    pairs.push({
      p1,
      p2,
      c1,
      c2,
      inputDiff,
      outputDiff: c1 ^ c2,
    });
  }

  return pairs;
}