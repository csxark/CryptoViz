// lib/quantum/groverSimulator.ts

// Simulate the amplitudes of a quantum state during Grover's algorithm
export function simulateGrover(numItems: number, targetIndex: number, iterations: number): number[] {
  if (targetIndex < 0 || targetIndex >= numItems) {
    throw new Error("Target index out of bounds");
  }

  // Initial state: uniform superposition
  const initialAmplitude = 1 / Math.sqrt(numItems);
  let amplitudes = new Array(numItems).fill(initialAmplitude);

  for (let k = 0; k < iterations; k++) {
    // 1. Oracle: Invert the phase of the target state
    amplitudes[targetIndex] *= -1;

    // 2. Diffusion Operator (Amplitude Amplification): Inversion about the mean
    let sum = 0;
    for (let i = 0; i < numItems; i++) {
      sum += amplitudes[i];
    }
    const mean = sum / numItems;

    for (let i = 0; i < numItems; i++) {
      amplitudes[i] = 2 * mean - amplitudes[i];
    }
  }

  return amplitudes;
}

// Compute the probability of each state from its amplitude
export function getProbabilities(amplitudes: number[]): number[] {
  return amplitudes.map(a => a * a);
}

// Determine the optimal number of Grover iterations for N items
// Optimal k = floor((pi/4) * sqrt(N))
export function getOptimalIterations(numItems: number): number {
  return Math.floor((Math.PI / 4) * Math.sqrt(numItems));
}
