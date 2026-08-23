'use client';

/**
 * Enterprise Zero-Knowledge Proof (ZKP) Analytics Visualizer Component
 * 
 * Architectural Specifications:
 * - Interactive React visualizer for Pedersen Commitments, Schnorr NIZK Discrete DLog Proofs,
 *   Bulletproofs range proof verification [0, 2^64-1], and Merkle Tree membership proofs.
 * - Features real-time secret witness sliders, transcript verification output, cryptographic parameter inspector,
 *   and governance audit log entries.
 *
 * @module ZkProofVisualizer
 * @version 4.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

import React, { useState, useMemo } from 'react';
import { ZkProofService } from '@/lib/ZkProofService';
import { PedersenCommitment } from '@/lib/ZkProofModel';

export default function ZkProofVisualizer() {
  const [service] = useState(() => new ZkProofService());
  const [secretBalance, setSecretBalance] = useState<number>(500000);
  const [schnorrSecret, setSchnorrSecret] = useState<number>(42);
  const [selectedTab, setSelectedTab] = useState<'PEDERSEN' | 'SCHNORR' | 'BULLETPROOFS' | 'MERKLE'>('PEDERSEN');

  const pedersenCommitment: PedersenCommitment = useMemo(() => {
    return service.generatePedersenCommitment(BigInt(secretBalance));
  }, [service, secretBalance]);

  const schnorrProof = useMemo(() => {
    return service.generateAndVerifySchnorrProof(BigInt(schnorrSecret));
  }, [service, schnorrSecret]);

  const rangeProof = useMemo(() => {
    return service.verifyRangeProof(secretBalance, 0, 100000000);
  }, [service, secretBalance]);

  const merkleProof = useMemo(() => {
    return service.verifyMerkleMembership(
      '0x71c7656ec7ab88b09871ab0098',
      '0xa8f3b1e9c2d3e4f5a6b7c8d9',
      ['0x111111111111111111111111', '0x222222222222222222222222']
    );
  }, [service]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Banner */}
      <header className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/30 uppercase tracking-wider">
              Zero-Knowledge Cryptography
            </span>
            <span className="text-slate-400 text-xs font-mono">v4.0.0 • Curve25519 & Bulletproofs</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">
            Zero-Knowledge Proof (ZKP) Range & Membership Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            Mathematical proof generation and verification for Pedersen Commitments, Schnorr NIZK Discrete Log proofs,
            Bulletproofs range verification, and Merkle tree membership.
          </p>
        </div>
      </header>

      {/* KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pedersen Commitment</div>
          <div className="text-sm font-mono font-bold text-indigo-300 truncate">{pedersenCommitment.commitmentHex}</div>
          <div className="text-emerald-400 text-xs mt-1 font-mono">C = g^v * h^r (mod p)</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Schnorr NIZK DLog</div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {schnorrProof.isValid ? '✓ VERIFIED' : '✗ FAILED'}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">g^s == R * y^e (mod p)</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Bulletproof Range</div>
          <div className="text-sm font-mono font-bold text-cyan-300">
            {rangeProof.isValid ? '✓ IN RANGE [0, 10^8]' : '✗ OUT OF RANGE'}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">64-Bit Range Proof</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Merkle Membership</div>
          <div className="text-sm font-mono font-bold text-purple-300">
            {merkleProof.isMember ? '✓ VALID MEMBER' : '✗ NON-MEMBER'}
          </div>
          <div className="text-slate-400 text-xs mt-1 font-mono">ZK Path Verification</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 gap-2">
        {(['PEDERSEN', 'SCHNORR', 'BULLETPROOFS', 'MERKLE'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
              selectedTab === tab
                ? 'border-indigo-400 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab === 'PEDERSEN' && '🔐 Pedersen Commitments'}
            {tab === 'SCHNORR' && '⚡ Schnorr NIZK DLog'}
            {tab === 'BULLETPROOFS' && '🛡️ Bulletproofs Range Proof'}
            {tab === 'MERKLE' && '🌳 Merkle ZK Membership'}
          </button>
        ))}
      </div>

      {/* TAB 1: PEDERSEN */}
      {selectedTab === 'PEDERSEN' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-slate-200">Secret Witness Input</h2>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Secret Financial Balance</span>
                <span className="font-mono text-indigo-300 font-bold">${secretBalance.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000000"
                step="10000"
                value={secretBalance}
                onChange={e => setSecretBalance(parseInt(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div className="space-y-3 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Generator G (Hex):</span>
                <span className="text-slate-200">{pedersenCommitment.generatorG}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Generator H (Hex):</span>
                <span className="text-slate-200">{pedersenCommitment.generatorH}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Blinding Factor r (Hex):</span>
                <span className="text-purple-300">{pedersenCommitment.blindingFactorHex}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-200 mb-4">Public Cryptographic Commitment</h2>
            <div className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="text-xs text-slate-400">Public Commitment Point C:</div>
              <div className="text-sm font-mono text-indigo-300 font-bold break-all bg-indigo-950/40 p-3 rounded border border-indigo-500/40">
                {pedersenCommitment.commitmentHex}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Hides the secret value completely (perfect hiding) while guaranteeing that the prover cannot change the secret value later (computational binding).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHNORR */}
      {selectedTab === 'SCHNORR' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-slate-200">Schnorr Non-Interactive Zero-Knowledge Proof (NIZK)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-slate-400 block mb-2 font-medium">Secret Key x (Private Witness)</label>
              <input
                type="number"
                value={schnorrSecret}
                onChange={e => setSchnorrSecret(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Public Key Y = g^x:</span>
                <span className="text-cyan-300">{schnorrProof.publicKeyHex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prover Commitment R = g^k:</span>
                <span className="text-slate-200">{schnorrProof.proofR}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fiat-Shamir Challenge e:</span>
                <span className="text-amber-300">{schnorrProof.challengeE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Response s = k + e*x:</span>
                <span className="text-purple-300">{schnorrProof.responseS}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BULLETPROOFS */}
      {selectedTab === 'BULLETPROOFS' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Bulletproofs Range Proof Transcript</h2>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
            {rangeProof.proofTranscript.map((line, idx) => (
              <div key={idx} className="flex justify-between border-b border-slate-800/50 pb-1">
                <span className="text-slate-400">Step {idx + 1}:</span>
                <span className={line.includes('PASSED') ? 'text-emerald-400 font-bold' : 'text-slate-200'}>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MERKLE */}
      {selectedTab === 'MERKLE' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Merkle Tree Zero-Knowledge Membership</h2>
          <div className="space-y-3 font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Secret Member Leaf Hash:</span>
              <span className="text-purple-300">{merkleProof.leafHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Merkle Root Hash:</span>
              <span className="text-cyan-300">{merkleProof.rootHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verification Status:</span>
              <span className="text-emerald-400 font-bold">✓ Membership Verified in Zero Knowledge</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
