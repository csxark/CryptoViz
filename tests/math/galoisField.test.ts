import { 
  gfAdd, 
  gfMultiply, 
  gfInverse, 
  deriveSBoxWithTrace, 
  gfExtendedEuclideanWithTrace,
  gfMultiplyWithTrace,
  toPolynomialString
} from '../../lib/math/galoisField';

describe('GF(2^8) Galois Field Math', () => {
  it('should add (XOR) correctly', () => {
    expect(gfAdd(0x57, 0x83)).toBe(0x57 ^ 0x83);
  });

  it('should multiply 0x57 and 0x13 to get 0xFE (AES)', () => {
    expect(gfMultiply(0x57, 0x13)).toBe(0xFE);
    const trace = gfMultiplyWithTrace(0x57, 0x13);
    expect(trace.resultHex).toBe('FE');
  });

  it('should compute inverse correctly for non-zero values', () => {
    const inv53 = gfInverse(0x53);
    expect(gfMultiply(0x53, inv53)).toBe(0x01);
    
    // Check some representative non-zero values
    for (let i = 1; i < 256; i += 13) {
      const inv = gfInverse(i);
      expect(gfMultiply(i, inv)).toBe(0x01);
    }
  });

  it('should treat inverse of 0 as 0', () => {
    expect(gfInverse(0x00)).toBe(0x00);
    const eeaTrace = gfExtendedEuclideanWithTrace(0x00);
    expect(eeaTrace.inverseHex).toBe('00');
  });

  it('should compute AES S-Box values correctly', () => {
    const s00 = deriveSBoxWithTrace(0x00);
    expect(s00.resultHex).toBe('63');

    const s53 = deriveSBoxWithTrace(0x53);
    expect(s53.resultHex).toBe('ED');
  });

  it('should handle different moduli', () => {
    // 0x11B = AES, 0x11D = Anubis, 0x12D = Twofish
    const resAES = gfMultiply(0x57, 0x83, 0x11b);
    const resAnubis = gfMultiply(0x57, 0x83, 0x11d);
    expect(resAES).not.toBe(resAnubis);

    const invAnubis = gfInverse(0x53, 0x11d);
    expect(gfMultiply(0x53, invAnubis, 0x11d)).toBe(0x01);
    
    const invTwofish = gfInverse(0x53, 0x12d);
    expect(gfMultiply(0x53, invTwofish, 0x12d)).toBe(0x01);
  });

  it('should match gfInverse for all non-zero elements in GF(2^8) via gfExtendedEuclideanWithTrace (#1715)', () => {
    const moduli = [0x11b, 0x11d, 0x12d] as const;
    for (const modulus of moduli) {
      for (let a = 1; a < 256; a++) {
        const inv = gfInverse(a, modulus);
        const expectedHex = inv.toString(16).padStart(2, '0').toUpperCase();
        const trace = gfExtendedEuclideanWithTrace(a, modulus);
        expect(trace.inverseHex).toBe(expectedHex);
      }
    }
  });

  it('should produce valid polynomial strings', () => {
    expect(toPolynomialString(0x57)).toBe('x^6 + x^4 + x^2 + x + 1');
  });
});
