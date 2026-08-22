'use client'

import React, { useState, useMemo } from 'react'
import Breadcrumbs from '../../components/layout/Breadcrumbs'
import Navbar from '../../components/layout/Navbar'
import PrimalityTestLab from '../../components/math/PrimalityTestLab'

export default function ModularArithmeticPage() {
  const [modulus, setModulus] = useState<number>(11)
  const [numA, setNumA] = useState<number>(5)
  const [numB, setNumB] = useState<number>(3)
  const [exponent, setExponent] = useState<number>(4)
  const [activeTab, setActiveTab] = useState<'calc' | 'tables' | 'inverse' | 'primality'>('calc')

  // Safe modulus handler to avoid negative or zero mod errors
  const safeMod = (n: number, m: number) => {
    if (m <= 0) return 0
    return ((n % m) + m) % m
  }

  // Extended Euclidean Algorithm for Modular Inverse
  const modInverse = (a: number, m: number) => {
    const aMod = safeMod(a, m)
    for (let x = 1; x < m; x++) {
      if ((aMod * x) % m === 1) return x
    }
    return null
  }

  const currentMod = Math.max(2, modulus)
  const addResult = safeMod(numA + numB, currentMod)
  const subResult = safeMod(numA - numB, currentMod)
  const mulResult = safeMod(numA * numB, currentMod)
  
  // Fast modular exponentiation
  const powResult = useMemo(() => {
    let res = 1
    let base = safeMod(numA, currentMod)
    let exp = Math.max(0, exponent)
    while (exp > 0) {
      if (exp % 2 === 1) res = (res * base) % currentMod
      base = (base * base) % currentMod
      exp = Math.floor(exp / 2)
    }
    return res
  }, [numA, exponent, currentMod])

  const inverseA = modInverse(numA, currentMod)

  // Multiplication table generation
  const gridValues = useMemo(() => {
    const matrix = []
    for (let i = 0; i < currentMod; i++) {
      const row = []
      for (let j = 0; j < currentMod; j++) {
        row.push(safeMod(i * j, currentMod))
      }
      matrix.push(row)
    }
    return matrix
  }, [currentMod])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Sandbox" }, { label: "Modular Arithmetic" }]} />
        
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Educational Sandbox
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Modular Arithmetic Playground
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Explore clock arithmetic, congruences, and modular operations foundational to asymmetric cryptography like RSA and Elliptic Curve Cryptography.
          </p>
        </header>

        {/* Controls and Configuration */}
        <section aria-label="Playground Controls" className="grid grid-cols-1 gap-6 md:grid-cols-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div>
            <label htmlFor="modulus" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Modulus ($m$)
            </label>
            <input
              id="modulus"
              type="number"
              min="2"
              max="99"
              value={modulus}
              onChange={(e) => setModulus(parseInt(e.target.value) || 2)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            />
            <p className="mt-1 text-xs text-zinc-500">Defines the ring ℤ/mℤ</p>
          </div>

          <div>
            <label htmlFor="numA" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Value $a$
            </label>
            <input
              id="numA"
              type="number"
              value={numA}
              onChange={(e) => setNumA(parseInt(e.target.value) || 0)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            />
          </div>

          <div>
            <label htmlFor="numB" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Value $b$
            </label>
            <input
              id="numB"
              type="number"
              value={numB}
              onChange={(e) => setNumB(parseInt(e.target.value) || 0)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            />
          </div>

          <div>
            <label htmlFor="exponent" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Exponent ($e$ for Powers)
            </label>
            <input
              id="exponent"
              type="number"
              min="0"
              value={exponent}
              onChange={(e) => setExponent(parseInt(e.target.value) || 0)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-zinc-700"
            />
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('calc')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'calc'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            Core Operations
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'tables'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            Multiplication Table
          </button>
          <button
            onClick={() => setActiveTab('primality')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'primality'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            Primality Lab
          </button>
          <button
            onClick={() => setActiveTab('inverse')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'inverse'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            Modular Inverse
          </button>
        </div>

        {activeTab === 'primality' && <PrimalityTestLab />}

        {/* Tab Content: Core Calculations */}
        {activeTab === 'calc' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-500">Addition</h3>
              <p className="mt-3 text-3xl font-bold">{addResult}</p>
              <p className="mt-2 text-xs text-zinc-500">
                ({numA} + {numB}) mod {currentMod}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-500">Subtraction</h3>
              <p className="mt-3 text-3xl font-bold">{subResult}</p>
              <p className="mt-2 text-xs text-zinc-500">
                ({numA} - {numB}) mod {currentMod}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-500">Multiplication</h3>
              <p className="mt-3 text-3xl font-bold">{mulResult}</p>
              <p className="mt-2 text-xs text-zinc-500">
                ({numA} × {numB}) mod {currentMod}
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-500">Exponentiation</h3>
              <p className="mt-3 text-3xl font-bold">{powResult}</p>
              <p className="mt-2 text-xs text-zinc-500">
                ({numA}<sup>{exponent}</sup>) mod {currentMod}
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: Multiplication Table Matrix */}
        {activeTab === 'tables' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            <h3 className="text-lg font-bold mb-4">Multiplication Table modulo {currentMod}</h3>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">×</th>
                  {gridValues.map((_, colIdx) => (
                    <th key={colIdx} className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 font-mono">
                      {colIdx}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridValues.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 font-mono font-bold">
                      {rowIdx}
                    </td>
                    {row.map((val, colIdx) => (
                      <td
                        key={colIdx}
                        className={`p-2 border border-zinc-200 dark:border-zinc-800 font-mono ${
                          rowIdx === numA && colIdx === numB
                            ? 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold'
                            : ''
                        }`}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content: Modular Inverse */}
        {activeTab === 'inverse' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-lg font-bold">Multiplicative Inverse of $a$ modulo $m$</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The modular inverse of $a$ modulo $m$ is an integer $x$ such that $(a \times x) \equiv 1 \pmod m$. It exists if and only if $\gcd(a, m) = 1$.
            </p>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-sm">
              <p>Value $a$: <span className="font-bold">{numA}</span></p>
              <p>Modulus $m$: <span className="font-bold">{currentMod}</span></p>
              <p className="mt-2">
                Resulting Inverse (a^{-1}):{' '}
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {inverseA !== null ? inverseA : 'None (GCD(a, m) ≠ 1)'}
                </span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
