import { 
  calculateShannonEntropy, 
  calculateMinEntropy, 
  calculateUnicityDistance 
} from "../entropy";

describe("Information Theory Utilities", () => {
  it("calculates correct Shannon entropy for uniform distribution", () => {
    const entropy = calculateShannonEntropy([0.5, 0.5]);
    expect(entropy).toBeCloseTo(1.0);
  });

  it("calculates correct Min-Entropy", () => {
    const minEntropy = calculateMinEntropy([0.8, 0.2]);
    expect(minEntropy).toBeCloseTo(-Math.log2(0.8));
  });

  it("calculates correct Unicity Distance", () => {
    const unicity = calculateUnicityDistance(25, 3.2);
    expect(unicity).toBeCloseTo(7.81, 1);
  });
});
