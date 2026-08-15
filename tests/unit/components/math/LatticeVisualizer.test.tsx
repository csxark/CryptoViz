import { vectorAdd, vectorSub, vectorScale, dotProduct, generateLatticePoints, cvpNearestPoint, computeLwe } from '../../../../lib/math/lattice';

describe('Lattice Math Utilities', () => {
  it('should add vectors correctly', () => {
    expect(vectorAdd([1, 2], [3, 4])).toEqual([4, 6]);
  });

  it('should subtract vectors correctly', () => {
    expect(vectorSub([1, 2], [3, 4])).toEqual([-2, -2]);
  });

  it('should scale vectors correctly', () => {
    expect(vectorScale([1, 2], 3)).toEqual([3, 6]);
  });

  it('should compute dot product correctly', () => {
    expect(dotProduct([1, 2], [3, 4])).toBe(11);
  });

  it('should generate lattice points', () => {
    const points = generateLatticePoints([1, 0], [0, 1], 1);
    expect(points.length).toBe(9); // 3x3 grid (-1, 0, 1)
    expect(points).toContainEqual([0, 0]);
    expect(points).toContainEqual([1, 1]);
    expect(points).toContainEqual([-1, -1]);
  });

  it('should compute nearest plane CVP correctly', () => {
    // Basis: b1 = [2, 0], b2 = [0, 2]
    // Target = [1.2, 0.8]
    // Nearest should be [2, 0] or [0, 0], wait...
    // 1.2 is closer to 1, wait, c1 = 1.2 / 2 = 0.6 -> round to 1.
    // c2 = 0.8 / 2 = 0.4 -> round to 0.
    // Nearest = 1 * [2,0] + 0 * [0,2] = [2,0]
    expect(cvpNearestPoint([1.2, 0.8], [2, 0], [0, 2])).toEqual([2, 0]);
    
    // Target = [0.8, 1.2]
    // c1 = 0.4 -> 0, c2 = 0.6 -> 1
    // Nearest = [0, 2]
    expect(cvpNearestPoint([0.8, 1.2], [2, 0], [0, 2])).toEqual([0, 2]);
  });
  
  it('should throw error on linearly dependent basis', () => {
    expect(() => cvpNearestPoint([1, 1], [1, 1], [2, 2])).toThrow();
  });

  it('should compute LWE B = A*S + E mod q', () => {
    const A = [
      [1, 2],
      [3, 4]
    ];
    const S = [1, 1]; // sum of rows
    const E = [0, 1]; // error
    const q = 7;
    // B[0] = (3 + 0) % 7 = 3
    // B[1] = (7 + 1) % 7 = 8 % 7 = 1
    expect(computeLwe(A, S, E, q)).toEqual([3, 1]);
  });
});
