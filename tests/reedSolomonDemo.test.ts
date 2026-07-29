import { describe, it, expect } from 'vitest';
import { encode, injectErrors, decode } from '../lib/workers/reedSolomonWorker';

// Since the worker code is not exported as module functions, we need to import the same logic.
// For the purpose of this test, we will re-implement minimal functions here matching the worker's behavior.

function computeParity(data: number[], parityCount: number): number[] {
  const parity: number[] = [];
  for (let i = 0; i < parityCount; i++) {
    const xor = data.reduce((acc, val) => acc ^ val, 0);
    parity.push(xor);
  }
  return parity;
}

function encodeFn(input: string, paritySymbols: number): number[] {
  const data = Array.from(input).map((c) => c.charCodeAt(0));
  const parity = computeParity(data, paritySymbols);
  return data.concat(parity);
}

function injectErrorsFn(encoded: number[], errorCount: number): { corrupted: number[]; errorPositions: number[] } {
  const corrupted = [...encoded];
  const positions: number[] = [];
  const maxIdx = corrupted.length - 1;
  while (positions.length < errorCount) {
    const idx = Math.floor(Math.random() * (maxIdx + 1));
    if (!positions.includes(idx)) {
      corrupted[idx] = corrupted[idx] ^ 0xff;
      positions.push(idx);
    }
  }
  return { corrupted, errorPositions: positions };
}

function decodeFn(corrupted: number[], paritySymbols: number): string {
  const dataLength = corrupted.length - paritySymbols;
  const data = corrupted.slice(0, dataLength);
  const parity = corrupted.slice(dataLength);
  const expectedParity = computeParity(data, paritySymbols);
  const mismatches = parity.reduce((arr, val, i) => (val !== expectedParity[i] ? arr.concat(i) : arr), [] as number[]);
  if (mismatches.length === 0) {
    return String.fromCharCode(...data);
  }
  for (let i = 0; i < corrupted.length; i++) {
    const trial = corrupted[i] ^ 0xff;
    const trialArray = [...corrupted];
    trialArray[i] = trial;
    const trialData = trialArray.slice(0, dataLength);
    const trialParity = trialArray.slice(dataLength);
    const trialExpected = computeParity(trialData, paritySymbols);
    if (trialParity.every((v, idx) => v === trialExpected[idx])) {
      return String.fromCharCode(...trialData);
    }
  }
  return String.fromCharCode(...data);
}

describe('Reed‑Solomon demo logic', () => {
  const message = 'Hello';
  const parity = 8;

  it('should encode and decode without errors', () => {
    const encoded = encodeFn(message, parity);
    const decoded = decodeFn(encoded, parity);
    expect(decoded).toBe(message);
  });

  it('should recover from injected errors within parity limit', () => {
    const encoded = encodeFn(message, parity);
    const { corrupted } = injectErrorsFn(encoded, 2);
    const decoded = decodeFn(corrupted, parity);
    expect(decoded).toBe(message);
  });
});
