import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptSkipjackBlock,
  decryptSkipjackBlock,
  traceSkipjack,
  assertSkipjackBlockHex,
  assertSkipjackKeyHex,
  skipjackImplementationNotes,
  TEST_VECTORS,
} from '../../../lib/cipher/symmetric/skipjack';

describe('Skipjack', () => {
  it('matches the published KAT vector', () => {
    const v = TEST_VECTORS[0];
    const res = encrypt(v.input, v.key);
    expect(res.output).toBeDefined();
    expect(res.output.toUpperCase()).toBe(v.expected.toUpperCase());
  });

  it('round-trips encrypt/decrypt', () => {
    const key = '00998877665544332211';
    const pt = '0123456789abcdef';
    const enc = encrypt(pt, key);
    const dec = decrypt(enc.output, key);
    expect(dec.output.toLowerCase()).toBe(pt.toLowerCase());
  });

  it('returns 32 detailed round steps when encrypt options.instrument is true', () => {
    const key = '00998877665544332211';
    const pt = '33221100DDCCBBAA';
    const res = encrypt(pt, key, { instrument: true });
    expect(res.steps).toHaveLength(32);
    expect(res.steps[0].label).toBe('Round 1 (A)');
    expect(res.steps[31].label).toBe('Round 32 (B)');
    expect(res.steps[0].inputState).toBe('33221100DDCCBBAA');
    expect(res.steps[31].outputState.toUpperCase()).toBe('2587CAEA7212D595');
  });

  it('returns 32 detailed round steps when decrypt options.instrument is true', () => {
    const key = '00998877665544332211';
    const ct = '2587CAEA7212D595';
    const res = decrypt(ct, key, { instrument: true });
    expect(res.steps).toHaveLength(32);
    expect(res.steps[0].label).toBe('Round 32 (B-inverse)');
    expect(res.steps[31].label).toBe('Round 1 (A-inverse)');
    expect(res.steps[0].inputState.toUpperCase()).toBe('2587CAEA7212D595');
    expect(res.steps[31].outputState.toUpperCase()).toBe('33221100DDCCBBAA');
  });

  it('returns empty steps when options.instrument is false or omitted', () => {
    const key = '00998877665544332211';
    const pt = '33221100DDCCBBAA';
    const encUninst = encrypt(pt, key);
    expect(encUninst.steps).toHaveLength(0);
    const encExplicitFalse = encrypt(pt, key, { instrument: false });
    expect(encExplicitFalse.steps).toHaveLength(0);

    const decUninst = decrypt('2587CAEA7212D595', key);
    expect(decUninst.steps).toHaveLength(0);
  });

  it('throws on empty input', () => {
    expect(() => encrypt('', '00998877665544332211')).toThrow();
  });

  it('throws INPUT_TOO_LONG above 4096 bytes', () => {
    const huge = '00'.repeat(4104);
    expect(() => encrypt(huge, '00998877665544332211')).toThrowError(/4096 bytes/);
  });

  it('throws INVALID_KEY for wrong key size', () => {
    expect(() => encrypt('33221100ddccbbaa', 'aabbcc')).toThrowError(/80-bit/);
  });

  it('validates block and key assertions', () => {
    expect(() => assertSkipjackBlockHex('')).toThrow(/required/);
    expect(() => assertSkipjackBlockHex('ZZZZZZZZZZZZZZZZ')).toThrow(/hexadecimal/);
    expect(() => assertSkipjackBlockHex('1234')).toThrow(/16 hexadecimal/);

    expect(() => assertSkipjackKeyHex('')).toThrow(/required/);
    expect(() => assertSkipjackKeyHex('ZZZZZZZZZZZZZZZZZZZZ')).toThrow(/hexadecimal/);
    expect(() => assertSkipjackKeyHex('1234')).toThrow(/80-bit/);
  });

  it('verifies traceSkipjack directly', () => {
    const encTrace = traceSkipjack('33221100DDCCBBAA', '00998877665544332211', 'encrypt');
    expect(encTrace.rounds).toHaveLength(32);
    expect(encTrace.outputHex.toUpperCase()).toBe('2587CAEA7212D595');

    const decTrace = traceSkipjack('2587CAEA7212D595', '00998877665544332211', 'decrypt');
    expect(decTrace.rounds).toHaveLength(32);
    expect(decTrace.outputHex.toUpperCase()).toBe('33221100DDCCBBAA');
  });

  it('verifies block encryption and decryption functions', () => {
    const ct = encryptSkipjackBlock('33221100DDCCBBAA', '00998877665544332211');
    expect(ct.toUpperCase()).toBe('2587CAEA7212D595');
    const pt = decryptSkipjackBlock('2587CAEA7212D595', '00998877665544332211');
    expect(pt.toUpperCase()).toBe('33221100DDCCBBAA');

    const notes = skipjackImplementationNotes();
    expect(notes.length).toBeGreaterThan(0);
  });
});

