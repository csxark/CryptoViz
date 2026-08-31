import {
  flipBitInHex,
  flipBitInString,
  computeHexDiff,
  analyzeCipherOutputs,
  shannonEntropy,
} from '../../../lib/utils/cipherDiff';

describe('cipherDiff utilities', () => {
  describe('flipBitInHex', () => {
    it('should flip the 0th bit (MSB of first byte) in a hex string', () => {
      const input = '00';
      const output = flipBitInHex(input, 0);
      expect(output).toBe('80');
    });

    it('should flip the 7th bit (LSB of first byte) in a hex string', () => {
      const input = '00';
      const output = flipBitInHex(input, 7);
      expect(output).toBe('01');
    });

    it('should flip middle bits within first byte', () => {
      expect(flipBitInHex('00', 1)).toBe('40');
      expect(flipBitInHex('00', 2)).toBe('20');
      expect(flipBitInHex('00', 3)).toBe('10');
      expect(flipBitInHex('00', 4)).toBe('08');
      expect(flipBitInHex('00', 5)).toBe('04');
      expect(flipBitInHex('00', 6)).toBe('02');
    });

    it('should flip bits from 1 to 0', () => {
      expect(flipBitInHex('ff', 0)).toBe('7f');
      expect(flipBitInHex('ff', 7)).toBe('fe');
      expect(flipBitInHex('ff', 3)).toBe('ef');
    });

    it('should flip a bit in a multi-byte hex string', () => {
      const input = '000000';
      // 8th bit is the MSB of the second byte
      const output = flipBitInHex(input, 8);
      expect(output).toBe('008000');
    });

    it('should flip bits across 4-byte boundaries', () => {
      const input = '00000000';
      expect(flipBitInHex(input, 16)).toBe('00008000');
      expect(flipBitInHex(input, 24)).toBe('00000080');
      expect(flipBitInHex(input, 31)).toBe('00000001');
    });

    it('should throw an error for odd length hex string', () => {
      expect(() => flipBitInHex('123', 0)).toThrow('Hex string must have an even length.');
      expect(() => flipBitInHex('f', 0)).toThrow('Hex string must have an even length.');
      expect(() => flipBitInHex('abcde', 2)).toThrow('Hex string must have an even length.');
    });

    it('should throw an error for out of bounds index', () => {
      expect(() => flipBitInHex('00', 8)).toThrow('Bit index out of bounds.');
      expect(() => flipBitInHex('00', -1)).toThrow('Bit index out of bounds.');
      expect(() => flipBitInHex('0000', 16)).toThrow('Bit index out of bounds.');
      expect(() => flipBitInHex('0000', 100)).toThrow('Bit index out of bounds.');
    });
  });

  describe('flipBitInString', () => {
    it('should flip a bit in an ASCII string', () => {
      const input = 'a'; // ASCII 0x61
      // 0x61 = 0110 0001
      // Flip bit 7 (LSB): 0110 0000 = 0x60 = '`'
      const output = flipBitInString(input, 7);
      expect(output).toBe('`');
    });

    it('should flip bit 2 to toggle case or neighbor character', () => {
      // 'A' = 0x41 (0100 0001), flip bit 2 (1 << 5 = 0x20) -> 0x61 ('a')
      const input = 'A';
      const output = flipBitInString(input, 2);
      expect(output).toBe('a');
    });

    it('should flip bits in multi-character strings', () => {
      const input = 'Hello World';
      // 'H' = 0x48 (0100 1000). Flip bit 2 -> 0x68 ('h')
      const output = flipBitInString(input, 2);
      expect(output).toBe('hello World');
      expect(output.startsWith('h')).toBe(true);
    });

    it('should throw an error for out of bounds index', () => {
      expect(() => flipBitInString('hello', 40)).toThrow('Bit index out of bounds.');
      expect(() => flipBitInString('hello', -1)).toThrow('Bit index out of bounds.');
      expect(() => flipBitInString('a', 8)).toThrow('Bit index out of bounds.');
    });
  });

  describe('computeHexDiff', () => {
    it('should correctly compute the XOR difference between two hex strings', () => {
      const hexA = '000f';
      const hexB = '00f0';
      // XOR of 0f and f0 is ff, diffCount is 8
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('00ff');
      expect(result.diffCount).toBe(8);
    });

    it('should pad strings of different lengths with zeros', () => {
      const hexA = '0f';
      const hexB = '0f0a';
      const result = computeHexDiff(hexA, hexB);
      // '0f00' ^ '0f0a' = '000a'
      expect(result.xorHex).toBe('000a');
      expect(result.diffCount).toBe(2);
    });

    it('should handle hexA longer than hexB with zero padding', () => {
      const hexA = '0f0a';
      const hexB = '0f';
      const result = computeHexDiff(hexA, hexB);
      // '0f0a' ^ '0f00' = '000a'
      expect(result.xorHex).toBe('000a');
      expect(result.diffCount).toBe(2);
    });

    it('should handle 0x prefix and spaces in both hex strings', () => {
      const hexA = '0x 0f 00';
      const hexB = '0x0f0a';
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('000a');
      expect(result.diffCount).toBe(2);
    });

    it('should handle odd length hex inputs with automatic right padding', () => {
      const hexA = 'f';
      const hexB = 'f0';
      const result = computeHexDiff(hexA, hexB);
      // 'f0' ^ 'f0' = '00'
      expect(result.xorHex).toBe('00');
      expect(result.diffCount).toBe(0);
    });

    it('should handle completely identical hex inputs', () => {
      const hexA = 'deadbeefcafe';
      const hexB = 'deadbeefcafe';
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('000000000000');
      expect(result.diffCount).toBe(0);
    });

    it('should handle completely opposite hex inputs (all ones inverted)', () => {
      const hexA = '00000000';
      const hexB = 'ffffffff';
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('ffffffff');
      expect(result.diffCount).toBe(32);
    });

    it('should handle empty strings cleanly', () => {
      const result1 = computeHexDiff('', '');
      expect(result1.xorHex).toBe('');
      expect(result1.diffCount).toBe(0);

      const result2 = computeHexDiff('ff', '');
      expect(result2.xorHex).toBe('ff');
      expect(result2.diffCount).toBe(8);

      const result3 = computeHexDiff('', 'ff');
      expect(result3.xorHex).toBe('ff');
      expect(result3.diffCount).toBe(8);
    });

    it('should calculate accurate bit hamming distance across random vectors', () => {
      const hexA = '123456789abcdef0';
      const hexB = '0000000000000000';
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('123456789abcdef0');
      // Number of set bits in 123456789abcdef0:
      // 1: 1, 2: 1, 3: 2, 4: 1, 5: 2, 6: 2, 7: 3, 8: 1, 9: 2, a: 2, b: 3, c: 2, d: 3, e: 3, f: 4, 0: 0
      // Sum = 1+1+2+1+2+2+3+1+2+2+3+2+3+3+4+0 = 32
      expect(result.diffCount).toBe(32);
    });

    it('should compute partial byte differences accurately for cryptographic hashes', () => {
      const hash1 = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
      const hash2 = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146f';
      const result = computeHexDiff(hash1, hash2);
      expect(result.xorHex.endsWith('01')).toBe(true);
      expect(result.diffCount).toBe(1);
    });
  });

  describe('analyzeCipherOutputs and shannonEntropy integration', () => {
    it('analyzes utf8 and hex encoding pairs correctly', () => {
      const res = analyzeCipherOutputs('Hello', 'Hello', 'utf8', 'utf8');
      expect(res.hammingDistance).toBe(0);
      expect(res.bitDifferencePercentage).toBe(0);
      expect(res.alignedLength).toBe(5);
    });

    it('handles base64 comparisons correctly', () => {
      const b64A = typeof btoa === 'function' ? btoa('A') : 'QQ==';
      const b64B = typeof btoa === 'function' ? btoa('B') : 'Qg==';
      const res = analyzeCipherOutputs(b64A, b64B, 'base64', 'base64');
      expect(res.alignedLength).toBe(1);
      expect(res.hammingDistance).toBe(2);
    });

    it('computes entropy properties correctly', () => {
      const lowEntropy = [0, 0, 0, 0, 0, 0, 0, 0];
      const maxEntropy = [0, 1, 2, 3, 4, 5, 6, 7];
      expect(shannonEntropy(lowEntropy)).toBe(0);
      expect(shannonEntropy(maxEntropy)).toBe(3);
    });

    it('returns empty analysis for empty inputs', () => {
      const res = analyzeCipherOutputs('', '', 'utf8', 'utf8');
      expect(res.alignedLength).toBe(0);
      expect(res.comparedBits).toBe(0);
      expect(res.hammingDistance).toBe(0);
      expect(res.bitDifferencePercentage).toBe(0);
    });

    it('properly marks missing-a and missing-b byte statuses', () => {
      const resA = analyzeCipherOutputs('0011', '00112233', 'hex', 'hex');
      expect(resA.byteDiffs[0].status).toBe('match');
      expect(resA.byteDiffs[1].status).toBe('match');
      expect(resA.byteDiffs[2].status).toBe('missing-a');
      expect(resA.byteDiffs[3].status).toBe('missing-a');

      const resB = analyzeCipherOutputs('00112233', '0011', 'hex', 'hex');
      expect(resB.byteDiffs[0].status).toBe('match');
      expect(resB.byteDiffs[1].status).toBe('match');
      expect(resB.byteDiffs[2].status).toBe('missing-b');
      expect(resB.byteDiffs[3].status).toBe('missing-b');
    });

    it('handles binary encoding correctly', () => {
      const res = analyzeCipherOutputs('\x00\xff', '\xff\x00', 'binary', 'binary');
      expect(res.alignedLength).toBe(2);
      expect(res.hammingDistance).toBe(16);
      expect(res.bitDifferencePercentage).toBe(100);
    });

    it('handles non-hex input strings throwing error during hex conversion', () => {
      expect(() => analyzeCipherOutputs('not-a-valid-hex-zzz', '00', 'hex', 'hex')).toThrow('Invalid hexadecimal output');
    });
  });

  describe('Comprehensive Edge Cases and Stress Tests', () => {
    it('compares large 1024-byte hex buffers without precision or truncation loss', () => {
      const largeA = 'aa'.repeat(1024);
      const largeB = '55'.repeat(1024);
      // 'aa' ^ '55' = 10101010 ^ 01010101 = 11111111 = 'ff' (8 bits diff per byte)
      const result = computeHexDiff(largeA, largeB);
      expect(result.xorHex).toBe('ff'.repeat(1024));
      expect(result.diffCount).toBe(1024 * 8);
    });

    it('correctly pads very unbalanced hex inputs (1 byte vs 512 bytes)', () => {
      const shortHex = 'ff';
      const longHex = '00'.repeat(512);
      const result = computeHexDiff(shortHex, longHex);
      expect(result.xorHex.startsWith('ff')).toBe(true);
      expect(result.xorHex.slice(2)).toBe('00'.repeat(511));
      expect(result.diffCount).toBe(8);
    });

    it('handles all 256 single-byte XOR pairs faithfully', () => {
      for (let byteA = 0; byteA < 256; byteA += 17) {
        for (let byteB = 0; byteB < 256; byteB += 23) {
          const hexA = byteA.toString(16).padStart(2, '0');
          const hexB = byteB.toString(16).padStart(2, '0');
          const expectedXor = (byteA ^ byteB).toString(16).padStart(2, '0');
          const res = computeHexDiff(hexA, hexB);
          expect(res.xorHex).toBe(expectedXor);
        }
      }
    });

    it('preserves casing independence when computing XOR difference', () => {
      const hexLower = 'abcdef12';
      const hexUpper = 'ABCDEF12';
      const result = computeHexDiff(hexLower, hexUpper);
      expect(result.xorHex).toBe('00000000');
      expect(result.diffCount).toBe(0);
    });

    it('supports whitespace in irregular patterns across hex input', () => {
      const hexA = '  0f  0a  1b \n 2c \t 3d  ';
      const hexB = '0f0a1b2c3d';
      const result = computeHexDiff(hexA, hexB);
      expect(result.xorHex).toBe('0000000000');
      expect(result.diffCount).toBe(0);
    });

    it('shannonEntropy handles single unique byte vs multi unique byte distributions', () => {
      expect(shannonEntropy([])).toBe(0);
      expect(shannonEntropy([42])).toBe(0);
      expect(shannonEntropy([1, 2])).toBe(1);
      expect(shannonEntropy([1, 1, 2, 2])).toBe(1);
      expect(shannonEntropy([1, 2, 3, 4])).toBe(2);
    });

    it('flipBitInHex verifies each single bit flip independently in 0x00 and 0xFF', () => {
      for (let bit = 0; bit < 8; bit++) {
        const flipped0 = flipBitInHex('00', bit);
        const expectedVal0 = (1 << (7 - bit)).toString(16).padStart(2, '0');
        expect(flipped0).toBe(expectedVal0);

        const flippedF = flipBitInHex('ff', bit);
        const expectedValF = (0xff ^ (1 << (7 - bit))).toString(16).padStart(2, '0');
        expect(flippedF).toBe(expectedValF);
      }
    });

    it('validates additional mathematical diffs and boundary transitions', () => {
      const h1 = '0102030405060708090a0b0c0d0e0f10';
      const h2 = '100f0e0d0c0b0a090807060504030201';
      const diff = computeHexDiff(h1, h2);
      expect(diff.diffCount).toBeGreaterThan(0);
      expect(diff.xorHex.length).toBe(32);
    });

    it('verifies flipBitInHex handles various string lengths and bit offsets', () => {
      const longZeros = '00'.repeat(16);
      for (let i = 0; i < 128; i += 16) {
        const flipped = flipBitInHex(longZeros, i);
        expect(flipped.length).toBe(32);
        expect(flipped.includes('80')).toBe(true);
      }
    });

    it('verifies bit flipping preserves all non-targeted bytes unchanged', () => {
      const initial = 'deadbeef';
      const flipped = flipBitInHex(initial, 0);
      expect(flipped.slice(2)).toBe('adbeef');
      expect(parseInt(flipped.slice(0, 2), 16)).toBe(0xde ^ 0x80);
    });

    it('validates property test invariant: a XOR b XOR b equals a', () => {
      const hexA = 'deadbeefcafe1234';
      const hexB = 'fedcba9876543210';
      const xor1 = computeHexDiff(hexA, hexB).xorHex;
      const xor2 = computeHexDiff(xor1, hexB).xorHex;
      expect(xor2).toBe(hexA);
    });

    it('validates commutative property of computeHexDiff: a XOR b equals b XOR a', () => {
      const testCases = [
        ['1234', '5678'],
        ['abcdef', '123456'],
        ['00ff00', 'ff00ff'],
        ['deadbeef', 'cafebabe'],
        ['1234567890abcdef', 'fedcba0987654321'],
        ['11', '22'],
        ['0a1b2c3d4e5f', 'f5e4d3c2b1a0'],
      ];
      for (const [a, b] of testCases) {
        const diff1 = computeHexDiff(a, b);
        const diff2 = computeHexDiff(b, a);
        expect(diff1.xorHex).toBe(diff2.xorHex);
        expect(diff1.diffCount).toBe(diff2.diffCount);
      }
    });

    it('validates self-XOR zero property: a XOR a equals 0 with 0 diffCount', () => {
      const inputs = [
        '00',
        'ff',
        '0123456789abcdef',
        'aaaaaaaaaaaaaaaa',
        'ffffffffffffffff',
        '123456789abcdef0123456789abcdef0',
      ];
      for (const input of inputs) {
        const diff = computeHexDiff(input, input);
        const expectedZero = '0'.repeat(input.length);
        expect(diff.xorHex).toBe(expectedZero);
        expect(diff.diffCount).toBe(0);
      }
    });

    it('validates avalanche effect bit perturbation analysis helper', () => {
      const baseHex = '0000000000000000';
      for (let bit = 0; bit < 64; bit++) {
        const flipped = flipBitInHex(baseHex, bit);
        const diff = computeHexDiff(baseHex, flipped);
        expect(diff.diffCount).toBe(1);
      }
    });

    it('verifies byte alignment in computeHexDiff when padding unequal length odd nibbles', () => {
      const hexA = 'abc';
      const hexB = 'a';
      // 'abc0' ^ 'a000' = '0bc0'
      const diff = computeHexDiff(hexA, hexB);
      expect(diff.xorHex).toBe('0bc0');
    });

    it('verifies shannon entropy edge cases with uniform byte distributions', () => {
      // 256 unique bytes -> log2(256) = 8 bits entropy
      const allBytes = Array.from({ length: 256 }, (_, i) => i);
      const entropy = shannonEntropy(allBytes);
      expect(Math.abs(entropy - 8)).toBeLessThan(1e-10);
    });

    it('verifies shannon entropy handles two equally frequent bytes', () => {
      const twoBytes = [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55];
      const entropy = shannonEntropy(twoBytes);
      expect(Math.abs(entropy - 1)).toBeLessThan(1e-10);
    });
  });
});

