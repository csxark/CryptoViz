/**
 * DeFi Yield Analytics Domain Model.
 * Data structures for yield farming, liquidity pools, and protocol analytics.
 */

export type YieldProtocol = 'Aave V3' | 'Compound V3' | 'Uniswap V3' | 'Curve' | 'Convex' | 'Lido' | 'Rocket Pool' | 'Pendle';
export type AssetCategory = 'Stablecoin' | 'ETH Derivative' | 'BTC Derivative' | 'Blue-chip Token' | 'LP Token' | 'Synthetic';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type PoolStatus = 'ACTIVE' | 'PAUSED' | 'DEPRECATED' | 'EMERGENCY';

export interface YieldPool {
  id: string;
  protocol: YieldProtocol;
  poolName: string;
  assetSymbol: string;
  assetCategory: AssetCategory;
  tvlUsd: number;
  apyPercent: number;
  apyBase: number;
  apyReward: number;
  apyHistory: YieldHistoryPoint[];
  riskLevel: RiskLevel;
  status: PoolStatus;
  impermanentLossRisk: number;
  auditStatus: 'audited' | 'unaudited' | 'in-review';
  chain: string;
  lastUpdated: string;
}

export interface YieldHistoryPoint {
  timestamp: string;
  apy: number;
  tvl: number;
}

export interface YieldFarmingPosition {
  id: string;
  poolId: string;
  protocol: YieldProtocol;
  poolName: string;
  depositedAmountUsd: number;
  depositedAmountToken: number;
  assetSymbol: string;
  currentApy: number;
  earnedUsd: number;
  earnedToken: number;
  entryDate: string;
  lastHarvestDate: string;
  autoCompound: boolean;
  status: 'active' | 'withdrawn';
}

export interface ProtocolStats {
  protocol: YieldProtocol;
  totalTvlUsd: number;
  avgApy: number;
  poolCount: number;
  riskScore: number;
  auditCount: number;
  chain: string;
  color: string;
  icon: string;
}

export interface YieldAuditRecord {
  id: string;
  poolId: string;
  protocol: YieldProtocol;
  poolName: string;
  action: 'DEPOSIT' | 'WITHDRAW' | 'HARVEST' | 'COMPOUND';
  amountUsd: number;
  amountToken: number;
  assetSymbol: string;
  txHash: string;
  gasUsed: number;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  failureReason?: string;
}

export interface YieldFilterOptions {
  protocol: string;
  assetCategory: string;
  riskLevel: string;
  chain: string;
  searchQuery: string;
  sortBy: 'apy' | 'tvl' | 'risk' | 'name';
}

export const CHAIN_OPTIONS = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'BSC'];

export const PROTOCOL_COLORS: Record<YieldProtocol, string> = {
  'Aave V3': '#B6509E',
  'Compound V3': '#00D395',
  'Uniswap V3': '#FF007A',
  'Curve': '#0066FF',
  'Convex': '#3B7CF5',
  'Lido': '#00A3FF',
  'Rocket Pool': '#F98A2A',
  'Pendle': '#1CC1D0',
};

export const PROTOCOL_ICONS: Record<YieldProtocol, string> = {
  'Aave V3': '👻',
  'Compound V3': '🏦',
  'Uniswap V3': '🦄',
  'Curve': '🔵',
  'Convex': '🔷',
  'Lido': '💧',
  'Rocket Pool': '🚀',
  'Pendle': '⏳',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  extreme: '#ef4444',
};

export const ASSET_CATEGORY_COLORS: Record<AssetCategory, string> = {
  'Stablecoin': '#22c55e',
  'ETH Derivative': '#627EEA',
  'BTC Derivative': '#F7931A',
  'Blue-chip Token': '#9333EA',
  'LP Token': '#06B6D4',
  'Synthetic': '#EC4899',
};
