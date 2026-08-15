'use client'

import React, { useState } from 'react'
import {
  gfMultiplyWithTrace,
  gfExtendedEuclideanWithTrace,
  deriveSBoxWithTrace,
  ModulusHex,
} from '../../lib/math/galoisField'

export default function GaloisFieldLab() {
  const [activeTab, setActiveTab] = useState<'mul' | 'inv' | 'sbox'>('mul')

  // Multiplication State
  const [mulA, setMulA] = useState<string>('57')
  const [mulB, setMulB] = useState<string>('13')
  const [modulus, setModulus] = useState<ModulusHex>(0x11b)

  // Inverse State
  const [invA, setInvA] = useState<string>('53')

  // SBox State
  const [sboxA, setSboxA] = useState<string>('00')

  const parseHex = (val: string) => {
    const clean = val.replace(/^0x/, '')
    const num = parseInt(clean, 16)
    return isNaN(num) ? 0 : num & 0xFF
  }

  // Derived values
  const mulAVal = parseHex(mulA)
  const mulBVal = parseHex(mulB)
  const mulTrace = gfMultiplyWithTrace(mulAVal, mulBVal, modulus)

  const invAVal = parseHex(invA)
  const invTrace = gfExtendedEuclideanWithTrace(invAVal, modulus)

  const sboxAVal = parseHex(sboxA)
  const sboxTrace = deriveSBoxWithTrace(sboxAVal, modulus)

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('mul')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'mul'
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          Polynomial Multiplication
        </button>
        <button
          onClick={() => setActiveTab('inv')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'inv'
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          Multiplicative Inverse
        </button>
        <button
          onClick={() => setActiveTab('sbox')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'sbox'
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          Rijndael S-Box
        </button>
      </div>

      {/* MULTIPLICATION TAB */}
      {activeTab === 'mul' && (
        <div className="space-y-6">
          <div aria-label="Multiplication Controls" className="grid grid-cols-1 gap-6 md:grid-cols-3 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div>
              <label htmlFor="mulA" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Polynomial A (Hex)
              </label>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-zinc-500 font-mono">0x</span>
                <input
                  id="mulA"
                  type="text"
                  maxLength={2}
                  value={mulA}
                  onChange={(e) => setMulA(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm uppercase font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
                />
              </div>
            </div>
            <div>
              <label htmlFor="mulB" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Polynomial B (Hex)
              </label>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-zinc-500 font-mono">0x</span>
                <input
                  id="mulB"
                  type="text"
                  maxLength={2}
                  value={mulB}
                  onChange={(e) => setMulB(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm uppercase font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
                />
              </div>
            </div>
            <div>
              <label htmlFor="modulus" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Irreducible Polynomial Modulus
              </label>
              <select
                id="modulus"
                value={modulus}
                onChange={(e) => setModulus(parseInt(e.target.value) as ModulusHex)}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
              >
                <option value={0x11b}>0x11B (AES / Rijndael)</option>
                <option value={0x11d}>0x11D (Anubis)</option>
                <option value={0x12d}>0x12D (Twofish)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-lg font-bold">Multiplication Trace</h3>
            <div className="flex gap-4 items-center">
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-sm">
                0x{mulTrace.inputAHex} × 0x{mulTrace.inputBHex} = 0x{mulTrace.resultHex}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-2">
              <div>A: {mulTrace.binaryA} ({mulTrace.polyA})</div>
              <div>B: {mulTrace.binaryB} ({mulTrace.polyB})</div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm" aria-label="Step-by-step Multiplication Trace">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2 rounded-tl-lg">Bit</th>
                    <th className="px-4 py-2">Multiplicand (Shifted)</th>
                    <th className="px-4 py-2">Operation</th>
                    <th className="px-4 py-2">Reduction</th>
                    <th className="px-4 py-2 rounded-tr-lg">Accumulator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                  {mulTrace.steps.map((step) => (
                    <tr key={step.multiplierBitIndex} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3">{step.multiplierBitIndex} (B={step.multiplierBit})</td>
                      <td className="px-4 py-3">0x{step.shiftedMultiplicandHex}</td>
                      <td className="px-4 py-3">
                        {step.isXorPerformed ? (
                          <span className="text-teal-600 dark:text-teal-400 font-bold">
                            XOR 0x{step.shiftedMultiplicandHex}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Skip</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {step.overflowDetected ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            XOR Modulus
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                        0x{step.accumulatorAfterHex}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-sm space-y-2">
              <p>Final Result: <span className="font-bold text-teal-600 dark:text-teal-400">0x{mulTrace.resultHex}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* INVERSE TAB */}
      {activeTab === 'inv' && (
        <div className="space-y-6">
          <div aria-label="Inverse Controls" className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div>
              <label htmlFor="invA" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Input Byte (Hex)
              </label>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-zinc-500 font-mono">0x</span>
                <input
                  id="invA"
                  type="text"
                  maxLength={2}
                  value={invA}
                  onChange={(e) => setInvA(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm uppercase font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
                />
              </div>
            </div>
            <div>
              <label htmlFor="invModulus" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Irreducible Polynomial Modulus
              </label>
              <select
                id="invModulus"
                value={modulus}
                onChange={(e) => setModulus(parseInt(e.target.value) as ModulusHex)}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
              >
                <option value={0x11b}>0x11B (AES / Rijndael)</option>
                <option value={0x11d}>0x11D (Anubis)</option>
                <option value={0x12d}>0x12D (Twofish)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-lg font-bold">Extended Euclidean Algorithm Trace</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Calculating the multiplicative inverse of 0x{invTrace.inputHex} modulo 0x{invTrace.modulusHex}.
            </p>

            {invTrace.inputHex === '00' ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm">
                In AES/Rijndael arithmetic, the inverse of 0x00 is defined as 0x00.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm" aria-label="Extended Euclidean Algorithm Steps">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2 rounded-tl-lg">Iter</th>
                      <th className="px-4 py-2">Remainder (r)</th>
                      <th className="px-4 py-2">Quotient (q)</th>
                      <th className="px-4 py-2">Next Remainder</th>
                      <th className="px-4 py-2 rounded-tr-lg">Auxiliary (s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                    {invTrace.steps.map((step) => (
                      <tr key={step.iteration} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3">{step.iteration}</td>
                        <td className="px-4 py-3">0x{step.remainderHex}</td>
                        <td className="px-4 py-3">0x{step.quotientHex}</td>
                        <td className="px-4 py-3">0x{step.nextRemainderHex}</td>
                        <td className="px-4 py-3">0x{step.auxiliaryHex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-sm space-y-2">
              <p>Multiplicative Inverse: <span className="font-bold text-teal-600 dark:text-teal-400">0x{invTrace.inverseHex}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* SBOX TAB */}
      {activeTab === 'sbox' && (
        <div className="space-y-6">
          <div aria-label="S-Box Controls" className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div>
              <label htmlFor="sboxA" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Input Byte (Hex)
              </label>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-zinc-500 font-mono">0x</span>
                <input
                  id="sboxA"
                  type="text"
                  maxLength={2}
                  value={sboxA}
                  onChange={(e) => setSboxA(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm uppercase font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sboxModulus" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Irreducible Polynomial Modulus
              </label>
              <select
                id="sboxModulus"
                value={modulus}
                onChange={(e) => setModulus(parseInt(e.target.value) as ModulusHex)}
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none dark:border-zinc-700"
              >
                <option value={0x11b}>0x11B (AES / Rijndael)</option>
                <option value={0x11d}>0x11D (Anubis)</option>
                <option value={0x12d}>0x12D (Twofish)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-lg font-bold">Rijndael S-Box Derivation</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The S-Box substitution for 0x{sboxTrace.inputHex} consists of two steps:
            </p>
            
            <div className="mt-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <h4 className="font-semibold text-sm">Step 1: Multiplicative Inverse</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-2">Find the inverse in GF(2^8). If input is 0x00, the inverse is mapped to 0x00.</p>
              <span className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                Inverse of 0x{sboxTrace.inputHex} = 0x{sboxTrace.inverseHex} ({sboxTrace.binaryInverse})
              </span>
            </div>

            <div className="mt-4 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <h4 className="font-semibold text-sm">Step 2: Affine Transformation</h4>
              <p className="text-xs text-zinc-500 mt-1 mb-3">Apply the Rijndael affine transformation: multiplication by a specific matrix and XOR with 0x63.</p>
              
              <div className="space-y-1 font-mono text-xs">
                {sboxTrace.affineSteps.map(step => (
                  <div key={step.bitIndex} className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
                    {step.equation}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 font-mono text-sm space-y-2 mt-4">
              <p>Final S-Box Value: <span className="font-bold text-teal-600 dark:text-teal-400">0x{sboxTrace.resultHex}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
