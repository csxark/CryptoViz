// Physical Entropy Harvesting & Von Neumann Debiasing Engine

export interface EntropyMetrics {
  shannonEntropy: number; // H0 in bits
  minEntropy: number;     // H_inf in bits
  bias: number;           // P(1)
  totalBits: number;
  onesCount: number;
  zerosCount: number;
}

export function calculateEntropyMetrics(bits: number[]): EntropyMetrics {
  const totalBits = bits.length;
  if (totalBits === 0) {
    return { shannonEntropy: 0, minEntropy: 0, bias: 0, totalBits: 0, onesCount: 0, zerosCount: 0 };
  }

  const onesCount = bits.filter(b => b === 1).length;
  const zerosCount = totalBits - onesCount;
  const p1 = onesCount / totalBits;
  const p0 = zerosCount / totalBits;

  // Shannon Entropy H0 = -sum(p * log2(p))
  let shannonEntropy = 0;
  if (p0 > 0) shannonEntropy -= p0 * Math.log2(p0);
  if (p1 > 0) shannonEntropy -= p1 * Math.log2(p1);

  // Min-Entropy H_inf = -log2(max(p0, p1))
  const maxP = Math.max(p0, p1);
  const minEntropy = maxP > 0 ? -Math.log2(maxP) : 0;

  return {
    shannonEntropy: parseFloat(shannonEntropy.toFixed(4)),
    minEntropy: parseFloat(minEntropy.toFixed(4)),
    bias: parseFloat(p1.toFixed(2)),
    totalBits,
    onesCount,
    zerosCount,
  };
}

export function runVonNeumannFilter(bits: number[]): { unbiasedBits: number[]; processedPairs: { pair: string; output: string | null }[] } {
  const unbiasedBits: number[] = [];
  const processedPairs: { pair: string; output: string | null }[] = [];

  for (let i = 0; i < bits.length - 1; i += 2) {
    const b1 = bits[i];
    const b2 = bits[i + 1];
    const pairStr = `${b1}${b2}`;

    if (pairStr === '01') {
      unbiasedBits.push(0);
      processedPairs.push({ pair: pairStr, output: '0' });
    } else if (pairStr === '10') {
      unbiasedBits.push(1);
      processedPairs.push({ pair: pairStr, output: '1' });
    } else {
      processedPairs.push({ pair: pairStr, output: 'Discard' });
    }
  }

  return { unbiasedBits, processedPairs };
}
