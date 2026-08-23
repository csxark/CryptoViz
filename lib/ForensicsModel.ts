/**
 * Blockchain Forensics Domain Model.
 * Data structures for transaction tracing, address clustering, risk scoring, and investigation workflows.
 */

export type ChainType = 'Ethereum' | 'Bitcoin' | 'BSC' | 'Polygon' | 'Arbitrum' | 'Solana';
export type RiskCategory = 'exchange' | 'mixer' | 'darknet' | 'scam' | 'ransomware' | ' sanctioned' | 'unknown' | 'defi' | 'nft' | 'miner';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type InvestigationStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE';
export type TraceNodeType = 'address' | 'contract' | 'exchange' | 'wallet' | 'mixer' | 'bridge';

export interface AddressProfile {
  id: string;
  address: string;
  chain: ChainType;
  label: string;
  riskCategory: RiskCategory;
  riskScore: number;
  totalInflowUsd: number;
  totalOutflowUsd: number;
  balanceUsd: number;
  transactionCount: number;
  firstSeen: string;
  lastSeen: string;
  isContract: boolean;
  tags: string[];
  associatedEntities: string[];
}

export interface TransactionTrace {
  id: string;
  txHash: string;
  chain: ChainType;
  fromAddress: string;
  fromLabel: string;
  toAddress: string;
  toLabel: string;
  valueUsd: number;
  valueToken: number;
  tokenSymbol: string;
  gasUsed: number;
  gasPriceGwei: number;
  blockNumber: number;
  timestamp: string;
  riskFlags: string[];
  traceDepth: number;
  isSuspicious: boolean;
}

export interface TracePath {
  id: string;
  sourceAddress: string;
  sourceLabel: string;
  targetAddress: string;
  targetLabel: string;
  chain: ChainType;
  totalValueUsd: number;
  hopCount: number;
  transactions: TransactionTrace[];
  riskScore: number;
  riskFlags: string[];
  status: 'tracing' | 'complete' | 'failed';
  initiatedAt: string;
  completedAt?: string;
}

export interface ForensicsAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  chain: ChainType;
  address?: string;
  txHash?: string;
  riskCategory: RiskCategory;
  riskScore: number;
  triggeredAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
}

export interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  leadAnalyst: string;
  assignedTo: string[];
  relatedAddresses: string[];
  relatedTxHashes: string[];
  chain: ChainType;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  findings?: string;
  alertCount: number;
}

export interface ClusterNode {
  id: string;
  address: string;
  label: string;
  type: TraceNodeType;
  riskScore: number;
  balanceUsd: number;
  chain: ChainType;
}

export interface ClusterEdge {
  source: string;
  target: string;
  valueUsd: number;
  txCount: number;
  timestamp: string;
}

export interface ClusterGraph {
  nodes: ClusterNode[];
  edges: ClusterEdge[];
}

export interface ForensicsFilterOptions {
  chain: string;
  riskCategory: string;
  severity: string;
  status: string;
  searchQuery: string;
  sortBy: 'risk' | 'time' | 'value' | 'name';
}

export interface ForensicsStats {
  totalAddresses: number;
  totalAlerts: number;
  activeAlerts: number;
  totalInvestigations: number;
  openInvestigations: number;
  totalTraces: number;
  avgRiskScore: number;
  suspiciousTxCount: number;
}

export const RISK_CATEGORY_COLORS: Record<RiskCategory, string> = {
  'exchange': '#627EEA',
  'mixer': '#ef4444',
  'darknet': '#7c3aed',
  'scam': '#f97316',
  'ransomware': '#dc2626',
  'sanctioned': '#991b1b',
  'unknown': '#94a3b8',
  'defi': '#22c55e',
  'nft': '#ec4899',
  'miner': '#eab308',
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  'critical': '#dc2626',
  'high': '#f97316',
  'medium': '#eab308',
  'low': '#22c55e',
  'info': '#3b82f6',
};

export const CHAIN_COLORS: Record<ChainType, string> = {
  'Ethereum': '#627EEA',
  'Bitcoin': '#F7931A',
  'BSC': '#F0B90B',
  'Polygon': '#8247E5',
  'Arbitrum': '#28A0F0',
  'Solana': '#9945FF',
};

export const STATUS_COLORS: Record<InvestigationStatus, string> = {
  'OPEN': '#f97316',
  'IN_PROGRESS': '#3b82f6',
  'ESCALATED': '#dc2626',
  'CLOSED': '#22c55e',
  'FALSE_POSITIVE': '#94a3b8',
};
