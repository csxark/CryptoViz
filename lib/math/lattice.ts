// lib/math/lattice.ts

export type Vector2D = [number, number];

export function vectorAdd(a: Vector2D, b: Vector2D): Vector2D {
  return [a[0] + b[0], a[1] + b[1]];
}

export function vectorSub(a: Vector2D, b: Vector2D): Vector2D {
  return [a[0] - b[0], a[1] - b[1]];
}

export function vectorScale(a: Vector2D, s: number): Vector2D {
  return [a[0] * s, a[1] * s];
}

export function dotProduct(a: Vector2D, b: Vector2D): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function generateLatticePoints(b1: Vector2D, b2: Vector2D, range: number): Vector2D[] {
  const points: Vector2D[] = [];
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      points.push([
        i * b1[0] + j * b2[0],
        i * b1[1] + j * b2[1]
      ]);
    }
  }
  return points;
}

// Babai's Nearest Plane / Rounding algorithm for 2D
export function cvpNearestPoint(target: Vector2D, b1: Vector2D, b2: Vector2D): Vector2D {
  // In 2D, we can solve the system of linear equations to find real coefficients (c1, c2)
  // such that c1*b1 + c2*b2 = target.
  // Then we round c1 and c2 to the nearest integers.
  
  const det = b1[0] * b2[1] - b1[1] * b2[0];
  if (Math.abs(det) < 1e-9) {
    throw new Error("Basis vectors are linearly dependent (determinant is 0).");
  }

  // Inverse matrix of [b1, b2]:
  // 1/det * [ b2[1]  -b2[0] ]
  //         [ -b1[1]  b1[0] ]
  
  const c1 = (target[0] * b2[1] - target[1] * b2[0]) / det;
  const c2 = (-target[0] * b1[1] + target[1] * b1[0]) / det;

  const round1 = Math.round(c1);
  const round2 = Math.round(c2);

  return [
    round1 * b1[0] + round2 * b2[0],
    round1 * b1[1] + round2 * b2[1]
  ];
}

// LWE: B = A*S + E (mod Q)
// For educational purposes, A is a matrix of size mxn, S is nx1, E is mx1
// But let's keep it simple for testing.
export function computeLwe(a: number[][], s: number[], e: number[], q: number): number[] {
  const m = a.length;
  const b: number[] = new Array(m).fill(0);
  
  for (let i = 0; i < m; i++) {
    let dot = 0;
    for (let j = 0; j < s.length; j++) {
      dot += a[i][j] * s[j];
    }
    b[i] = ((dot + e[i]) % q + q) % q;
  }
  
  return b;
}
