import React from "react";
import type { Metadata } from "next";
import Navbar from "../../components/layout/Navbar";
import LatticeVisualizer from "../../components/math/LatticeVisualizer";
import RingLwePolynomialLab from "../../components/math/RingLwePolynomialLab";

export const metadata: Metadata = {
  title: "Lattice Cryptography & LWE | CryptoViz",
  description:
    "Interactive geometric lattice cryptography and Learning With Errors (LWE) problem visualizer for Post-Quantum Cryptography.",
};

export default function PqcLatticesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-[#F5F5F7] font-sans">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Lattice Cryptography & LWE
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl">
            Explore the geometric foundations of Post-Quantum Cryptography (PQC). Discover how the Learning With Errors (LWE) problem maps to finding the closest vector in a lattice, and experiment with polynomial arithmetic in Ring-LWE (used in ML-KEM/Kyber).
          </p>
        </div>

        <div className="space-y-12">
          {/* LWE & Lattices Educational Text */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">What is Lattice Cryptography?</h2>
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p>
                A <strong>lattice</strong> is a grid of points extending infinitely in space. You can generate every point in the grid using linear combinations of <em>basis vectors</em>.
              </p>
              <p>
                The security of many quantum-resistant algorithms relies on problems like the <strong>Closest Vector Problem (CVP)</strong> or <strong>Shortest Vector Problem (SVP)</strong>. If you are given a "bad" basis (long, skewed vectors), it is exceptionally hard to find the closest lattice point to an arbitrary target. Conversely, with a "good" basis (short, nearly orthogonal vectors), the problem is easy.
              </p>
              <p>
                <strong>Learning With Errors (LWE)</strong> is the algebraic counterpart to CVP. In LWE, you are given samples $(A, B)$ where $B = A \cdot s + e \pmod{q}$. The goal is to find the secret vector $s$. Without the small error $e$, this is simple Gaussian elimination. With the error, it becomes a hard lattice problem.
              </p>
            </div>
          </section>

          {/* Geometric Visualizer */}
          <section>
            <LatticeVisualizer />
          </section>

          {/* Ring-LWE Educational Text */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Ring-LWE & Polynomial Rings</h2>
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p>
                Standard LWE is secure but results in large public keys (huge matrices). <strong>Ring-LWE</strong> solves this by using polynomial rings instead of matrices, reducing key sizes significantly. Algorithms like ML-KEM (Kyber) use Module-LWE, a variant of Ring-LWE.
              </p>
              <p>
                In Ring-LWE, elements are polynomials where:
              </p>
              <ul>
                <li>The coefficients are integers modulo $q$.</li>
                <li>The polynomials themselves are reduced modulo a polynomial, typically $X^n + 1$.</li>
              </ul>
              <p>
                Because we reduce by $X^n + 1$, the equation implies $X^n = -1$. This means any term $X^{n+k}$ wraps around to become $-X^k$. This property is known as <em>negacyclic convolution</em>.
              </p>
            </div>
          </section>

          {/* Polynomial Lab */}
          <section>
            <RingLwePolynomialLab />
          </section>
        </div>
      </main>
    </div>
  );
}
