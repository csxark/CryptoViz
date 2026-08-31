import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  constantTimeEqual,
  constantTimeHexEqual,
  constantTimeStringEqual,
  constantTimeSelect,
  constantTimeValidatePadding,
  constantTimeIntEqual,
  constantTimeInRange,
} from '@/lib/utils/constantTime';

describe('constantTimeEqual Properties', () => {
  it('should equal identical buffers', () => {
    fc.assert(
      fc.property(fc.uint8Array(), (arr) => {
        expect(constantTimeEqual(arr, arr)).toBe(true);
      })
    );
  });

  it('should not equal modified buffers', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1 }), fc.integer(), (arr, modIdx) => {
        const idx = Math.abs(modIdx) % arr.length;
        const modified = new Uint8Array(arr);
        modified[idx] = (modified[idx] + 1) % 256;
        expect(constantTimeEqual(arr, modified)).toBe(false);
      })
    );
  });

  it('should not equal buffers of different lengths', () => {
    fc.assert(
      fc.property(fc.uint8Array(), fc.uint8Array(), (a, b) => {
        fc.pre(a.length !== b.length);
        expect(constantTimeEqual(a, b)).toBe(false);
      })
    );
  });
});

describe('constantTimeHexEqual Properties', () => {
  const hexStringArbitrary = fc.uint8Array().map(arr => Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join(''));
  
  it('should equal identical hex strings', () => {
    fc.assert(
      fc.property(hexStringArbitrary, (hexStr) => {
        // Ensure even length for valid hex
        const validHex = hexStr.length % 2 === 0 ? hexStr : hexStr + '0';
        expect(constantTimeHexEqual(validHex, validHex)).toBe(true);
      })
    );
  });
});

describe('constantTimeStringEqual Properties', () => {
  it('should equal identical unicode strings', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        expect(constantTimeStringEqual(str, str)).toBe(true);
      })
    );
  });

  it('should handle special character strings', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        expect(constantTimeStringEqual(str, str)).toBe(true);
      })
    );
  });

  it('should not equal modified strings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.integer(), fc.string({ minLength: 1, maxLength: 1 }), (str, modIdx, newChar) => {
        const idx = Math.abs(modIdx) % str.length;
        // Avoid making it the same string
        fc.pre(str[idx] !== newChar);
        const modified = str.slice(0, idx) + newChar + str.slice(idx + 1);
        expect(constantTimeStringEqual(str, modified)).toBe(false);
      })
    );
  });

  it('should not equal different length strings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a.length !== b.length);
        expect(constantTimeStringEqual(a, b)).toBe(false);
      })
    );
  });
  
  it('should correctly handle out-of-bounds comparisons resulting in false', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        const longerStr = str + "PADDING";
        expect(constantTimeStringEqual(str, longerStr)).toBe(false);
        expect(constantTimeStringEqual(longerStr, str)).toBe(false);
      })
    );
  });
});

describe('constantTimeSelect Properties', () => {
  it('should always return A when condition is true', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(constantTimeSelect(true, a, b)).toBe(a);
      })
    );
  });

  it('should always return B when condition is false', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(constantTimeSelect(false, a, b)).toBe(b);
      })
    );
  });
});

describe('constantTimeValidatePadding Properties', () => {
  it('should validate valid PKCS7 padding', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 255 }), (padLen) => {
        const block = new Uint8Array(padLen).fill(padLen);
        expect(constantTimeValidatePadding(block)).toBe(true);
      })
    );
  });

  it('should invalidate incorrect padding', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 255 }), (padLen) => {
        const block = new Uint8Array(padLen).fill(padLen);
        block[0] = padLen - 1; // Corrupt first byte of padding
        expect(constantTimeValidatePadding(block)).toBe(false);
      })
    );
  });
  
  it('should invalidate 0 padding', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 255 }), (blockLen) => {
        const block = new Uint8Array(blockLen).fill(0);
        expect(constantTimeValidatePadding(block)).toBe(false);
      })
    );
  });
});

describe('constantTimeIntEqual Properties', () => {
  it('should be true for identical integers', () => {
    fc.assert(
      fc.property(fc.integer(), (a) => {
        expect(constantTimeIntEqual(a, a)).toBe(true);
      })
    );
  });

  it('should be false for different integers', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        fc.pre(a !== b);
        expect(constantTimeIntEqual(a, b)).toBe(false);
      })
    );
  });
});

describe('constantTimeInRange Properties', () => {
  it('should be true if value in [min, max]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000000, max: 100000000 }),
        fc.integer({ min: -100000000, max: 100000000 }),
        fc.integer({ min: -100000000, max: 100000000 }),
        (a, b, c) => {
        const min = Math.min(a, b, c);
        const max = Math.max(a, b, c);
        const mid = [a, b, c].sort((x, y) => x - y)[1];
        
        expect(constantTimeInRange(mid, min, max)).toBe(true);
      })
    );
  });

  it('should be false if value < min', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000000, max: 10000000 }), fc.integer({ min: 1, max: 1000000 }), (val, diff) => {
        const min = val + diff;
        const max = min + diff;
        expect(constantTimeInRange(val, min, max)).toBe(false);
      })
    );
  });

  it('should be false if value > max', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000000, max: 10000000 }), fc.integer({ min: 1, max: 1000000 }), (val, diff) => {
        const max = val - diff;
        const min = max - diff;
        expect(constantTimeInRange(val, min, max)).toBe(false);
      })
    );
  });
});
