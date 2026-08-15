import { parsePolynomial, polyMultiply, polyReduceModRing, polyReduceModQ, ringPolyMultiply, ringPolyAdd } from '../../../../lib/math/ringLwe';

describe('Ring LWE Math Utilities', () => {
  it('should parse polynomials', () => {
    expect(parsePolynomial("1, -2, 0, 4")).toEqual([1, -2, 0, 4]);
  });

  it('should multiply standard polynomials', () => {
    // (1 + 2x) * (3 + 4x) = 3 + 10x + 8x^2
    expect(polyMultiply([1, 2], [3, 4])).toEqual([3, 10, 8]);
  });

  it('should reduce modulo X^n + 1', () => {
    // p = 3 + 10x + 8x^2, mod x^2 + 1 (n=2)
    // 8x^2 = -8
    // Result: (3 - 8) + 10x = -5 + 10x
    expect(polyReduceModRing([3, 10, 8], 2)).toEqual([-5, 10]);
  });

  it('should reduce modulo q', () => {
    // [-5, 10] mod 7
    // -5 mod 7 = 2
    // 10 mod 7 = 3
    expect(polyReduceModQ([-5, 10], 7)).toEqual([2, 3]);
  });
  
  it('should reduce modulo q centered', () => {
    // [-5, 10] mod 7 centered in (-3, 3]
    // 2 is <= 3, remains 2
    // 3 is <= 3, remains 3
    expect(polyReduceModQ([-5, 10], 7, true)).toEqual([2, 3]);
    
    // [4, 6] mod 7 centered
    // 4 mod 7 = 4, centered -> 4 - 7 = -3
    // 6 mod 7 = 6, centered -> 6 - 7 = -1
    expect(polyReduceModQ([4, 6], 7, true)).toEqual([-3, -1]);
  });

  it('should perform full ring-LWE multiplication', () => {
    const res = ringPolyMultiply([1, 2], [3, 4], 2, 7);
    expect(res.rawMult).toEqual([3, 10, 8]);
    expect(res.ringReduced).toEqual([-5, 10]);
    expect(res.fullyReduced).toEqual([2, 3]);
  });

  it('should perform ring addition', () => {
    // [1, 2] + [3, 4] = [4, 6] mod 5 = [4, 1]
    expect(ringPolyAdd([1, 2], [3, 4], 5)).toEqual([4, 1]);
  });
});
