/**
 * MPC Analytics Service.
 * Generates mock data and provides query/simulation logic.
 */

import {
  MpcSigningSession,
  MpcKeyGenerationSession,
  MpcAuditRecord,
  MpcProtocolStats,
  MpcFilterOptions,
  MpcParticipant,
  MpcKeyShard,
} from './MpcModel';

function generateHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createParticipants(count: number, names: string[]): MpcParticipant[] {
  return names.slice(0, count).map((name, i) => ({
    partyId: i + 1,
    partyName: name,
    endpoint: `mpc-${name.toLowerCase().replace(/\s/g, '-')}.node.io`,
    status: 'online' as const,
    latencyMs: randomBetween(15, 120),
    contributedPartialSig: false,
  }));
}

const PARTY_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'];

const SEED_SIGNING_SESSIONS: MpcSigningSession[] = [
  {
    id: 'sign-1', sessionName: 'ETH Transfer (High Value)', protocol: 'GG20', useCase: 'Threshold Signatures',
    requiredParties: 3, totalParties: 5, threshold: 3,
    participants: createParticipants(5, PARTY_NAMES),
    messageHash: generateHash(), partialSignatures: 3, finalSignature: generateHash(),
    network: 'Ethereum', contractAddress: '0x1234...abcd',
    txHash: '0xtx1...', status: 'COMPLETED', securityLevel: 'critical',
    initiatedAt: '2025-08-24T10:00:00Z', completedAt: '2025-08-24T10:02:30Z',
    totalSigningTimeMs: 150000, roundTrips: 4, communicationCostKb: 128,
  },
  {
    id: 'sign-2', sessionName: 'BTC Multi-Sig Withdrawal', protocol: 'FROST', useCase: 'Threshold Signatures',
    requiredParties: 2, totalParties: 3, threshold: 2,
    participants: createParticipants(3, PARTY_NAMES),
    messageHash: generateHash(), partialSignatures: 2, finalSignature: generateHash(),
    network: 'Bitcoin', txHash: 'btc-tx1...',
    status: 'COMPLETED', securityLevel: 'high',
    initiatedAt: '2025-08-24T09:30:00Z', completedAt: '2025-08-24T09:31:15Z',
    totalSigningTimeMs: 75000, roundTrips: 2, communicationCostKb: 64,
  },
  {
    id: 'sign-3', sessionName: 'DeFi Protocol Update', protocol: 'CGGMP21', useCase: 'Threshold Signatures',
    requiredParties: 4, totalParties: 7, threshold: 5,
    participants: createParticipants(7, PARTY_NAMES),
    messageHash: generateHash(), partialSignatures: 4,
    network: 'Ethereum', contractAddress: '0x5678...ef01',
    status: 'ACTIVE', securityLevel: 'critical',
    initiatedAt: '2025-08-24T11:00:00Z',
    roundTrips: 2, communicationCostKb: 96,
  },
  {
    id: 'sign-4', sessionName: 'Solana Token Mint', protocol: 'GG20', useCase: 'Blind Signatures',
    requiredParties: 3, totalParties: 4, threshold: 3,
    participants: createParticipants(4, PARTY_NAMES),
    messageHash: generateHash(), partialSignatures: 1,
    network: 'Solana',
    status: 'SIGNING', securityLevel: 'high',
    initiatedAt: '2025-08-24T11:15:00Z',
    roundTrips: 1, communicationCostKb: 48,
  },
  {
    id: 'sign-5', sessionName: 'DAO Treasury Move', protocol: 'FROST', useCase: 'Threshold Signatures',
    requiredParties: 3, totalParties: 5, threshold: 3,
    participants: createParticipants(5, PARTY_NAMES),
    messageHash: generateHash(), partialSignatures: 0,
    network: 'Ethereum', contractAddress: '0x9abc...def2',
    status: 'FAILED', securityLevel: 'critical', failureReason: 'Party Carol went offline during round 2',
    initiatedAt: '2025-08-24T08:00:00Z',
    roundTrips: 1, communicationCostKb: 32,
  },
];

const SEED_KEYGEN_SESSIONS: MpcKeyGenerationSession[] = [
  {
    id: 'kg-1', sessionName: 'Hot Wallet Keys (ETH)', protocol: 'GG20', network: 'Ethereum',
    threshold: 3, totalParties: 5,
    participants: createParticipants(5, PARTY_NAMES),
    publicKey: generateHash(), address: '0xkey1...',
    status: 'completed', initiatedAt: '2025-08-23T14:00:00Z', completedAt: '2025-08-23T14:03:00Z',
    totalGenerationTimeMs: 180000, roundTrips: 6, communicationCostKb: 256,
    shards: Array.from({ length: 5 }, (_, i) => ({
      id: `shard-${i}`, partyId: i + 1, partyName: PARTY_NAMES[i], shardHash: generateHash().slice(0, 18),
      createdAt: '2025-08-23T14:03:00Z', status: 'active' as const, lastUsed: '2025-08-24T10:00:00Z', signingCount: randomBetween(5, 50),
    })),
  },
  {
    id: 'kg-2', sessionName: 'Cold Storage Keys (BTC)', protocol: 'FROST', network: 'Bitcoin',
    threshold: 2, totalParties: 3,
    participants: createParticipants(3, PARTY_NAMES),
    publicKey: generateHash(), address: 'btc-key1...',
    status: 'completed', initiatedAt: '2025-08-22T10:00:00Z', completedAt: '2025-08-22T10:01:45Z',
    totalGenerationTimeMs: 105000, roundTrips: 4, communicationCostKb: 128,
    shards: Array.from({ length: 3 }, (_, i) => ({
      id: `shard-btc-${i}`, partyId: i + 1, partyName: PARTY_NAMES[i], shardHash: generateHash().slice(0, 18),
      createdAt: '2025-08-22T10:01:45Z', status: 'active' as const, lastUsed: '2025-08-24T09:30:00Z', signingCount: randomBetween(2, 20),
    })),
  },
  {
    id: 'kg-3', sessionName: 'DeFi Governance Keys', protocol: 'CGGMP21', network: 'Multi-chain',
    threshold: 4, totalParties: 7,
    participants: createParticipants(7, PARTY_NAMES),
    publicKey: generateHash(), address: '0xgov1...',
    status: 'completed', initiatedAt: '2025-08-20T08:00:00Z', completedAt: '2025-08-20T08:05:00Z',
    totalGenerationTimeMs: 300000, roundTrips: 8, communicationCostKb: 512,
    shards: Array.from({ length: 7 }, (_, i) => ({
      id: `shard-gov-${i}`, partyId: i + 1, partyName: PARTY_NAMES[i], shardHash: generateHash().slice(0, 18),
      createdAt: '2025-08-20T08:05:00Z', status: i < 6 ? 'active' as const : 'rotated' as const, lastUsed: '2025-08-24T11:00:00Z', signingCount: randomBetween(10, 80),
    })),
  },
];

const SEED_RECORDS: MpcAuditRecord[] = [
  { id: 'rec-1', sessionId: 'sign-1', sessionName: 'ETH Transfer (High Value)', action: 'SIGN', protocol: 'GG20', network: 'Ethereum', parties: 5, threshold: 3, durationMs: 150000, communicationCostKb: 128, timestamp: '2025-08-24T10:02:30Z', status: 'SUCCESS' },
  { id: 'rec-2', sessionId: 'kg-1', sessionName: 'Hot Wallet Keys (ETH)', action: 'KEYGEN', protocol: 'GG20', network: 'Ethereum', parties: 5, threshold: 3, durationMs: 180000, communicationCostKb: 256, timestamp: '2025-08-23T14:03:00Z', status: 'SUCCESS' },
  { id: 'rec-3', sessionId: 'sign-2', sessionName: 'BTC Multi-Sig Withdrawal', action: 'SIGN', protocol: 'FROST', network: 'Bitcoin', parties: 3, threshold: 2, durationMs: 75000, communicationCostKb: 64, timestamp: '2025-08-24T09:31:15Z', status: 'SUCCESS' },
  { id: 'rec-4', sessionId: 'sign-5', sessionName: 'DAO Treasury Move', action: 'SIGN', protocol: 'FROST', network: 'Ethereum', parties: 5, threshold: 3, durationMs: 45000, communicationCostKb: 32, timestamp: '2025-08-24T08:00:45Z', status: 'FAILED', failureReason: 'Party Carol went offline during round 2' },
  { id: 'rec-5', sessionId: 'kg-2', sessionName: 'Cold Storage Keys (BTC)', action: 'KEYGEN', protocol: 'FROST', network: 'Bitcoin', parties: 3, threshold: 2, durationMs: 105000, communicationCostKb: 128, timestamp: '2025-08-22T10:01:45Z', status: 'SUCCESS' },
  { id: 'rec-6', sessionId: 'kg-3', sessionName: 'DeFi Governance Keys', action: 'KEYGEN', protocol: 'CGGMP21', network: 'Multi-chain', parties: 7, threshold: 4, durationMs: 300000, communicationCostKb: 512, timestamp: '2025-08-20T08:05:00Z', status: 'SUCCESS' },
  { id: 'rec-7', sessionId: 'sign-1', sessionName: 'ETH Transfer (High Value)', action: 'RESHARE', protocol: 'GG20', network: 'Ethereum', parties: 5, threshold: 3, durationMs: 120000, communicationCostKb: 96, timestamp: '2025-08-23T16:00:00Z', status: 'SUCCESS' },
];

let signingSessions: MpcSigningSession[] = [...SEED_SIGNING_SESSIONS];
let keygenSessions: MpcKeyGenerationSession[] = [...SEED_KEYGEN_SESSIONS];
let records: MpcAuditRecord[] = [...SEED_RECORDS];

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const MpcServiceHandler = {
  fetchSigningSessions(filters: MpcFilterOptions): MpcSigningSession[] {
    let result = [...signingSessions];
    if (filters.protocol !== 'All') result = result.filter(s => s.protocol === filters.protocol);
    if (filters.useCase !== 'All') result = result.filter(s => s.useCase === filters.useCase);
    if (filters.network !== 'All') result = result.filter(s => s.network === filters.network);
    if (filters.status !== 'All') result = result.filter(s => s.status === filters.status);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(s => s.sessionName.toLowerCase().includes(q) || s.protocol.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'time': return (b.totalSigningTimeMs || 0) - (a.totalSigningTimeMs || 0);
        case 'parties': return b.totalParties - a.totalParties;
        case 'cost': return b.communicationCostKb - a.communicationCostKb;
        case 'name': return a.sessionName.localeCompare(b.sessionName);
        default: return 0;
      }
    });
    return result;
  },

  fetchKeygenSessions(): MpcKeyGenerationSession[] { return [...keygenSessions]; },
  fetchAuditRecords(): MpcAuditRecord[] { return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); },

  fetchProtocolStats(): MpcProtocolStats[] {
    const protoColors: Record<string, string> = { 'GG20': '#FF6B6B', 'CGGMP21': '#4ECDC4', 'FROST': '#45B7D1', 'Shamir Secret Sharing': '#96CEB4', 'SPDZ': '#FFEAA7', 'Sharemind': '#DDA0DD', 'ABY3': '#F7DC6F' };
    const protoIcons: Record<string, string> = { 'GG20': '🔐', 'CGGMP21': '🛡', 'FROST': '❄', 'Shamir Secret Sharing': '🔑', 'SPDZ': '⚡', 'Sharemind': '🧠', 'ABY3': '🔗' };

    const map = new Map<string, { sessions: number; completed: number; failed: number; signingTime: number; roundTrips: number; commCost: number; parties: number }>();
    [...signingSessions, ...keygenSessions.map(k => ({ ...k, totalSigningTimeMs: k.totalGenerationTimeMs, useCase: 'Distributed Key Generation' as const }))].forEach(s => {
      const existing = map.get(s.protocol) || { sessions: 0, completed: 0, failed: 0, signingTime: 0, roundTrips: 0, commCost: 0, parties: 0 };
      existing.sessions += 1;
      if (s.status === 'COMPLETED' || s.status === 'KEYS_GENERATED') existing.completed += 1;
      if (s.status === 'FAILED') existing.failed += 1;
      existing.signingTime += s.totalSigningTimeMs || 0;
      existing.roundTrips += s.roundTrips;
      existing.commCost += s.communicationCostKb;
      existing.parties += s.totalParties;
      map.set(s.protocol, existing);
    });

    return Array.from(map.entries()).map(([protocol, data]) => ({
      protocol: protocol as MpcSigningSession['protocol'],
      totalSessions: data.sessions,
      completedCount: data.completed,
      failedCount: data.failed,
      avgSigningTimeMs: Math.round(data.signingTime / data.sessions),
      avgRoundTrips: parseFloat((data.roundTrips / data.sessions).toFixed(1)),
      avgCommunicationCostKb: Math.round(data.commCost / data.sessions),
      totalPartiesServed: data.parties,
      color: protoColors[protocol] || '#888',
      icon: protoIcons[protocol] || '📊',
    }));
  },

  getTotalStats() {
    const totalSigningSessions = signingSessions.length;
    const totalKeygenSessions = keygenSessions.length;
    const completedCount = signingSessions.filter(s => s.status === 'COMPLETED').length + keygenSessions.filter(s => s.status === 'completed').length;
    const totalParties = keygenSessions.reduce((s, k) => s + k.shards.length, 0);
    const avgSigningTime = signingSessions.filter(s => s.totalSigningTimeMs).reduce((s, v, _, a) => s + (v.totalSigningTimeMs || 0) / a.length, 0);
    return { totalSigningSessions, totalKeygenSessions, completedCount, totalParties, avgSigningTime: Math.round(avgSigningTime) };
  },

  submitSigning(sessionId: string): MpcSigningSession | null {
    const session = signingSessions.find(s => s.id === sessionId);
    if (!session) return null;
    const record: MpcAuditRecord = {
      id: generateId(), sessionId: session.id, sessionName: session.sessionName, action: 'SIGN',
      protocol: session.protocol, network: session.network, parties: session.totalParties,
      threshold: session.threshold, durationMs: randomBetween(50000, 200000),
      communicationCostKb: randomBetween(32, 256), timestamp: new Date().toISOString(), status: 'SUCCESS',
    };
    records.push(record);
    return session;
  },
};
