import { gcd, modExp, findPeriod, simulateShor } from '../../../../lib/quantum/shorSimulator';

describe('Shor Simulator Math Utilities', () => {
  it('computes gcd correctly', () => {
    expect(gcd(15, 5)).toBe(5);
    expect(gcd(21, 14)).toBe(7);
    expect(gcd(13, 17)).toBe(1);
    expect(gcd(-4, 6)).toBe(2);
  });

  it('computes modular exponentiation', () => {
    // 2^3 mod 5 = 8 mod 5 = 3
    expect(modExp(2, 3, 5)).toBe(3);
    // 7^2 mod 15 = 49 mod 15 = 4
    expect(modExp(7, 2, 15)).toBe(4);
  });

  it('finds the correct period for small integers', () => {
    // N=15, a=7 -> 7^1=7, 7^2=4, 7^3=13, 7^4=1 (r=4)
    expect(findPeriod(7, 15)).toBe(4);
    // N=21, a=2 -> 2^1=2, 2^2=4, 2^3=8, 2^4=16, 2^5=11, 2^6=1 (r=6)
    expect(findPeriod(2, 21)).toBe(6);
  });

  it('fails period finding if base shares factor with N', () => {
    expect(findPeriod(5, 15)).toBe(0); // gcd(5,15)=5 != 1
  });

  it('simulates Shor algorithm to factor 15', () => {
    const res = simulateShor(15, 7);
    expect(res.success).toBe(true);
    expect(res.r).toBe(4);
    expect(res.factors?.sort()).toEqual([3, 5]);
  });

  it('simulates Shor algorithm to factor 21', () => {
    const res = simulateShor(21, 2);
    expect(res.success).toBe(true);
    expect(res.r).toBe(6);
    expect(res.factors?.sort()).toEqual([3, 7]);
  });

  it('simulates Shor algorithm to factor 35', () => {
    // a=8 -> 8^1=8, 8^2=29, 8^3=22, 8^4=1 (r=4)
    // 8^(4/2) = 8^2 = 64 mod 35 = 29
    // gcd(29-1, 35) = gcd(28, 35) = 7
    // gcd(29+1, 35) = gcd(30, 35) = 5
    const res = simulateShor(35, 8);
    expect(res.success).toBe(true);
    expect(res.r).toBe(4);
    expect(res.factors?.sort()).toEqual([5, 7]);
  });

  it('detects lucky guess if base shares factor', () => {
    const res = simulateShor(15, 5);
    expect(res.success).toBe(true);
    expect(res.factors?.sort()).toEqual([3, 5]);
    expect(res.message).toMatch(/Lucky guess/);
  });
});
