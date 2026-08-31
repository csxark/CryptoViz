import { describe, expect, it } from 'vitest';
import {
  asBytes,
  base64ToHex,
  binaryToHex,
  equalBytes,
  hexToBase64,
  hexToBinary,
  parseBase64,
  parseBase64Url,
  parseBinary,
  parseHex,
  toBase64,
  toBase64Url,
  toBinary,
  toHex,
} from '../../lib/utils/encoding';

describe('shared encoding helpers', () => {
  describe('parseHex', () => {
    it.each([
      ['', []],
      ['00', [0]],
      ['01', [1]],
      ['7f', [127]],
      ['80', [128]],
      ['ff', [255]],
      ['00010203', [0, 1, 2, 3]],
      ['deadbeef', [222, 173, 190, 239]],
      ['DEADBEEF', [222, 173, 190, 239]],
      ['DeAdBeEf', [222, 173, 190, 239]],
      ['0123456789abcdef', [1, 35, 69, 103, 137, 171, 205, 239]],
      ['ffeeddccbbaa99887766554433221100', [255, 238, 221, 204, 187, 170, 153, 136, 119, 102, 85, 68, 51, 34, 17, 0]],
      ['cafebabefeedface', [202, 254, 186, 190, 254, 237, 250, 206]],
      ['11223344556677889900aabbccddeeff', [17,34,51,68,85,102,119,136,153,0,170,187,204,221,238,255]],
    ])('parses %s', (input, expected) => {
      expect(Array.from(parseHex(input))).toEqual(expected);
    });

    it.each([
      '0',
      'f',
      'abc',
      '0x1',
      'gg',
      'zz',
      '12xz',
      '12 34',
      '12-34',
      '0b1010',
      'hello',
    ])('rejects invalid hex: %s', (input) => {
      expect(() => parseHex(input, { allowWhitespace: false })).toThrow();
    });

    it('supports whitespace by default', () => {
      expect(Array.from(parseHex('de ad be ef'))).toEqual([222, 173, 190, 239]);
      expect(Array.from(parseHex('DE\\nAD\\tBE\\rEF'))).toEqual([222, 173, 190, 239]);
    });

    it('can reject whitespace explicitly', () => {
      expect(() => parseHex('de ad', { allowWhitespace: false })).toThrow(/whitespace/i);
    });

    it('supports an optional 0x prefix when requested', () => {
      expect(Array.from(parseHex('0xdeadbeef', { allowPrefix: true }))).toEqual([222, 173, 190, 239]);
      expect(() => parseHex('0xdeadbeef')).toThrow();
    });

    it('checks expected byte length', () => {
      expect(parseHex('00112233', { expectedBytes: 4 })).toHaveLength(4);
      expect(() => parseHex('00112233', { expectedBytes: 3 })).toThrow(/exactly 3 bytes/i);
    });

    it('preserves zero bytes', () => {
      expect(toHex(parseHex('000000'))).toBe('000000');
    });

    it('reports a useful label', () => {
      expect(() => parseHex('xyz', { label: 'AES key' })).toThrow(/AES key/);
    });
  });

  describe('toHex', () => {
    it.each([
      [[], ''],
      [[0], '00'],
      [[1], '01'],
      [[15], '0f'],
      [[16], '10'],
      [[127], '7f'],
      [[128], '80'],
      [[255], 'ff'],
      [[0, 1, 2, 3, 4, 5], '000102030405'],
      [[222, 173, 190, 239], 'deadbeef'],
      [[255, 238, 221, 204, 187, 170, 153, 136], 'ffeeddccbbaa9988'],
      [[202, 254, 186, 190, 186, 190], 'cafebabebabe'],
    ])('formats %j as %s', (input, expected) => {
      expect(toHex(input)).toBe(expected);
    });

    it('accepts Uint8Array', () => {
      expect(toHex(new Uint8Array([0, 16, 255]))).toBe('0010ff');
    });

    it('returns lowercase output', () => {
      expect(toHex([171, 205, 239])).toBe('abcdef');
    });

    it('does not mutate the input array', () => {
      const input = [1, 2, 3];
      toHex(input);
      expect(input).toEqual([1, 2, 3]);
    });

    it('rejects values outside the byte range', () => {
      expect(() => toHex([256])).toThrow();
      expect(() => toHex([-1])).toThrow();
      expect(() => toHex([1.5])).toThrow();
      expect(() => toHex([NaN])).toThrow();
    });
  });

  describe('hex round trips', () => {
    it.each([
      '',
      '00',
      '01',
      'ff',
      '00010203040506070809',
      'deadbeef',
      'cafebabefeedface',
      '00112233445566778899aabbccddeeff',
      'ffeeddccbbaa99887766554433221100',
      '0123456789abcdef0123456789abcdef',
      '00000000000000000000000000000000',
      'ffffffffffffffffffffffffffffffff',
      'abcdefabcdefabcdefabcdefabcdefab',
      '13579bdf2468ace00123456789abcdef',
    ])('round trips %s', (value) => {
      expect(toHex(parseHex(value))).toBe(value);
    });

    it('canonicalizes uppercase input', () => {
      expect(toHex(parseHex('DEADBEEF'))).toBe('deadbeef');
    });

    it('canonicalizes mixed case input', () => {
      expect(toHex(parseHex('DeAdBeEf'))).toBe('deadbeef');
    });

    it('canonicalizes spaced input', () => {
      expect(toHex(parseHex('de ad be ef'))).toBe('deadbeef');
    });
  });

  describe('parseBinary', () => {
    it.each([
      ['', []],
      ['00000000', [0]],
      ['00000001', [1]],
      ['00001111', [15]],
      ['11111111', [255]],
      ['10101010', [170]],
      ['01010101', [85]],
      ['0000000011111111', [0, 255]],
      ['1101111010101101', [222, 173]],
      ['11001010111111101011101010111110', [202, 254, 186, 190]],
      ['1111111111101110110111011100110010111011101010101001100110001000', [255,238,221,204,187,170,153,136]],
    ])('parses %s', (input, expected) => {
      expect(Array.from(parseBinary(input))).toEqual(expected);
    });

    it.each([
      '1',
      '01',
      '0000000',
      '000000001',
      '0000000x',
      '10203040',
      'abcdef01',
      'hello',
    ])('rejects invalid binary: %s', (input) => {
      expect(() => parseBinary(input)).toThrow();
    });

    it('accepts whitespace by default', () => {
      expect(Array.from(parseBinary('00000000 11111111'))).toEqual([0, 255]);
      expect(Array.from(parseBinary('00000000\\n11111111'))).toEqual([0, 255]);
    });

    it('checks expected bit length', () => {
      expect(parseBinary('0000000011111111', { expectedBits: 16 })).toHaveLength(2);
      expect(() => parseBinary('00000000', { expectedBits: 16 })).toThrow(/exactly 16 bits/i);
    });

    it('supports an explicit label', () => {
      expect(() => parseBinary('2', { label: 'plaintext' })).toThrow(/plaintext/);
    });
  });

  describe('toBinary', () => {
    it.each([
      [[], ''],
      [[0], '00000000'],
      [[1], '00000001'],
      [[15], '00001111'],
      [[16], '00010000'],
      [[127], '01111111'],
      [[128], '10000000'],
      [[255], '11111111'],
      [[222, 173, 190, 239], '11011110101011011011111011101111'],
      [[202, 254, 186, 190], '11001010111111101011101010111110'],
    ])('formats %j', (input, expected) => {
      expect(toBinary(input)).toBe(expected);
    });

    it('always emits eight bits per byte', () => {
      const result = toBinary([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^(?:[01]{8})+$/);
    });

    it('does not emit separators', () => {
      expect(toBinary([255, 0])).toBe('1111111100000000');
    });
  });

  describe('binary/hex conversion', () => {
    it.each([
      ['00000000', '00'],
      ['00000001', '01'],
      ['11111111', 'ff'],
      ['1101111010101101', 'dead'],
      ['11001010111111101011101010111110', 'cafebabe'],
      ['00010010001101000101011001111000', '12345678'],
      ['11111110110111001011101010111110', 'fedcba be'.replace(/ /g, '')],
    ])('converts binary %s', (binary, hex) => {
      expect(binaryToHex(binary)).toBe(hex);
    });

    it.each([
      ['00', '00000000'],
      ['01', '00000001'],
      ['ff', '11111111'],
      ['dead', '1101111010101101'],
      ['cafebabe', '11001010111111101011101010111110'],
      ['12345678', '00010010001101000101011001111000'],
      ['ffffffff', '11111111111111111111111111111111'],
    ])('converts hex %s', (hex, binary) => {
      expect(hexToBinary(hex)).toBe(binary);
    });

    it('preserves leading zero bits', () => {
      expect(hexToBinary('00ff')).toBe('0000000011111111');
    });

    it('preserves leading zero bytes', () => {
      expect(binaryToHex('0000000011111111')).toBe('00ff');
    });
  });

  describe('base64', () => {
    it.each([
      ['', ''],
      ['00', 'AA=='],
      ['01', 'AQ=='],
      ['ff', '/w=='],
      ['deadbeef', '3q2+7w=='],
      ['cafebabe', 'yv66vg=='],
      ['001122', 'ABEi'],
      ['00112233', 'ABEiMw=='],
      ['ffffffff', '/////w=='],
      ['000102030405', 'AAECAwQF'],
      ['1122334455667788', 'ESIzRFVmd4g='],
      ['0123456789abcdef', 'ASNFZ4mrze8='],
      ['0000000000000000', 'AAAAAAAAAAA='],
      ['1234567890abcdef', 'EjRWeJCrze8='],
    ])('hexToBase64 %s', (hex, expected) => {
      expect(hexToBase64(hex)).toBe(expected);
    });

    it.each([
      ['', ''],
      ['AA==', ''],
      ['AQ==', '01'],
      ['/w==', 'ff'],
      ['3q2+7w==', 'deadbeef'],
      ['yv66vg==', 'cafebabe'],
      ['ABEi', '001122'],
      ['ABEiMw==', '00112233'],
      ['/////w==', 'ffffffff'],
      ['AAECAwQF', '000102030405'],
      ['ESIzRFVmd4g=', '1122334455667788'],
      ['ASNFZ4mrze8=', '0123456789abcdef'],
    ])('base64ToHex %s', (base64, expected) => {
      expect(base64ToHex(base64)).toBe(expected);
    });

    it('round trips arbitrary byte values', () => {
      const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);
      expect(parseBase64(toBase64(bytes))).toEqual(bytes);
    });

    it('supports URL-safe encoding', () => {
      expect(toBase64Url([0xfb, 0xff])).toBe('-_8');
      expect(Array.from(parseBase64Url('-_8'))).toEqual([251, 255]);
    });

    it('accepts padded URL-safe input', () => {
      expect(Array.from(parseBase64Url('-_8='))).toEqual([251, 255]);
    });

    it('accepts URL-safe whitespace', () => {
      expect(Array.from(parseBase64Url(' -_8 '))).toEqual([251, 255]);
    });

    it('checks expected decoded size', () => {
      expect(parseBase64('AAECAw==', { expectedBytes: 4 })).toHaveLength(4);
      expect(() => parseBase64('AAECAw==', { expectedBytes: 3 })).toThrow(/exactly 3 bytes/i);
    });

    it.each([
      '!',
      '@@@@',
      'abc?',
      'a b',
      'not base64',
      '###=',
      '====',
      'A',
      'AA',
      'AAA',
    ])('rejects invalid base64: %s', (input) => {
      expect(() => parseBase64(input, { allowWhitespace: false })).toThrow();
    });

    it('normalizes whitespace when enabled', () => {
      expect(base64ToHex('3q2+ 7w==')).toBe('deadbeef');
    });
  });

  describe('asBytes', () => {
    it('clones Uint8Array input', () => {
      const source = new Uint8Array([1, 2, 3]);
      const copy = asBytes(source);
      expect(copy).toEqual(source);
      expect(copy).not.toBe(source);
    });

    it('copies array input', () => {
      const source = [1, 2, 3];
      const copy = asBytes(source);
      expect(Array.from(copy)).toEqual(source);
      expect(copy).not.toBe(source);
    });

    it.each([
      [0],
      [1],
      [127],
      [128],
      [254],
      [255],
    ])('accepts byte %s', (value) => {
      expect(Array.from(asBytes([value]))).toEqual([value]);
    });

    it.each([
      [-1],
      [256],
      [1.2],
      [NaN],
      [Infinity],
      [-Infinity],
    ])('rejects invalid byte %s', (value) => {
      expect(() => asBytes([value])).toThrow();
    });
  });

  describe('equalBytes', () => {
    it('recognizes equal empty arrays', () => {
      expect(equalBytes([], [])).toBe(true);
    });

    it('recognizes equal values', () => {
      expect(equalBytes([0, 1, 2], [0, 1, 2])).toBe(true);
    });

    it('recognizes equal Uint8Arrays', () => {
      expect(equalBytes(new Uint8Array([10, 20]), new Uint8Array([10, 20]))).toBe(true);
    });

    it('rejects different lengths', () => {
      expect(equalBytes([0, 1], [0, 1, 2])).toBe(false);
    });

    it('rejects different values', () => {
      expect(equalBytes([0, 1, 2], [0, 9, 2])).toBe(false);
    });

    it('handles differences at the first byte', () => {
      expect(equalBytes([9, 1, 2], [0, 1, 2])).toBe(false);
    });

    it('handles differences at the final byte', () => {
      expect(equalBytes([0, 1, 9], [0, 1, 2])).toBe(false);
    });

    it('does not mutate either input', () => {
      const left = [1, 2, 3];
      const right = [1, 2, 3];
      equalBytes(left, right);
      expect(left).toEqual([1, 2, 3]);
      expect(right).toEqual([1, 2, 3]);
    });
  });

  describe('cross-representation invariants', () => {
    const samples = [
      '',
      '00',
      '01',
      '02',
      '0f',
      '10',
      '7f',
      '80',
      'ff',
      '00112233445566778899aabbccddeeff',
      'deadbeefcafebabe',
      '0123456789abcdef',
      'ffeeddccbbaa99887766554433221100',
      '000102030405060708090a0b0c0d0e0f',
      'abcdef0123456789abcdef0123456789',
      '13579bdf2468ace00123456789abcdef',
    ];

    it.each(samples)('hex -> bytes -> hex: %s', (hex) => {
      expect(toHex(parseHex(hex))).toBe(hex);
    });

    it.each(samples)('hex -> binary -> hex: %s', (hex) => {
      expect(binaryToHex(hexToBinary(hex))).toBe(hex);
    });

    it.each(samples)('hex -> base64 -> hex: %s', (hex) => {
      expect(base64ToHex(hexToBase64(hex))).toBe(hex);
    });

    it.each(samples)('binary -> bytes -> binary: %s', (hex) => {
      const binary = hexToBinary(hex);
      expect(toBinary(parseBinary(binary))).toBe(binary);
    });

    it.each(samples)('base64 -> bytes -> base64: %s', (hex) => {
      const base64 = hexToBase64(hex);
      expect(toBase64(parseBase64(base64))).toBe(base64);
    });

    it.each(samples)('base64url -> bytes -> base64url: %s', (hex) => {
      const url = toBase64Url(parseHex(hex));
      expect(toBase64Url(parseBase64Url(url))).toBe(url);
    });
  });

  describe('length and label validation', () => {
    it('supports a 16-byte AES key length check', () => {
      expect(parseHex('00000000000000000000000000000000', { expectedBytes: 16 })).toHaveLength(16);
    });

    it('rejects a short AES key', () => {
      expect(() => parseHex('0000000000000000', { expectedBytes: 16, label: 'AES key' })).toThrow(/AES key/);
    });

    it('supports an 8-byte DES key length check', () => {
      expect(parseHex('0000000000000000', { expectedBytes: 8 })).toHaveLength(8);
    });

    it('supports a 32-byte key length check', () => {
      expect(parseHex('00'.repeat(32), { expectedBytes: 32 })).toHaveLength(32);
    });

    it('supports a 64-byte message length check', () => {
      expect(parseHex('00'.repeat(64), { expectedBytes: 64 })).toHaveLength(64);
    });

    it('supports exact binary lengths', () => {
      expect(parseBinary('0'.repeat(128), { expectedBits: 128 })).toHaveLength(16);
    });

    it('supports exact base64 decoded lengths', () => {
      const value = toBase64(new Uint8Array(32));
      expect(parseBase64(value, { expectedBytes: 32 })).toHaveLength(32);
    });

    it('includes the supplied label for malformed hex', () => {
      expect(() => parseHex('xx', { label: 'ciphertext' })).toThrow(/ciphertext/);
    });

    it('includes the supplied label for malformed binary', () => {
      expect(() => parseBinary('x', { label: 'bitstream' })).toThrow(/bitstream/);
    });

    it('includes the supplied label for malformed base64', () => {
      expect(() => parseBase64('?', { label: 'payload' })).toThrow(/payload/);
    });
  });

  describe('edge cases', () => {
    it('handles the smallest non-empty byte sequence', () => {
      expect(toHex(parseHex('00'))).toBe('00');
    });

    it('handles the largest byte value', () => {
      expect(toHex(parseHex('ff'))).toBe('ff');
    });

    it('handles a large deterministic buffer', () => {
      const bytes = Uint8Array.from({ length: 1024 }, (_, index) => index & 0xff);
      expect(parseHex(toHex(bytes))).toEqual(bytes);
    });

    it('handles a large all-zero buffer', () => {
      const bytes = new Uint8Array(4096);
      expect(parseHex(toHex(bytes))).toEqual(bytes);
    });

    it('handles a large all-one buffer', () => {
      const bytes = new Uint8Array(4096);
      bytes.fill(0xff);
      expect(parseHex(toHex(bytes))).toEqual(bytes);
    });

    it('handles alternating bits', () => {
      const bytes = new Uint8Array(1024);
      bytes.fill(0xaa);
      expect(parseBinary(toBinary(bytes))).toEqual(bytes);
    });

    it('handles a non-ASCII byte sequence without text conversion', () => {
      const bytes = Uint8Array.from([0, 127, 128, 129, 200, 254, 255]);
      expect(parseBase64(toBase64(bytes))).toEqual(bytes);
    });
  });

  describe('table-driven known encodings', () => {
    const vectors = [
      { hex: '000000', binary: '000000000000000000000000', base64: 'AAAA' },
      { hex: '010203', binary: '000000010000001000000011', base64: 'AQID' },
      { hex: '102030', binary: '000100000010000000110000', base64: 'ECAw' },
      { hex: '405060', binary: '010000000101000001100000', base64: 'QFBg' },
      { hex: '708090', binary: '011100001000000010010000', base64: 'cICA' },
      { hex: 'a0b0c0', binary: '101000001011000010110000', base64: 'oLDA' },
      { hex: 'd0e0f0', binary: '110100001110000011110000', base64: '0ODw' },
      { hex: '1122334455', binary: '0001000100100010001100110100010001010101', base64: 'ESIzRFU=' },
      { hex: 'abcdef', binary: '101010111100110111101111', base64: 'q83v' },
      { hex: 'fedcba', binary: '111111101101110010111010', base64: '/ty6' },
      { hex: '0123456789', binary: '0000000100100011010001010110011110001001', base64: 'ASNFZ4k=' },
      { hex: '0011223344556677', binary: '0000000000010001001000100011001101000100010101010110011001110111', base64: 'ABEiM0RVZnc=' },
    ];

    it.each(vectors)('keeps all representations synchronized for $hex', (vector) => {
      expect(hexToBinary(vector.hex)).toBe(vector.binary);
      expect(binaryToHex(vector.binary)).toBe(vector.hex);
      expect(hexToBase64(vector.hex)).toBe(vector.base64);
      expect(base64ToHex(vector.base64)).toBe(vector.hex);
    });
  });
});
