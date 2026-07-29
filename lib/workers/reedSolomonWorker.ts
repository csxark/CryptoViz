// Reed-Solomon (simplified) Web Worker
// This implementation provides a lightweight demonstration of Reed–Solomon encoding/decoding.
// It operates over GF(2^8) using a simple parity (XOR) scheme for educational purposes.
// In a real-world scenario you would replace this with a full RS library.

interface EncodePayload {
  input: string;
  paritySymbols: number; // number of parity symbols to append
}

interface InjectErrorsPayload {
  encoded: number[];
  errorCount: number; // how many symbols to corrupt
}

interface DecodePayload {
  corrupted: number[];
}

interface WorkerRequest {
  command: 'encode' | 'injectErrors' | 'decode';
  requestId: string;
  payload: any;
}

interface WorkerResponse {
  requestId: string;
  success: boolean;
  payload: any;
}

// Helper: simple XOR parity across data symbols
export function computeParity(data: number[], parityCount: number): number[] {
  const parity: number[] = [];
  for (let i = 0; i < parityCount; i++) {
    // For demonstration we just repeat the XOR value; a real RS would generate distinct symbols.
    const xor = data.reduce((acc, val) => acc ^ val, 0);
    parity.push(xor);
  }
  return parity;
}

export function encode(input: string, paritySymbols: number): number[] {
  const data = Array.from(input).map((c) => c.charCodeAt(0));
  const parity = computeParity(data, paritySymbols);
  return data.concat(parity);
}

export function injectErrors(encoded: number[], errorCount: number): { corrupted: number[]; errorPositions: number[] } {
  const corrupted = [...encoded];
  const positions: number[] = [];
  const maxIdx = corrupted.length - 1;
  while (positions.length < errorCount) {
    const idx = Math.floor(Math.random() * (maxIdx + 1));
    if (!positions.includes(idx)) {
      // Flip the lowest 8 bits for simplicity
      corrupted[idx] = corrupted[idx] ^ 0xff;
      positions.push(idx);
    }
  }
  return { corrupted, errorPositions: positions };
}

export function decode(corrupted: number[], paritySymbols: number): { decoded: string } {
  // Very naive recovery: assume at most paritySymbols/2 errors and that parity is simple XOR.
  // We'll recompute parity and attempt to fix single errors.
  const dataLength = corrupted.length - paritySymbols;
  const data = corrupted.slice(0, dataLength);
  const parity = corrupted.slice(dataLength);
  const expectedParity = computeParity(data, paritySymbols);

  // Find mismatched parity indices
  const mismatches = parity.reduce((arr, val, i) => (val !== expectedParity[i] ? arr.concat(i) : arr), [] as number[]);
  if (mismatches.length === 0) {
    // No error detected
    return { decoded: String.fromCharCode(...data) };
  }
  // Attempt single-symbol correction by brute force
  for (let i = 0; i < corrupted.length; i++) {
    const original = corrupted[i];
    // Try flipping bits (simple reverse of injectErrors)
    const trial = original ^ 0xff;
    const trialArray = [...corrupted];
    trialArray[i] = trial;
    const trialData = trialArray.slice(0, dataLength);
    const trialParity = trialArray.slice(dataLength);
    const trialExpected = computeParity(trialData, paritySymbols);
    if (trialParity.every((v, idx) => v === trialExpected[idx])) {
      return { decoded: String.fromCharCode(...trialData) };
    }
  }
  // If we cannot recover, return what we have
  return { decoded: String.fromCharCode(...data) };
}

self.addEventListener('message', (event: MessageEvent) => {
  const msg: WorkerRequest = event.data;
  const { command, requestId, payload } = msg;
  let response: WorkerResponse = { requestId, success: false, payload: {} };

  try {
    switch (command) {
      case 'encode': {
        const { input, paritySymbols } = payload as EncodePayload;
        const encoded = encode(input, paritySymbols);
        response = { requestId, success: true, payload: { encoded } };
        break;
      }
      case 'injectErrors': {
        const { encoded, errorCount } = payload as InjectErrorsPayload;
        const { corrupted, errorPositions } = injectErrors(encoded, errorCount);
        response = { requestId, success: true, payload: { corrupted, errorPositions } };
        break;
      }
      case 'decode': {
        const { corrupted } = payload as DecodePayload;
        // parity count is inferred from last 32 symbols (default) if length > 0
        const paritySymbols = 32; // same default as encode UI
        const { decoded } = decode(corrupted, paritySymbols);
        response = { requestId, success: true, payload: { decoded } };
        break;
      }
      default:
        throw new Error(`Unsupported command ${command}`);
    }
  } catch (e: any) {
    response = { requestId, success: false, payload: { error: e?.message ?? 'unknown' } };
  }

  // @ts-ignore – worker postMessage
  (self as any).postMessage(response);
});
