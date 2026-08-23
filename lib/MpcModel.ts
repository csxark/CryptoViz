/**
 * Multi-Party Computation (MPC) Analytics Domain Model.
 * Data structures for MPC protocols, key shards, signing sessions, and security metrics.
 */

export type MpcProtocol = 'GG20' | 'CGGMP21' | 'FROST' | 'Shamir Secret Sharing' | 'SPDZ' | 'Sharemind' | 'ABY3';
export type MpcUseCase = 'Threshold Signatures' | 'Distributed Key Generation' | 'Private Set Intersection' | 'Secure Aggregation' | 'Private Auction' | 'Blind Signatures';
export type MpcStatus = 'ACTIVE' | 'KEYS_GENERATED' | 'SIGNING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type MpcNetwork = 'Ethereum' | 'Bitcoin' | 'Solana' | 'Cosmos' | 'Multi-chain';
export type SecurityLevel = 'standard' | 'high' | 'critical';

export interface MpcKeyShard {
  id: string;
  partyId: number;
  partyName: string;
  shardHash: string;
  createdAt: string;
  status: 'active' | 'rotated' | 'revoked';
  lastUsed: string;
  signingCount: number;
}

export interface MpcSigningSession {
  id: string;
  sessionName: string;
  protocol: MpcProtocol;
  useCase: MpcUseCase;
  requiredParties: number;
  totalParties: number;
  threshold: number;
  participants: MpcParticipant[];
  messageHash: string;
  partialSignatures: number;
  finalSignature?: string;
  network: MpcNetwork;
  contractAddress?: string;
  txHash?: string;
  status: MpcStatus;
  securityLevel: SecurityLevel;
  initiatedAt: string;
  completedAt?: string;
  totalSigningTimeMs?: number;
  roundTrips: number;
  communicationCostKb: number;
  failureReason?: string;
}

export interface MpcParticipant {
  partyId: number;
  partyName: string;
  endpoint: string;
  status: 'online' | 'offline' | 'signing' | 'completed' | 'failed';
  latencyMs: number;
  contributedPartialSig: boolean;
}

export interface MpcKeyGenerationSession {
  id: string;
  sessionName: string;
  protocol: MpcProtocol;
  network: MpcNetwork;
  threshold: number;
  totalParties: number;
  participants: MpcParticipant[];
  publicKey: string;
  address: string;
  status: 'generating' | 'completed' | 'failed';
  initiatedAt: string;
  completedAt?: string;
  totalGenerationTimeMs?: number;
  roundTrips: number;
  communicationCostKb: number;
  shards: MpcKeyShard[];
}

export interface MpcAuditRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  action: 'KEYGEN' | 'SIGN' | 'RESHARE' | 'ROTATE' | 'REVOKE';
  protocol: MpcProtocol;
  network: MpcNetwork;
  parties: number;
  threshold: number;
  durationMs: number;
  communicationCostKb: number;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
}

export interface MpcFilterOptions {
  protocol: string;
  useCase: string;
  network: string;
  status: string;
  searchQuery: string;
  sortBy: 'time' | 'parties' | 'cost' | 'name';
}

export interface MpcProtocolStats {
  protocol: MpcProtocol;
  totalSessions: number;
  completedCount: number;
  failedCount: number;
  avgSigningTimeMs: number;
  avgRoundTrips: number;
  avgCommunicationCostKb: number;
  totalPartiesServed: number;
  color: string;
  icon: string;
}

export const PROTOCOL_COLORS: Record<MpcProtocol, string> = {
  'GG20': '#FF6B6B',
  'CGGMP21': '#4ECDC4',
  'FROST': '#45B7D1',
  'Shamir Secret Sharing': '#96CEB4',
  'SPDZ': '#FFEAA7',
  'Sharemind': '#DDA0DD',
  'ABY3': '#F7DC6F',
};

export const PROTOCOL_ICONS: Record<MpcProtocol, string> = {
  'GG20': '🔐',
  'CGGMP21': '🛡',
  'FROST': '❄',
  'Shamir Secret Sharing': '🔑',
  'SPDZ': '⚡',
  'Sharemind': '🧠',
  'ABY3': '🔗',
};

export const NETWORK_COLORS: Record<MpcNetwork, string> = {
  'Ethereum': '#627EEA',
  'Bitcoin': '#F7931A',
  'Solana': '#9945FF',
  'Cosmos': '#6F7390',
  'Multi-chain': '#00C2AE',
};

export const STATUS_COLORS: Record<MpcStatus, string> = {
  'ACTIVE': '#3b82f6',
  'KEYS_GENERATED': '#22c55e',
  'SIGNING': '#eab308',
  'COMPLETED': '#22c55e',
  'FAILED': '#ef4444',
  'REFUNDED': '#94a3b8',
};

export const SECURITY_COLORS: Record<SecurityLevel, string> = {
  standard: '#22c55e',
  high: '#eab308',
  critical: '#ef4444',
};
