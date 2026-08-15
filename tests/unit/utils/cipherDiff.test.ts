import { flipBitInHex, flipBitInString, computeHexDiff } from '../../../lib/utils/cipherDiff';

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

    it('should flip a bit in a multi-byte hex string', () => {
      const input = '000000';
      // 8th bit is the MSB of the second byte
      const output = flipBitInHex(input, 8);
      expect(output).toBe('008000');
    });

    it('should throw an error for odd length hex string', () => {
      expect(() => flipBitInHex('123', 0)).toThrow('Hex string must have an even length.');
    });

    it('should throw an error for out of bounds index', () => {
      expect(() => flipBitInHex('00', 8)).toThrow('Bit index out of bounds.');
    });
  });

  describe('flipBitInString', () => {
    it('should flip a bit in an ASCII string', () => {
      const input = 'a'; // ASCII 0x61
      // 0x61 = 0110 0001
      // Flip bit 0 (MSB): 1110 0001 = 0xE1
      // 0xE1 is an invalid ASCII character, but decodes to something or a replacement char.
      // Let's flip bit 7 (LSB): 0110 0000 = 0x60 = '`'
      const output = flipBitInString(input, 7);
      expect(output).toBe('`');
    });

    it('should throw an error for out of bounds index', () => {
      expect(() => flipBitInString('hello', 40)).toThrow('Bit index out of bounds.');
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
  });
});
