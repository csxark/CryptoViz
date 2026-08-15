export interface ChiSquareResult {
  pValue: number;
  chiSquareStat: number;
  isPayloadDetected: boolean;
  histogramPairs: { k: number; n2k: number; n2kPlus1: number }[];
}

export function runChiSquareSteganalysis(imageData: ImageData): ChiSquareResult {
  const data = imageData.data;
  const counts = new Array(256).fill(0);

  // Count pixel channel frequencies (using Red channel)
  for (let i = 0; i < data.length; i += 4) {
    counts[data[i]]++;
  }

  const pairs: { k: number; n2k: number; n2kPlus1: number }[] = [];
  let chiSquareStat = 0;
  let kCount = 0;

  for (let i = 0; i < 256; i += 2) {
    const n2k = counts[i];
    const n2kPlus1 = counts[i + 1];
    const expected = (n2k + n2kPlus1) / 2;

    pairs.push({ k: i / 2, n2k, n2kPlus1 });

    if (expected > 0) {
      chiSquareStat += Math.pow(n2k - expected, 2) / expected;
      kCount++;
    }
  }

  // Simplified approximation of p-value based on chi-square statistic
  const pValue = Math.max(0, Math.min(1, 1 - (chiSquareStat / (kCount * 100))));
  const isPayloadDetected = pValue > 0.95 || chiSquareStat < 15;

  return {
    pValue,
    chiSquareStat,
    isPayloadDetected,
    histogramPairs: pairs.slice(0, 32), // Return first 32 PoVs for chart plotting
  };
}
