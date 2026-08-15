'use client'

import React, { useState, useMemo } from 'react'
import {
  generateParticipantPolynomial,
  calculateCommitments,
  evaluatePolynomial,
  verifyShare,
  aggregateShares,
  aggregateGroupPublicKey,
  calculateLagrangeCoefficient,
  generatePartialSignature,
  computeSchnorrChallenge,
  aggregateSignatures,
  verifyClassicSchnorr,
  CURVE_ORDER,
  mod,
  Share,
  PartialSignature,
} from '../../lib/math/thresholdDkg'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { fromByteArray } from '../../lib/utils/encoding'

interface DkgParticipantState {
  id: number
  polynomial: bigint[]
  commitments: string[]
  receivedShares: Share[]
  secretShare: bigint | null
  ephemeralSecret?: bigint
  partialR?: string
}

export default function ThresholdDkgSimulator() {
  const [n, setN] = useState<number>(5)
  const [t, setT] = useState<number>(3)
  const [message, setMessage] = useState<string>('Test Message')
  const [step, setStep] = useState<number>(0)
  
  const [participants, setParticipants] = useState<DkgParticipantState[]>([])
  const [groupPublicKey, setGroupPublicKey] = useState<string | null>(null)
  
  // Signing state
  const [selectedSigners, setSelectedSigners] = useState<number[]>([])
  const [partialSigs, setPartialSigs] = useState<PartialSignature[]>([])
  const [finalSig, setFinalSig] = useState<{ R: string, z: bigint, isValid: boolean } | null>(null)

  const handleRunDkg = () => {
    // Reset state
    setSelectedSigners([])
    setPartialSigs([])
    setFinalSig(null)

    // Phase 1: Polynomials and Commitments
    const newParticipants: DkgParticipantState[] = []
    for (let i = 1; i <= n; i++) {
      const poly = generateParticipantPolynomial(t)
      const commitments = calculateCommitments(poly)
      newParticipants.push({
        id: i,
        polynomial: poly,
        commitments,
        receivedShares: [],
        secretShare: null
      })
    }
    
    // Phase 2: Share Distribution
    for (let i = 0; i < n; i++) {
      const sender = newParticipants[i]
      for (let j = 0; j < n; j++) {
        const receiver = newParticipants[j]
        const shareVal = evaluatePolynomial(sender.polynomial, receiver.id)
        receiver.receivedShares.push({ senderId: sender.id, receiverId: receiver.id, value: shareVal })
      }
    }

    // Phase 3: Share Verification and Aggregation
    for (let j = 0; j < n; j++) {
      const receiver = newParticipants[j]
      let aggregatedSecret = 0n
      for (const share of receiver.receivedShares) {
        const sender = newParticipants.find(p => p.id === share.senderId)!
        const isValid = verifyShare(share, sender.commitments)
        if (!isValid) console.warn(`Share from ${sender.id} to ${receiver.id} invalid!`)
        aggregatedSecret = mod(aggregatedSecret + share.value, CURVE_ORDER)
      }
      receiver.secretShare = aggregatedSecret
    }

    const pk = aggregateGroupPublicKey(newParticipants.map(p => p.commitments))
    setGroupPublicKey(pk)
    setParticipants(newParticipants)
    setStep(1)
  }

  const toggleSigner = (id: number) => {
    if (selectedSigners.includes(id)) {
      setSelectedSigners(selectedSigners.filter(s => s !== id))
    } else {
      if (selectedSigners.length < t) {
        setSelectedSigners([...selectedSigners, id])
      }
    }
  }

  const handleSign = () => {
    if (selectedSigners.length !== t) return
    if (!groupPublicKey) return

    // Generate ephemeral secrets and R
    const updatedParticipants = [...participants]
    const currentPartialRs: string[] = []
    
    selectedSigners.forEach(id => {
      const p = updatedParticipants.find(p => p.id === id)!
      const kBytes = secp256k1.utils.randomSecretKey()
      const k = mod(BigInt('0x' + fromByteArray(kBytes, 'hex')), CURVE_ORDER)
      p.ephemeralSecret = k
      const R = secp256k1.Point.BASE.multiply(k).toHex(false)
      p.partialR = R
      currentPartialRs.push(R)
    })
    
    setParticipants(updatedParticipants)

    // Aggregate R
    let R_agg = secp256k1.Point.ZERO
    for (const r of currentPartialRs) {
      R_agg = R_agg.add(secp256k1.Point.fromHex(r))
    }
    const R_hex = R_agg.toHex(false)

    const challenge = computeSchnorrChallenge(R_hex, groupPublicKey, message)

    // Generate Partial Signatures
    const sigs: PartialSignature[] = []
    selectedSigners.forEach(id => {
      const p = updatedParticipants.find(p => p.id === id)!
      const lambda = calculateLagrangeCoefficient(id, selectedSigners)
      const sig = generatePartialSignature(id, p.secretShare!, p.ephemeralSecret!, challenge, lambda)
      sigs.push(sig)
    })
    setPartialSigs(sigs)

    // Aggregate Signatures
    const { R: R_final, z } = aggregateSignatures(sigs)
    const isValid = verifyClassicSchnorr(message, R_final, z, groupPublicKey)
    setFinalSig({ R: R_final, z, isValid })
    
    setStep(2)
  }

  return (
    <div className="space-y-8">
      {/* Configuration */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h2 className="text-xl font-bold">1. Configure Simulator</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Total Participants (n)</label>
            <input 
              type="number" 
              min={2} 
              max={10} 
              value={n} 
              onChange={e => setN(parseInt(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Threshold (t)</label>
            <input 
              type="number" 
              min={1} 
              max={n} 
              value={t} 
              onChange={e => setT(parseInt(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message to Sign</label>
            <input 
              type="text" 
              value={message} 
              onChange={e => setMessage(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-teal-500"
            />
          </div>
        </div>
        <button 
          onClick={handleRunDkg}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Run Distributed Key Generation (DKG)
        </button>
      </div>

      {/* DKG Results */}
      {step >= 1 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold">2. DKG Results</h2>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold mb-1">Group Public Key</p>
            <p className="font-mono text-xs break-all">{groupPublicKey}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {participants.map(p => (
              <div key={p.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <h3 className="font-bold text-sm">Participant {p.id}</h3>
                <div className="mt-2 space-y-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  <p>Secret Share (s_{p.id}): <span className="text-teal-600 dark:text-teal-400 break-all">{p.secretShare?.toString(16)}</span></p>
                  <p>Polynomial a_0 (k_{p.id}): {p.polynomial[0].toString(16).substring(0, 16)}...</p>
                  <p className="italic text-[10px] text-zinc-500">* Notice that no participant's secret share equals the group secret. They only hold a point on the global polynomial.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threshold Signing */}
      {step >= 1 && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold">3. Threshold Signing</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Select exactly {t} participants to sign the message.</p>
          
          <div className="flex flex-wrap gap-2">
            {participants.map(p => (
              <button
                key={p.id}
                onClick={() => toggleSigner(p.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors border ${
                  selectedSigners.includes(p.id)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                Participant {p.id}
              </button>
            ))}
          </div>

          {selectedSigners.length === t && (
            <button 
              onClick={handleSign}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Generate Signature
            </button>
          )}

          {step >= 2 && finalSig && (
            <div className="space-y-4 mt-6">
              <h3 className="font-bold text-lg">Signature Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partialSigs.map(sig => (
                  <div key={sig.participantId} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 font-mono text-xs space-y-1">
                    <p className="font-bold">Participant {sig.participantId} Partial Sig</p>
                    <p className="break-all">R: {sig.R.substring(0, 20)}...</p>
                    <p className="break-all">z: {sig.z.toString(16).substring(0, 20)}...</p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Final Aggregated Signature</h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${finalSig.isValid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {finalSig.isValid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
                <div className="font-mono text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                  <p className="break-all"><span className="font-bold">R:</span> {finalSig.R}</p>
                  <p className="break-all"><span className="font-bold">z:</span> {finalSig.z.toString(16)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
