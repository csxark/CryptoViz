export function calculateShannonEntropy(probabilities: number[]): number {
  return probabilities.reduce((sum, p) => {
    if (p <= 0) return sum;
    return sum - p * Math.log2(p);
  }, 0);
}

export function calculateMinEntropy(probabilities: number[]): number {
  const maxP = Math.max(...probabilities);
  if (maxP <= 0) return 0;
  return -Math.log2(maxP);
}

export function calculateUnicityDistance(keyEntropyBits: number, languageRedundancyBitsPerChar: number): number {
  if (languageRedundancyBitsPerChar <= 0) return Infinity;
  return keyEntropyBits / languageRedundancyBitsPerChar;
}
