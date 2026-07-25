import { CipherError } from "../utils/errors";

// Heys S-box (from Howard Heys' Tutorial on Linear and Differential Cryptanalysis)
export const SBOX = [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7];

// Inverse Heys S-box
export const SBOX_INV = [14, 3, 4, 8, 1, 12, 10, 15, 7, 13, 9, 6, 11, 2, 0, 5];

export interface LATEntry {
  inputMask: number;
  outputMask: number;
  count: number;
  bias: number;
}

/**
 * Returns the parity (XOR sum of bits) of a number.
 */
export function getParity(val: number): number {
  let p = 0;
  let temp = val;
  while (temp > 0) {
    p ^= temp & 1;
    temp >>= 1;
  }
  return p;
}

/**
 * Computes the Linear Approximation Table (LAT) for a 4-bit S-box.
 * Each entry holds (count - 8), representing the deviation from 1/2.
 */
export function computeLAT(sbox: number[] = SBOX): number[][] {
  const lat: number[][] = Array.from({ length: 16 }, () => Array(16).fill(0));
  for (let alpha = 0; alpha < 16; alpha++) {
    for (let beta = 0; beta < 16; beta++) {
      let count = 0;
      for (let x = 0; x < 16; x++) {
        const y = sbox[x];
        const inputParity = getParity(x & alpha);
        const outputParity = getParity(y & beta);
        if (inputParity === outputParity) {
          count++;
        }
      }
      lat[alpha][beta] = count - 8;
    }
  }
  return lat;
}

/**
 * Permutation map for our 8-bit SPN.
 * Bit positions (0 to 7) are permuted.
 */
export const PERM_MAP = [0, 4, 1, 5, 2, 6, 3, 7];
export const PERM_MAP_INV = [0, 2, 4, 6, 1, 3, 5, 7];

export function permute8(val: number): number {
  let out = 0;
  for (let i = 0; i < 8; i++) {
    const bit = (val >> i) & 1;
    out |= bit << PERM_MAP[i];
  }
  return out;
}

export function permute8Inv(val: number): number {
  let out = 0;
  for (let i = 0; i < 8; i++) {
    const bit = (val >> i) & 1;
    out |= bit << PERM_MAP_INV[i];
  }
  return out;
}

/**
 * Substitution layer for 8-bit block (two 4-bit S-boxes).
 */
export function substitute8(val: number, sbox: number[] = SBOX): number {
  const high = (val >> 4) & 0x0F;
  const low = val & 0x0F;
  return (sbox[high] << 4) | sbox[low];
}

export function substitute8Inv(val: number, sboxInv: number[] = SBOX_INV): number {
  const high = (val >> 4) & 0x0F;
  const low = val & 0x0F;
  return (sboxInv[high] << 4) | sboxInv[low];
}

/**
 * Key expansion: Generates three 8-bit round keys from a 16-bit master key.
 */
export function expandKey(masterKey: number): number[] {
  // Extract simple overlapping 8-bit slices
  const k1 = (masterKey >> 8) & 0xFF;
  const k2 = (masterKey >> 4) & 0xFF;
  const k3 = masterKey & 0xFF;
  return [k1, k2, k3];
}

/**
 * 2-Round SPN Encryption
 */
export function encryptSPN(plaintext: number, masterKey: number): number {
  const keys = expandKey(masterKey);
  // Round 1
  let state = plaintext ^ keys[0];
  state = substitute8(state);
  state = permute8(state);
  // Round 2
  state = state ^ keys[1];
  state = substitute8(state);
  // Final Key Addition
  state = state ^ keys[2];
  return state;
}

/**
 * 2-Round SPN Decryption
 */
export function decryptSPN(ciphertext: number, masterKey: number): number {
  const keys = expandKey(masterKey);
  // Undo Final Key Addition
  let state = ciphertext ^ keys[2];
  // Undo Round 2 Substitution
  state = substitute8Inv(state);
  // Undo Round 2 Key Addition
  state = state ^ keys[1];
  // Undo Round 1 Permutation
  state = permute8Inv(state);
  // Undo Round 1 Substitution
  state = substitute8Inv(state);
  // Undo Round 1 Key Addition
  state = state ^ keys[0];
  return state;
}

export interface EncryptionPair {
  plaintext: number;
  ciphertext: number;
}

/**
 * Generates N random plaintext-ciphertext pairs under a master key.
 */
export function generatePairs(N: number, masterKey: number): EncryptionPair[] {
  const pairs: EncryptionPair[] = [];
  for (let i = 0; i < N; i++) {
    const pt = Math.floor(Math.random() * 256);
    const ct = encryptSPN(pt, masterKey);
    pairs.push({ plaintext: pt, ciphertext: ct });
  }
  return pairs;
}

export interface CandidateResult {
  candidate: number;
  bias: number;
  count: number;
}

/**
 * Runs Matsui's Key Recovery Attack on the right S-box of the last round (K3_right).
 * The linear approximation used is:
 * (P_left . 11) ^ (W2_right . 8) = KeyConst (holding with bias 1/4)
 */
export function recoverRightKeyBits(pairs: EncryptionPair[]): CandidateResult[] {
  const results: CandidateResult[] = [];
  const N = pairs.length;

  for (let guess = 0; guess < 16; guess++) {
    let matchCount = 0;
    for (const { plaintext, ciphertext } of pairs) {
      // 1. Get the ciphertext lower nibble (right S-box output)
      const ctRight = ciphertext & 0x0F;
      // 2. Undo the final key addition for this guess
      const sboxOut = ctRight ^ guess;
      // 3. Undo the S-box substitution to get target candidate value W2_right
      const w2Right = SBOX_INV[sboxOut];
      
      // Evaluate the linear approximation equation:
      // (P_left . 11) ^ (W2_right . 8) = 0
      // P_left is the high nibble of plaintext
      const pLeft = (plaintext >> 4) & 0x0F;
      const term1 = getParity(pLeft & 11);
      const term2 = getParity(w2Right & 8);
      
      if ((term1 ^ term2) === 0) {
        matchCount++;
      }
    }
    const empiricalProb = matchCount / N;
    const bias = empiricalProb - 0.5;
    results.push({
      candidate: guess,
      bias,
      count: matchCount,
    });
  }

  // Sort candidates by the absolute value of the bias descending
  return results.sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias));
}
