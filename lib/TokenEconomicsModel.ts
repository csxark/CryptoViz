/**
 * Token Economics Domain Model.
 * Data structures for tokenomics analysis, vesting schedules, supply tracking, and governance metrics.
 */

export type TokenType = 'Utility' | 'Governance' | 'Security' | 'Stablecoin' | 'NFT' | 'Meme' | 'DeFi' | 'Layer 1' | 'Layer 2';
export type VestingCategory = 'Team' | 'Investors' | 'Ecosystem' | 'Treasury' | 'Public Sale' | 'Mining/Staking' | 'Advisors' | 'Foundation';
export type DistributionPhase = 'TGE' | 'Cliff' | 'Linear' | 'Milestone' | 'Quarterly';
export type GovernanceProposalType = 'Parameter Change' | 'Treasury Spend' | 'Protocol Upgrade' | 'Partnership' | 'Emission Change';

export interface TokenProfile {
  id: string;
  name: string;
  symbol: string;
  type: TokenType;
  chain: string;
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  currentPrice: number;
  marketCap: number;
  fullyDilutedValuation: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  holders: number;
  transferCount24h: number;
  burnRate24h: number;
  createdAt: string;
  description: string;
  color: string;
}

export interface VestingSchedule {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  category: VestingCategory;
  totalAllocation: number;
  totalAllocationUsd: number;
  unlockedPercent: number;
  cliffs: VestingCliff[];
  startDate: string;
  endDate: string;
  monthlyUnlockAmount: number;
  nextUnlockDate: string;
  nextUnlockAmount: number;
}

export interface VestingCliff {
  id: string;
  date: string;
  amount: number;
  type: DistributionPhase;
  released: boolean;
  percentOfTotal: number;
}

export interface TokenHolder {
  id: string;
  address: string;
  label: string;
  balance: number;
  balanceUsd: number;
  percentOfSupply: number;
  transferCount: number;
  lastActivity: string;
  type: 'whale' | 'exchange' | 'contract' | 'team' | 'retail';
}

export interface GovernanceProposal {
  id: string;
  proposalNumber: number;
  title: string;
  description: string;
  type: GovernanceProposalType;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'pending' | 'executed';
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVoters: number;
  quorumPercent: number;
  requiredQuorum: number;
  startDate: string;
  endDate: string;
  executionDate?: string;
  tokenSymbol: string;
}

export interface SupplyEvent {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  eventType: 'burn' | 'mint' | 'lock' | 'unlock' | 'transfer';
  amount: number;
  amountUsd: number;
  timestamp: string;
  txHash: string;
  description: string;
}

export interface TokenEconomicsFilterOptions {
  type: string;
  chain: string;
  sortBy: 'mcap' | 'volume' | 'holders' | 'price' | 'name';
  searchQuery: string;
}

export interface TokenEconomicsStats {
  totalTokens: number;
  totalMarketCap: number;
  totalVolume24h: number;
  totalHolders: number;
  avgPriceChange24h: number;
  totalBurned: number;
}

export const TOKEN_TYPE_COLORS: Record<TokenType, string> = {
  'Utility': '#627EEA',
  'Governance': '#9333EA',
  'Security': '#dc2626',
  'Stablecoin': '#22c55e',
  'NFT': '#ec4899',
  'Meme': '#F7931A',
  'DeFi': '#00C2AE',
  'Layer 1': '#FF6B6B',
  'Layer 2': '#4ECDC4',
};

export const VESTING_COLORS: Record<VestingCategory, string> = {
  'Team': '#FF6B6B',
  'Investors': '#627EEA',
  'Ecosystem': '#22c55e',
  'Treasury': '#eab308',
  'Public Sale': '#4ECDC4',
  'Mining/Staking': '#f97316',
  'Advisors': '#9333EA',
  'Foundation': '#06B6D4',
};

export const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  'active': '#3b82f6',
  'passed': '#22c55e',
  'rejected': '#ef4444',
  'pending': '#eab308',
  'executed': '#9333EA',
};
