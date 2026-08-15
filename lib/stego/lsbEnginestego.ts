// Spatial LSB and Zero-Width Unicode Steganography Engine

export function encodeLSB(imageData: ImageData, secretMessage: string, bitDepth: number = 1): ImageData {
  const canvasData = new Uint8ClampedArray(imageData.data);
  const encoderBytes = new TextEncoder().encode(secretMessage);
  
  // Prepend length header (32-bit integer)
  const payload = new Uint8Array(4 + encoderBytes.length);
  new DataView(payload.buffer).setUint32(0, encoderBytes.length, true);
  payload.set(encoderBytes, 4);

  let bitIndex = 0;
  const totalBits = payload.length * 8;

  for (let i = 0; i < canvasData.length; i += 4) {
    // Modify RGB channels, skip Alpha channel (i + 3)
    for (let c = 0; c < 3; c++) {
      if (bitIndex >= totalBits) break;
      
      let channelVal = canvasData[i + c];
      let valToEmbed = 0;

      for (let b = 0; b < bitDepth; b++) {
        if (bitIndex < totalBits) {
          const byteIdx = Math.floor(bitIndex / 8);
          const bitPos = bitIndex % 8;
          const bit = (payload[byteIdx] >> bitPos) & 1;
          valToEmbed |= (bit << b);
          bitIndex++;
        }
      }

      const mask = ~( ((1 << bitDepth) - 1) );
      canvasData[i + c] = (channelVal & mask) | valToEmbed;
    }
    if (bitIndex >= totalBits) break;
  }

  return new ImageData(canvasData, imageData.width, imageData.height);
}

export function decodeLSB(imageData: ImageData, bitDepth: number = 1): string {
  const canvasData = imageData.data;
  const extractedBits: number[] = [];

  for (let i = 0; i < canvasData.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const channelVal = canvasData[i + c];
      for (let b = 0; b < bitDepth; b++) {
        extractedBits.push((channelVal >> b) & 1);
      }
    }
  }

  // Extract length header (first 32 bits)
  let length = 0;
  for (let i = 0; i < 32; i++) {
    length |= (extractedBits[i] << i);
  }

  if (length <= 0 || length > 1000000) return 'No valid payload detected.';

  const messageBytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal |= (extractedBits[32 + i * 8 + b] << b);
    }
    messageBytes[i] = byteVal;
  }

  return new TextDecoder().decode(messageBytes);
}

// Zero-Width Unicode Text Steganography
const ZW_ZERO = '\u200B'; // Zero-width space
const ZW_ONE = '\u200C';  // Zero-width non-joiner

export function encodeZeroWidth(coverText: string, secretMessage: string): string {
  const bytes = new TextEncoder().encode(secretMessage);
  let binaryStr = '';
  for (const byte of bytes) {
    binaryStr += byte.toString(2).padStart(8, '0');
  }

  const encodedBits = binaryStr.split('').map(bit => (bit === '1' ? ZW_ONE : ZW_ZERO)).join('');
  
  // Insert zero-width characters after the first word of cover text
  const words = coverText.split(' ');
  if (words.length > 0) {
    words[0] = words[0] + encodedBits;
  }
  return words.join(' ');
}

export function decodeZeroWidth(stegoText: string): string {
  let binaryStr = '';
  for (let i = 0; i < stegoText.length; i++) {
    const char = stegoText[i];
    if (char === ZW_ONE) binaryStr += '1';
    else if (char === ZW_ZERO) binaryStr += '0';
  }

  const bytes = [];
  for (let i = 0; i < binaryStr.length; i += 8) {
    const byteChunk = binaryStr.substr(i, 8);
    if (byteChunk.length === 8) {
      bytes.push(parseInt(byteChunk, 2));
    }
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}
