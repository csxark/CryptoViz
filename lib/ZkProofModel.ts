/**
 * Zero-Knowledge Proof Analytics Domain Model.
 * Data structures for ZK-SNARKs, ZK-STARKs, circuits, proof systems, and verification.
 */

export type ProofSystem = 'Groth16' | 'PLONK' | 'Marlin' | 'Bulletproofs' | 'FRI (STARK)' | 'Halo2' | 'Nova';
export type CurveType = 'BN254' | 'BLS12-381' | 'Secp256k1' | 'Pallas/Vesta' | 'MNT4-753';
export type CircuitCategory = 'Identity' | 'Financial' | 'Computation' | 'Voting' | 'Supply Chain' | 'Gaming' | 'Privacy';
export type ProofStatus = 'VERIFIED' | 'PENDING' | 'FAILED' | 'EXPIRED';
export type VerificationLayer = 'On-chain (Ethereum)' | 'On-chain (L2)' | 'Off-chain' | 'Hybrid';

export interface ZkCircuit {
  id: string;
  name: string;
  category: CircuitCategory;
  description: string;
  constraints: number;
  publicInputs: number;
  privateInputs: number;
  provingTimeMs: number;
  verificationTimeMs: number;
  proofSizeBytes: number;
  memoryUsageMb: number;
  proofSystem: ProofSystem;
  curve: CurveType;
  verificationLayer: VerificationLayer;
  status: 'active' | 'deprecated' | 'experimental';
  version: string;
  auditStatus: 'audited' | 'unaudited' | 'in-review';
  githubStars?: number;
  lastUpdated: string;
}

export interface ZkProofRecord {
  id: string;
  circuitId: string;
  circuitName: string;
  proofSystem: ProofSystem;
  proofHash: string;
  publicInputsHash: string;
  provingTimeMs: number;
  verificationTimeMs: number;
  proofSizeBytes: number;
  status: ProofStatus;
  verifierAddress?: string;
  chainId?: number;
  submittedBy: string;
  timestamp: string;
  gasUsed?: number;
  blockNumber?: number;
  failureReason?: string;
}

export interface ZkBenchmarkResult {
  id: string;
  circuitId: string;
  circuitName: string;
  proofSystem: ProofSystem;
  curve: CurveType;
  batchSize: number;
  avgProvingTimeMs: number;
  avgVerificationTimeMs: number;
  avgProofSizeBytes: number;
  throughputProofsPerSec: number;
  memoryPeakMb: number;
  timestamp: string;
}

export interface ZkProtocolStats {
  proofSystem: ProofSystem;
  totalProofs: number;
  verifiedCount: number;
  failedCount: number;
  avgProvingTimeMs: number;
  avgVerificationTimeMs: number;
  avgProofSizeBytes: number;
  totalCircuits: number;
  color: string;
  icon: string;
}

export interface ZkFilterOptions {
  proofSystem: string;
  category: string;
  status: string;
  verificationLayer: string;
  searchQuery: string;
  sortBy: 'time' | 'size' | 'constraints' | 'name';
}

export const PROOF_SYSTEM_COLORS: Record<ProofSystem, string> = {
  'Groth16': '#FF6B6B',
  'PLONK': '#4ECDC4',
  'Marlin': '#45B7D1',
  'Bulletproofs': '#96CEB4',
  'FRI (STARK)': '#FFEAA7',
  'Halo2': '#DDA0DD',
  'Nova': '#F7DC6F',
};

export const PROOF_SYSTEM_ICONS: Record<ProofSystem, string> = {
  'Groth16': '🔐',
  'PLONK': '⚡',
  'Marlin': '🐠',
  'Bulletproofs': '🔫',
  'FRI (STARK)': '🌟',
  'Halo2': '💫',
  'Nova': '🚀',
};

export const CATEGORY_COLORS: Record<CircuitCategory, string> = {
  'Identity': '#627EEA',
  'Financial': '#22c55e',
  'Computation': '#f97316',
  'Voting': '#9333EA',
  'Supply Chain': '#06B6D4',
  'Gaming': '#EC4899',
  'Privacy': '#F7931A',
};

export const STATUS_COLORS: Record<ProofStatus, string> = {
  'VERIFIED': '#22c55e',
  'PENDING': '#eab308',
  'FAILED': '#ef4444',
  'EXPIRED': '#94a3b8',
};
