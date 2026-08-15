export function flipBitInHex(hexString: string, bitIndex: number): string {
  if (hexString.length % 2 !== 0) {
    throw new Error('Hex string must have an even length.');
  }

  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }

  const byteIndex = Math.floor(bitIndex / 8);
  if (byteIndex >= bytes.length || byteIndex < 0) {
    throw new Error('Bit index out of bounds.');
  }

  const bitOffset = bitIndex % 8;
  const mask = 1 << (7 - bitOffset);
  bytes[byteIndex] ^= mask;

  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i].toString(16).padStart(2, '0');
  }
  return result;
}

export function flipBitInString(str: string, bitIndex: number): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  const byteIndex = Math.floor(bitIndex / 8);
  if (byteIndex >= bytes.length || byteIndex < 0) {
    throw new Error('Bit index out of bounds.');
  }

  const bitOffset = bitIndex % 8;
  const mask = 1 << (7 - bitOffset);
  bytes[byteIndex] ^= mask;

  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

export function computeHexDiff(hexA: string, hexB: string): { xorHex: string; diffCount: number } {
  // Pad strings to same length just in case
  const len = Math.max(hexA.length, hexB.length);
  const a = hexA.padEnd(len, '0');
  const b = hexB.padEnd(len, '0');

  let xorHex = '';
  let diffCount = 0;

  for (let i = 0; i < len; i += 2) {
    const byteA = parseInt(a.substring(i, i + 2) || '00', 16);
    const byteB = parseInt(b.substring(i, i + 2) || '00', 16);
    const xorByte = byteA ^ byteB;
    xorHex += xorByte.toString(16).padStart(2, '0');
    
    // Count bits set in xorByte
    let temp = xorByte;
    while (temp > 0) {
      diffCount += temp & 1;
      temp >>= 1;
    }
  }

  return { xorHex, diffCount };
}
