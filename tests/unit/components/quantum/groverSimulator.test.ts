import { simulateGrover, getProbabilities, getOptimalIterations } from '../../../../lib/quantum/groverSimulator';

describe('Grover Simulator Math Utilities', () => {
  it('computes initial state probabilities correctly', () => {
    const amplitudes = simulateGrover(4, 0, 0); // 0 iterations
    const probs = getProbabilities(amplitudes);
    expect(probs.length).toBe(4);
    probs.forEach(p => expect(p).toBeCloseTo(0.25));
  });

  it('amplifies target probability correctly with 1 iteration', () => {
    // For N=4, 1 iteration is optimal. Probability should be exactly 1.
    const amplitudes = simulateGrover(4, 2, 1);
    const probs = getProbabilities(amplitudes);
    expect(probs[2]).toBeCloseTo(1.0); // Target state
    expect(probs[0]).toBeCloseTo(0.0); // Other states
    expect(probs[1]).toBeCloseTo(0.0);
    expect(probs[3]).toBeCloseTo(0.0);
  });

  it('calculates optimal iterations correctly', () => {
    expect(getOptimalIterations(4)).toBe(1);  // floor((pi/4)*2) = floor(1.57) = 1
    expect(getOptimalIterations(8)).toBe(2);  // floor((pi/4)*sqrt(8)) = floor(2.22) = 2
    expect(getOptimalIterations(16)).toBe(3); // floor((pi/4)*4) = floor(3.14) = 3
  });

  it('shows probability dropping if over-iterating (overcooking)', () => {
    // For N=4, optimal is 1. If we do 2 iterations, the amplitude drops.
    const amplitudes = simulateGrover(4, 0, 2);
    const probs = getProbabilities(amplitudes);
    // Overcooking will cause target probability to drop significantly
    expect(probs[0]).toBeLessThan(0.5); 
  });
});
