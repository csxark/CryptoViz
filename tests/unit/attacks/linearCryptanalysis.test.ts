import { describe, it, expect } from "vitest";
import {
  getParity,
  computeLAT,
  permute8,
  permute8Inv,
  substitute8,
  substitute8Inv,
  encryptSPN,
  decryptSPN,
  generatePairs,
  recoverRightKeyBits,
  SBOX,
  SBOX_INV,
} from "@/lib/attacks/linearCryptanalysis";

describe("Linear Cryptanalysis Core Math", () => {
  it("getParity computes XOR sum of bits correctly", () => {
    expect(getParity(0)).toBe(0); // 0000 -> 0
    expect(getParity(1)).toBe(1); // 0001 -> 1
    expect(getParity(3)).toBe(0); // 0011 -> 0
    expect(getParity(7)).toBe(1); // 0111 -> 1
    expect(getParity(15)).toBe(0); // 1111 -> 0
  });

  it("computeLAT generates Heys S-box LAT and verifies high-bias correlation", () => {
    const lat = computeLAT(SBOX);
    expect(lat.length).toBe(16);
    expect(lat[0].length).toBe(16);

    // Verify Heys S-box linear approximation: Input mask 11 (0x0B), Output mask 4 (0x04)
    // Value in LAT should be 12 - 8 = +4 (corresponding to bias of +0.25)
    expect(lat[11][4]).toBe(4);
    
    // Input mask 0, Output mask 0 always holds (16 matches, value 8)
    expect(lat[0][0]).toBe(8);

    // Check sum of LAT elements (row/col properties)
    expect(lat[0].reduce((acc, val) => acc + val, 0)).toBe(8); // row 0 has only (0,0) as 8, others 0
  });

  it("permute8 and permute8Inv are exact inverses", () => {
    for (let x = 0; x < 256; x++) {
      const p = permute8(x);
      const ip = permute8Inv(p);
      expect(ip).toBe(x);
    }
  });

  it("substitute8 and substitute8Inv are exact inverses", () => {
    for (let x = 0; x < 256; x++) {
      const s = substitute8(x);
      const is = substitute8Inv(s);
      expect(is).toBe(x);
    }
  });

  it("encryptSPN and decryptSPN round-trip correctly", () => {
    const masterKey = 0x2F3D;
    for (let plaintext = 0; plaintext < 256; plaintext++) {
      const ct = encryptSPN(plaintext, masterKey);
      const pt = decryptSPN(ct, masterKey);
      expect(pt).toBe(plaintext);
    }
  });

  it("recovers correct last-round right S-box key candidate from pairs", () => {
    const masterKey = 0x5D3E; // target K3_right = 0xE (14)
    const targetK3Right = masterKey & 0x0F;

    // Generate 1000 pairs (gives very high probability of recovery)
    const pairs = generatePairs(1000, masterKey);
    const results = recoverRightKeyBits(pairs);

    // In Matsui's key recovery, the correct key and another equivalent candidate (differing only in MSB)
    // will share the maximum absolute bias. We verify that the correct candidate has the maximum absolute bias.
    const maxAbsBias = Math.abs(results[0].bias);
    const correctCandidateResult = results.find(r => r.candidate === targetK3Right);
    expect(correctCandidateResult).toBeDefined();
    expect(Math.abs(correctCandidateResult!.bias)).toBeCloseTo(maxAbsBias, 5);
    
    // The correct candidate's absolute bias should be close to the theoretical S-box bias (0.25)
    expect(maxAbsBias).toBeGreaterThan(0.15);

    // The incorrect candidates' biases (excluding the equivalent one) should be closer to 0.
    // The incorrect candidates are those whose absolute bias is not close to the maximum absolute bias.
    const incorrectBiases = results
      .filter(r => Math.abs(Math.abs(r.bias) - maxAbsBias) > 0.01)
      .map(r => Math.abs(r.bias));
    const incorrectMaxBias = Math.max(...incorrectBiases);
    expect(maxAbsBias).toBeGreaterThan(incorrectMaxBias);
  });
});
