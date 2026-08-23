/**
 * ZK Proof Analytics Service.
 * Generates mock data and provides query/simulation logic.
 */

import {
  ZkCircuit,
  ZkProofRecord,
  ZkBenchmarkResult,
  ZkProtocolStats,
  ZkFilterOptions,
} from './ZkProofModel';

function generateHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SEED_CIRCUITS: ZkCircuit[] = [
  { id: 'cir-1', name: 'Semaphore Identity', category: 'Identity', description: 'Anonymous identity proof using Merkle trees and EdDSA commitments', constraints: 2847, publicInputs: 3, privateInputs: 12, provingTimeMs: 1450, verificationTimeMs: 8, proofSizeBytes: 192, memoryUsageMb: 256, proofSystem: 'Groth16', curve: 'BN254', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '3.1.0', auditStatus: 'audited', githubStars: 4200, lastUpdated: '2025-08-15T00:00:00Z' },
  { id: 'cir-2', name: 'Tornado Cash Withdrawal', category: 'Privacy', description: 'Private withdrawal proof linking deposit commitment to withdrawal address', constraints: 28000, publicInputs: 2, privateInputs: 22, provingTimeMs: 8200, verificationTimeMs: 12, proofSizeBytes: 288, memoryUsageMb: 1024, proofSystem: 'Groth16', curve: 'BN254', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '2.0.1', auditStatus: 'audited', githubStars: 12800, lastUpdated: '2025-07-20T00:00:00Z' },
  { id: 'cir-3', name: 'zkKYC Verification', category: 'Identity', description: 'Zero-knowledge proof of KYC compliance without revealing personal data', constraints: 5420, publicInputs: 4, privateInputs: 18, provingTimeMs: 2100, verificationTimeMs: 6, proofSizeBytes: 224, memoryUsageMb: 512, proofSystem: 'PLONK', curve: 'BLS12-381', verificationLayer: 'On-chain (L2)', status: 'active', version: '1.5.0', auditStatus: 'audited', githubStars: 890, lastUpdated: '2025-08-01T00:00:00Z' },
  { id: 'cir-4', name: 'Private Token Transfer', category: 'Financial', description: 'Shielded ERC-20 transfer with amount and recipient privacy', constraints: 15600, publicInputs: 4, privateInputs: 16, provingTimeMs: 5800, verificationTimeMs: 10, proofSizeBytes: 256, memoryUsageMb: 768, proofSystem: 'PLONK', curve: 'BN254', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '2.3.0', auditStatus: 'audited', githubStars: 3100, lastUpdated: '2025-08-10T00:00:00Z' },
  { id: 'cir-5', name: 'zkRollup Batch Verification', category: 'Computation', description: 'Aggregate proof for batch transaction validity in L2 rollups', constraints: 85000, publicInputs: 8, privateInputs: 64, provingTimeMs: 45000, verificationTimeMs: 15, proofSizeBytes: 448, memoryUsageMb: 4096, proofSystem: 'FRI (STARK)', curve: 'Pallas/Vesta', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '1.0.0', auditStatus: 'audited', githubStars: 8500, lastUpdated: '2025-08-20T00:00:00Z' },
  { id: 'cir-6', name: 'Mixer Withdrawal (Small)', category: 'Privacy', description: 'Fixed-amount mixer withdrawal for small denomination privacy', constraints: 4200, publicInputs: 2, privateInputs: 8, provingTimeMs: 1800, verificationTimeMs: 5, proofSizeBytes: 160, memoryUsageMb: 128, proofSystem: 'Groth16', curve: 'BN254', verificationLayer: 'On-chain (L2)', status: 'active', version: '1.2.0', auditStatus: 'in-review', githubStars: 320, lastUpdated: '2025-08-05T00:00:00Z' },
  { id: 'cir-7', name: 'zkVoting (DAO)', category: 'Voting', description: 'Anonymous weighted voting with eligibility proof for DAO governance', constraints: 7800, publicInputs: 6, privateInputs: 14, provingTimeMs: 3200, verificationTimeMs: 9, proofSizeBytes: 224, memoryUsageMb: 384, proofSystem: 'Marlin', curve: 'BLS12-381', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '0.9.0', auditStatus: 'in-review', githubStars: 560, lastUpdated: '2025-07-28T00:00:00Z' },
  { id: 'cir-8', name: 'Supply Chain Provenance', category: 'Supply Chain', description: 'Prove product origin and custody chain without revealing suppliers', constraints: 12400, publicInputs: 5, privateInputs: 20, provingTimeMs: 4600, verificationTimeMs: 11, proofSizeBytes: 288, memoryUsageMb: 640, proofSystem: 'PLONK', curve: 'BLS12-381', verificationLayer: 'Hybrid', status: 'active', version: '1.1.0', auditStatus: 'audited', githubStars: 410, lastUpdated: '2025-08-12T00:00:00Z' },
  { id: 'cir-9', name: 'zkML Inference Proof', category: 'Computation', description: 'Prove ML model inference correctness without revealing model weights', constraints: 120000, publicInputs: 10, privateInputs: 50, provingTimeMs: 62000, verificationTimeMs: 22, proofSizeBytes: 640, memoryUsageMb: 8192, proofSystem: 'FRI (STARK)', curve: 'Pallas/Vesta', verificationLayer: 'Off-chain', status: 'experimental', version: '0.5.0', auditStatus: 'unaudited', githubStars: 1200, lastUpdated: '2025-08-18T00:00:00Z' },
  { id: 'cir-10', name: 'Gaming State Proof', category: 'Gaming', description: 'Prove game state transitions for verifiable on-chain gaming', constraints: 9200, publicInputs: 3, privateInputs: 12, provingTimeMs: 2800, verificationTimeMs: 7, proofSizeBytes: 192, memoryUsageMb: 256, proofSystem: 'Halo2', curve: 'Pallas/Vesta', verificationLayer: 'On-chain (L2)', status: 'active', version: '1.3.0', auditStatus: 'audited', githubStars: 780, lastUpdated: '2025-08-08T00:00:00Z' },
  { id: 'cir-11', name: 'Range Proof (Bulletproofs)', category: 'Financial', description: 'Non-interactive range proofs for confidential transaction amounts', constraints: 3200, publicInputs: 1, privateInputs: 4, provingTimeMs: 890, verificationTimeMs: 4, proofSizeBytes: 672, memoryUsageMb: 64, proofSystem: 'Bulletproofs', curve: 'Secp256k1', verificationLayer: 'On-chain (Ethereum)', status: 'active', version: '2.0.0', auditStatus: 'audited', githubStars: 6200, lastUpdated: '2025-07-15T00:00:00Z' },
  { id: 'cir-12', name: 'Recursive Proof Aggregation', category: 'Computation', description: 'Nova-based recursive proof folding for incremental computation', constraints: 18000, publicInputs: 6, privateInputs: 32, provingTimeMs: 12000, verificationTimeMs: 5, proofSizeBytes: 320, memoryUsageMb: 1536, proofSystem: 'Nova', curve: 'Pallas/Vesta', verificationLayer: 'Off-chain', status: 'experimental', version: '0.3.0', auditStatus: 'unaudited', githubStars: 950, lastUpdated: '2025-08-22T00:00:00Z' },
];

const SEED_RECORDS: ZkProofRecord[] = [
  { id: 'proof-1', circuitId: 'cir-1', circuitName: 'Semaphore Identity', proofSystem: 'Groth16', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 1420, verificationTimeMs: 7, proofSizeBytes: 192, status: 'VERIFIED', verifierAddress: '0x1234...abcd', chainId: 1, submittedBy: '0xuser1', timestamp: '2025-08-24T10:30:00Z', gasUsed: 245000, blockNumber: 20150000 },
  { id: 'proof-2', circuitId: 'cir-4', circuitName: 'Private Token Transfer', proofSystem: 'PLONK', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 5650, verificationTimeMs: 9, proofSizeBytes: 256, status: 'VERIFIED', verifierAddress: '0x5678...ef01', chainId: 1, submittedBy: '0xuser2', timestamp: '2025-08-24T09:15:00Z', gasUsed: 312000, blockNumber: 20149950 },
  { id: 'proof-3', circuitId: 'cir-2', circuitName: 'Tornado Cash Withdrawal', proofSystem: 'Groth16', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 8100, verificationTimeMs: 11, proofSizeBytes: 288, status: 'VERIFIED', verifierAddress: '0x9abc...def2', chainId: 1, submittedBy: '0xuser3', timestamp: '2025-08-24T08:00:00Z', gasUsed: 458000, blockNumber: 20149900 },
  { id: 'proof-4', circuitId: 'cir-5', circuitName: 'zkRollup Batch Verification', proofSystem: 'FRI (STARK)', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 44200, verificationTimeMs: 14, proofSizeBytes: 448, status: 'VERIFIED', verifierAddress: '0x3456...7890', chainId: 1, submittedBy: '0xsequencer', timestamp: '2025-08-24T07:45:00Z', gasUsed: 1200000, blockNumber: 20149880 },
  { id: 'proof-5', circuitId: 'cir-3', circuitName: 'zkKYC Verification', proofSystem: 'PLONK', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 2050, verificationTimeMs: 5, proofSizeBytes: 224, status: 'FAILED', submittedBy: '0xuser4', timestamp: '2025-08-24T06:30:00Z', failureReason: 'Invalid public input commitment' },
  { id: 'proof-6', circuitId: 'cir-10', circuitName: 'Gaming State Proof', proofSystem: 'Halo2', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 2750, verificationTimeMs: 6, proofSizeBytes: 192, status: 'PENDING', submittedBy: '0xgamer1', timestamp: '2025-08-24T05:20:00Z' },
  { id: 'proof-7', circuitId: 'cir-7', circuitName: 'zkVoting (DAO)', proofSystem: 'Marlin', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 3100, verificationTimeMs: 8, proofSizeBytes: 224, status: 'VERIFIED', verifierAddress: '0xabcd...1234', chainId: 1, submittedBy: '0xvoter1', timestamp: '2025-08-24T04:00:00Z', gasUsed: 189000, blockNumber: 20149800 },
  { id: 'proof-8', circuitId: 'cir-11', circuitName: 'Range Proof (Bulletproofs)', proofSystem: 'Bulletproofs', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 870, verificationTimeMs: 3, proofSizeBytes: 672, status: 'VERIFIED', verifierAddress: '0x5555...aaaa', chainId: 1, submittedBy: '0xuser5', timestamp: '2025-08-23T22:10:00Z', gasUsed: 156000, blockNumber: 20149700 },
  { id: 'proof-9', circuitId: 'cir-9', circuitName: 'zkML Inference Proof', proofSystem: 'FRI (STARK)', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 61500, verificationTimeMs: 21, proofSizeBytes: 640, status: 'PENDING', submittedBy: '0xmlnode', timestamp: '2025-08-23T20:00:00Z' },
  { id: 'proof-10', circuitId: 'cir-8', circuitName: 'Supply Chain Provenance', proofSystem: 'PLONK', proofHash: generateHash(), publicInputsHash: generateHash(), provingTimeMs: 4500, verificationTimeMs: 10, proofSizeBytes: 288, status: 'VERIFIED', verifierAddress: '0xbbbb...cccc', chainId: 137, submittedBy: '0xsupplier', timestamp: '2025-08-23T18:00:00Z', gasUsed: 267000, blockNumber: 55120000 },
];

const SEED_BENCHMARKS: ZkBenchmarkResult[] = [
  { id: 'bench-1', circuitId: 'cir-1', circuitName: 'Semaphore Identity', proofSystem: 'Groth16', curve: 'BN254', batchSize: 1, avgProvingTimeMs: 1450, avgVerificationTimeMs: 8, avgProofSizeBytes: 192, throughputProofsPerSec: 0.69, memoryPeakMb: 256, timestamp: '2025-08-24T00:00:00Z' },
  { id: 'bench-2', circuitId: 'cir-2', circuitName: 'Tornado Cash Withdrawal', proofSystem: 'Groth16', curve: 'BN254', batchSize: 1, avgProvingTimeMs: 8200, avgVerificationTimeMs: 12, avgProofSizeBytes: 288, throughputProofsPerSec: 0.12, memoryPeakMb: 1024, timestamp: '2025-08-24T00:00:00Z' },
  { id: 'bench-3', circuitId: 'cir-4', circuitName: 'Private Token Transfer', proofSystem: 'PLONK', curve: 'BN254', batchSize: 1, avgProvingTimeMs: 5800, avgVerificationTimeMs: 10, avgProofSizeBytes: 256, throughputProofsPerSec: 0.17, memoryPeakMb: 768, timestamp: '2025-08-24T00:00:00Z' },
  { id: 'bench-4', circuitId: 'cir-5', circuitName: 'zkRollup Batch Verification', proofSystem: 'FRI (STARK)', curve: 'Pallas/Vesta', batchSize: 1000, avgProvingTimeMs: 45000, avgVerificationTimeMs: 15, avgProofSizeBytes: 448, throughputProofsPerSec: 22.2, memoryPeakMb: 4096, timestamp: '2025-08-24T00:00:00Z' },
  { id: 'bench-5', circuitId: 'cir-11', circuitName: 'Range Proof (Bulletproofs)', proofSystem: 'Bulletproofs', curve: 'Secp256k1', batchSize: 1, avgProvingTimeMs: 890, avgVerificationTimeMs: 4, avgProofSizeBytes: 672, throughputProofsPerSec: 1.12, memoryPeakMb: 64, timestamp: '2025-08-24T00:00:00Z' },
  { id: 'bench-6', circuitId: 'cir-12', circuitName: 'Recursive Proof Aggregation', proofSystem: 'Nova', curve: 'Pallas/Vesta', batchSize: 100, avgProvingTimeMs: 12000, avgVerificationTimeMs: 5, avgProofSizeBytes: 320, throughputProofsPerSec: 8.33, memoryPeakMb: 1536, timestamp: '2025-08-24T00:00:00Z' },
];

let circuits: ZkCircuit[] = [...SEED_CIRCUITS];
let records: ZkProofRecord[] = [...SEED_RECORDS];
let benchmarks: ZkBenchmarkResult[] = [...SEED_BENCHMARKS];

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ZkProofServiceHandler = {
  fetchCircuits(filters: ZkFilterOptions): ZkCircuit[] {
    let result = [...circuits];

    if (filters.proofSystem !== 'All') {
      result = result.filter(c => c.proofSystem === filters.proofSystem);
    }
    if (filters.category !== 'All') {
      result = result.filter(c => c.category === filters.category);
    }
    if (filters.verificationLayer !== 'All') {
      result = result.filter(c => c.verificationLayer === filters.verificationLayer);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.proofSystem.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'time': return a.provingTimeMs - b.provingTimeMs;
        case 'size': return a.proofSizeBytes - b.proofSizeBytes;
        case 'constraints': return a.constraints - b.constraints;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  },

  fetchRecords(): ZkProofRecord[] {
    return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  fetchBenchmarks(): ZkBenchmarkResult[] {
    return [...benchmarks];
  },

  fetchProtocolStats(): ZkProtocolStats[] {
    const protoColors: Record<string, string> = {
      'Groth16': '#FF6B6B', 'PLONK': '#4ECDC4', 'Marlin': '#45B7D1',
      'Bulletproofs': '#96CEB4', 'FRI (STARK)': '#FFEAA7', 'Halo2': '#DDA0DD', 'Nova': '#F7DC6F',
    };
    const protoIcons: Record<string, string> = {
      'Groth16': '🔐', 'PLONK': '⚡', 'Marlin': '🐠',
      'Bulletproofs': '🔫', 'FRI (STARK)': '🌟', 'Halo2': '💫', 'Nova': '🚀',
    };

    const map = new Map<string, { proofs: number; verified: number; failed: number; provingTime: number; verificationTime: number; proofSize: number; circuits: number }>();
    circuits.forEach(c => {
      const existing = map.get(c.proofSystem) || { proofs: 0, verified: 0, failed: 0, provingTime: 0, verificationTime: 0, proofSize: 0, circuits: 0 };
      existing.circuits += 1;
      existing.provingTime += c.provingTimeMs;
      existing.verificationTime += c.verificationTimeMs;
      existing.proofSize += c.proofSizeBytes;
      map.set(c.proofSystem, existing);
    });
    records.forEach(r => {
      const existing = map.get(r.proofSystem);
      if (existing) {
        existing.proofs += 1;
        if (r.status === 'VERIFIED') existing.verified += 1;
        if (r.status === 'FAILED') existing.failed += 1;
      }
    });

    return Array.from(map.entries()).map(([system, data]) => ({
      proofSystem: system as ZkCircuit['proofSystem'],
      totalProofs: data.proofs,
      verifiedCount: data.verified,
      failedCount: data.failed,
      avgProvingTimeMs: Math.round(data.provingTime / data.circuits),
      avgVerificationTimeMs: Math.round(data.verificationTime / data.circuits),
      avgProofSizeBytes: Math.round(data.proofSize / data.circuits),
      totalCircuits: data.circuits,
      color: protoColors[system] || '#888',
      icon: protoIcons[system] || '📊',
    }));
  },

  getTotalStats() {
    const totalCircuits = circuits.length;
    const totalProofs = records.length;
    const verifiedCount = records.filter(r => r.status === 'VERIFIED').length;
    const avgProvingTime = Math.round(circuits.reduce((s, c) => s + c.provingTimeMs, 0) / circuits.length);
    const avgVerificationTime = Math.round(circuits.reduce((s, c) => s + c.verificationTimeMs, 0) / circuits.length);
    const totalConstraints = circuits.reduce((s, c) => s + c.constraints, 0);
    return {
      totalCircuits,
      totalProofs,
      verifiedCount,
      avgProvingTime,
      avgVerificationTime,
      totalConstraints,
    };
  },

  submitProof(circuitId: string): ZkProofRecord {
    const circuit = circuits.find(c => c.id === circuitId);
    const record: ZkProofRecord = {
      id: generateId(),
      circuitId: circuit?.id || circuitId,
      circuitName: circuit?.name || 'Unknown',
      proofSystem: circuit?.proofSystem || 'Groth16',
      proofHash: generateHash(),
      publicInputsHash: generateHash(),
      provingTimeMs: circuit ? circuit.provingTimeMs + randomBetween(-200, 200) : 1000,
      verificationTimeMs: circuit ? circuit.verificationTimeMs + randomBetween(-1, 2) : 5,
      proofSizeBytes: circuit?.proofSizeBytes || 192,
      status: Math.random() > 0.1 ? 'VERIFIED' : 'PENDING',
      submittedBy: '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: new Date().toISOString(),
      gasUsed: Math.random() > 0.1 ? randomBetween(100000, 500000) : undefined,
    };
    records.push(record);
    return record;
  },
};
