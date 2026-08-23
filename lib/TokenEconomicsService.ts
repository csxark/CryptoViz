/**
 * Token Economics Service.
 * Generates mock data and provides query/simulation logic.
 */

import {
  TokenProfile,
  VestingSchedule,
  TokenHolder,
  GovernanceProposal,
  SupplyEvent,
  TokenEconomicsFilterOptions,
  TokenEconomicsStats,
} from './TokenEconomicsModel';

function generateHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SEED_TOKENS: TokenProfile[] = [
  { id: 'tok-1', name: 'Ethereum', symbol: 'ETH', type: 'Layer 1', chain: 'Ethereum', totalSupply: 120210000, circulatingSupply: 120210000, currentPrice: 3450, marketCap: 414715000000, fullyDilutedValuation: 414715000000, volume24h: 18500000000, priceChange24h: 2.3, priceChange7d: 5.8, priceChange30d: 12.4, holders: 108500000, transferCount24h: 1250000, burnRate24h: 3200, createdAt: '2015-07-30T00:00:00Z', description: 'Decentralized platform for smart contracts', color: '#627EEA' },
  { id: 'tok-2', name: 'Uniswap', symbol: 'UNI', type: 'DeFi', chain: 'Ethereum', totalSupply: 1000000000, circulatingSupply: 600000000, currentPrice: 12.5, marketCap: 7500000000, fullyDilutedValuation: 12500000000, volume24h: 420000000, priceChange24h: -1.2, priceChange7d: 3.4, priceChange30d: -5.2, holders: 4250000, transferCount24h: 85000, burnRate24h: 0, createdAt: '2020-09-16T00:00:00Z', description: 'Decentralized exchange governance token', color: '#FF007A' },
  { id: 'tok-3', name: 'Aave', symbol: 'AAVE', type: 'DeFi', chain: 'Ethereum', totalSupply: 16000000, circulatingSupply: 14800000, currentPrice: 145, marketCap: 2146000000, fullyDilutedValuation: 2320000000, volume24h: 180000000, priceChange24h: 4.1, priceChange7d: 8.2, priceChange30d: 15.6, holders: 680000, transferCount24h: 12000, burnRate24h: 0, createdAt: '2020-10-02T00:00:00Z', description: 'Decentralized lending protocol', color: '#B6509E' },
  { id: 'tok-4', name: 'Arbitrum', symbol: 'ARB', type: 'Layer 2', chain: 'Arbitrum', totalSupply: 10000000000, circulatingSupply: 3500000000, currentPrice: 1.15, marketCap: 4025000000, fullyDilutedValuation: 11500000000, volume24h: 580000000, priceChange24h: -0.5, priceChange7d: 2.1, priceChange30d: -8.3, holders: 2100000, transferCount24h: 250000, burnRate24h: 0, createdAt: '2023-03-23T00:00:00Z', description: 'Layer 2 scaling solution for Ethereum', color: '#28A0F0' },
  { id: 'tok-5', name: 'Maker', symbol: 'MKR', type: 'Governance', chain: 'Ethereum', totalSupply: 977631, circulatingSupply: 920000, currentPrice: 2850, marketCap: 2622000000, fullyDilutedValuation: 2786000000, volume24h: 95000000, priceChange24h: 1.8, priceChange7d: 4.5, priceChange30d: 9.2, holders: 95000, transferCount24h: 3500, burnRate24h: 150, createdAt: '2017-06-15T00:00:00Z', description: 'DAO governance for DAI stablecoin', color: '#1AAB9B' },
  { id: 'tok-6', name: 'Pepe', symbol: 'PEPE', type: 'Meme', chain: 'Ethereum', totalSupply: 420690000000000, circulatingSupply: 420690000000000, currentPrice: 0.0000125, marketCap: 5258000000, fullyDilutedValuation: 5258000000, volume24h: 2100000000, priceChange24h: 15.2, priceChange7d: -8.5, priceChange30d: 45.3, holders: 380000, transferCount24h: 185000, burnRate24h: 0, createdAt: '2023-04-17T00:00:00Z', description: 'Meme token inspired by Pepe the Frog', color: '#4CAF50' },
];

const SEED_VESTING: VestingSchedule[] = [
  { id: 'vest-1', tokenId: 'tok-2', tokenSymbol: 'UNI', category: 'Team', totalAllocation: 210000000, totalAllocationUsd: 2625000000, unlockedPercent: 75, cliffs: [], startDate: '2020-09-16T00:00:00Z', endDate: '2024-09-16T00:00:00Z', monthlyUnlockAmount: 4375000, nextUnlockDate: '2025-09-16T00:00:00Z', nextUnlockAmount: 4375000 },
  { id: 'vest-2', tokenId: 'tok-2', tokenSymbol: 'UNI', category: 'Investors', totalAllocation: 180000000, totalAllocationUsd: 2250000000, unlockedPercent: 100, cliffs: [], startDate: '2020-09-16T00:00:00Z', endDate: '2023-09-16T00:00:00Z', monthlyUnlockAmount: 5000000, nextUnlockDate: '', nextUnlockAmount: 0 },
  { id: 'vest-3', tokenId: 'tok-2', tokenSymbol: 'UNI', category: 'Ecosystem', totalAllocation: 430000000, totalAllocationUsd: 5375000000, unlockedPercent: 45, cliffs: [], startDate: '2020-09-16T00:00:00Z', endDate: '2028-09-16T00:00:00Z', monthlyUnlockAmount: 4479166, nextUnlockDate: '2025-09-16T00:00:00Z', nextUnlockAmount: 4479166 },
  { id: 'vest-4', tokenId: 'tok-4', tokenSymbol: 'ARB', category: 'Team', totalAllocation: 2694000000, totalAllocationUsd: 3098100000, unlockedPercent: 25, cliffs: [], startDate: '2023-03-23T00:00:00Z', endDate: '2027-03-23T00:00:00Z', monthlyUnlockAmount: 56125000, nextUnlockDate: '2025-09-23T00:00:00Z', nextUnlockAmount: 56125000 },
  { id: 'vest-5', tokenId: 'tok-4', tokenSymbol: 'ARB', category: 'Investors', totalAllocation: 1753000000, totalAllocationUsd: 2015950000, unlockedPercent: 50, cliffs: [], startDate: '2023-03-23T00:00:00Z', endDate: '2026-03-23T00:00:00Z', monthlyUnlockAmount: 48750000, nextUnlockDate: '2025-09-23T00:00:00Z', nextUnlockAmount: 48750000 },
  { id: 'vest-6', tokenId: 'tok-3', tokenSymbol: 'AAVE', category: 'Ecosystem', totalAllocation: 3000000, totalAllocationUsd: 435000000, unlockedPercent: 60, cliffs: [], startDate: '2020-10-02T00:00:00Z', endDate: '2026-10-02T00:00:00Z', monthlyUnlockAmount: 41666, nextUnlockDate: '2025-09-02T00:00:00Z', nextUnlockAmount: 41666 },
];

const SEED_HOLDERS: TokenHolder[] = [
  { id: 'h-1', address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', label: 'Binance Cold Wallet', balance: 2850000, balanceUsd: 9832500000, percentOfSupply: 2.37, transferCount: 234000, lastActivity: '2025-08-24T10:00:00Z', type: 'exchange' },
  { id: 'h-2', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', label: 'Wrapped ETH Contract', balance: 2680000, balanceUsd: 9246000000, percentOfSupply: 2.23, transferCount: 560000, lastActivity: '2025-08-24T11:00:00Z', type: 'contract' },
  { id: 'h-3', address: '0x28C6c06298d514Db089934071355E5743bf21d60', label: 'Binance Hot Wallet', balance: 450000, balanceUsd: 1552500000, percentOfSupply: 0.37, transferCount: 892000, lastActivity: '2025-08-24T11:15:00Z', type: 'exchange' },
  { id: 'h-4', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'Vitalik Buterin', balance: 290000, balanceUsd: 1000500000, percentOfSupply: 0.24, transferCount: 4521, lastActivity: '2025-08-24T09:00:00Z', type: 'whale' },
  { id: 'h-5', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', label: 'Lido Staking Contract', balance: 9800000, balanceUsd: 33810000000, percentOfSupply: 8.15, transferCount: 345000, lastActivity: '2025-08-24T11:10:00Z', type: 'contract' },
];

const SEED_PROPOSALS: GovernanceProposal[] = [
  { id: 'prop-1', proposalNumber: 1, title: 'Increase UNI Delegate Rewards', description: 'Proposal to increase delegate compensation by 20% to attract more participation', type: 'Parameter Change', proposer: '0xuser1', status: 'passed', votesFor: 45000000, votesAgainst: 12000000, votesAbstain: 3000000, totalVoters: 85000, quorumPercent: 6.2, requiredQuorum: 4, startDate: '2025-08-10T00:00:00Z', endDate: '2025-08-17T00:00:00Z', executionDate: '2025-08-20T00:00:00Z', tokenSymbol: 'UNI' },
  { id: 'prop-2', proposalNumber: 2, title: 'Treasury Diversification to Stablecoins', description: 'Convert 5% of treasury ETH to USDC for operational expenses', type: 'Treasury Spend', proposer: '0xuser2', status: 'active', votesFor: 28000000, votesAgainst: 8000000, votesAbstain: 2000000, totalVoters: 42000, quorumPercent: 4.0, requiredQuorum: 4, startDate: '2025-08-20T00:00:00Z', endDate: '2025-08-27T00:00:00Z', tokenSymbol: 'UNI' },
  { id: 'prop-3', proposalNumber: 3, title: 'Deploy Uniswap v4 on Base', description: 'Deploy the new v4 hook-enabled contracts on Base L2', type: 'Protocol Upgrade', proposer: '0xuser3', status: 'active', votesFor: 62000000, votesAgainst: 5000000, votesAbstain: 1500000, totalVoters: 78000, quorumPercent: 5.8, requiredQuorum: 4, startDate: '2025-08-22T00:00:00Z', endDate: '2025-08-29T00:00:00Z', tokenSymbol: 'UNI' },
  { id: 'prop-4', proposalNumber: 15, title: 'AAVE V3 Interest Rate Model Update', description: 'Adjust the interest rate curve for stablecoin borrowing', type: 'Parameter Change', proposer: '0xuser4', status: 'passed', votesFor: 890000, votesAgainst: 45000, votesAbstain: 15000, totalVoters: 12000, quorumPercent: 3.2, requiredQuorum: 2, startDate: '2025-08-01T00:00:00Z', endDate: '2025-08-08T00:00:00Z', executionDate: '2025-08-10T00:00:00Z', tokenSymbol: 'AAVE' },
];

const SEED_EVENTS: SupplyEvent[] = [
  { id: 'evt-1', tokenId: 'tok-5', tokenSymbol: 'MKR', eventType: 'burn', amount: 150, amountUsd: 427500, timestamp: '2025-08-24T10:00:00Z', txHash: generateHash().slice(0, 20), description: 'MakerDAO governance fee burn' },
  { id: 'evt-2', tokenId: 'tok-1', tokenSymbol: 'ETH', eventType: 'burn', amount: 3200, amountUsd: 11040000, timestamp: '2025-08-24T08:00:00Z', txHash: generateHash().slice(0, 20), description: 'EIP-1559 base fee burn' },
  { id: 'evt-3', tokenId: 'tok-4', tokenSymbol: 'ARB', eventType: 'unlock', amount: 56125000, amountUsd: 64543750, timestamp: '2025-08-23T00:00:00Z', txHash: generateHash().slice(0, 20), description: 'Team vesting monthly unlock' },
  { id: 'evt-4', tokenId: 'tok-2', tokenSymbol: 'UNI', eventType: 'lock', amount: 10000000, amountUsd: 125000000, timestamp: '2025-08-22T14:00:00Z', txHash: generateHash().slice(0, 20), description: 'Ecosystem fund lock extension' },
  { id: 'evt-5', tokenId: 'tok-3', tokenSymbol: 'AAVE', eventType: 'burn', amount: 2500, amountUsd: 362500, timestamp: '2025-08-24T06:00:00Z', txHash: generateHash().slice(0, 20), description: 'Safety module burn' },
];

let tokens: TokenProfile[] = [...SEED_TOKENS];
let vesting: VestingSchedule[] = [...SEED_VESTING];
let holders: TokenHolder[] = [...SEED_HOLDERS];
let proposals: GovernanceProposal[] = [...SEED_PROPOSALS];
let events: SupplyEvent[] = [...SEED_EVENTS];

export const TokenEconomicsServiceHandler = {
  fetchTokens(filters: TokenEconomicsFilterOptions): TokenProfile[] {
    let result = [...tokens];
    if (filters.type !== 'All') result = result.filter(t => t.type === filters.type);
    if (filters.chain !== 'All') result = result.filter(t => t.chain === filters.chain);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'mcap': return b.marketCap - a.marketCap;
        case 'volume': return b.volume24h - a.volume24h;
        case 'holders': return b.holders - a.holders;
        case 'price': return b.currentPrice - a.currentPrice;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return result;
  },
  fetchVesting(): VestingSchedule[] { return [...vesting]; },
  fetchHolders(): TokenHolder[] { return [...holders]; },
  fetchProposals(): GovernanceProposal[] { return [...proposals]; },
  fetchEvents(): SupplyEvent[] { return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); },
  getTotalStats(): TokenEconomicsStats {
    return {
      totalTokens: tokens.length,
      totalMarketCap: tokens.reduce((s, t) => s + t.marketCap, 0),
      totalVolume24h: tokens.reduce((s, t) => s + t.volume24h, 0),
      totalHolders: tokens.reduce((s, t) => s + t.holders, 0),
      avgPriceChange24h: parseFloat((tokens.reduce((s, t) => s + t.priceChange24h, 0) / tokens.length).toFixed(2)),
      totalBurned: events.filter(e => e.eventType === 'burn').reduce((s, e) => s + e.amountUsd, 0),
    };
  },
};
