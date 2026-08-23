/**
 * DeFi Yield Analytics Service.
 * Generates mock data and provides query/simulation logic.
 */

import {
  YieldPool,
  YieldFarmingPosition,
  ProtocolStats,
  YieldAuditRecord,
  YieldFilterOptions,
  YieldHistoryPoint,
} from './DefiYieldModel';

function generateApyHistory(baseApy: number, months: number = 12): YieldHistoryPoint[] {
  const history: YieldHistoryPoint[] = [];
  let currentApy = baseApy;
  const now = Date.now();

  for (let i = months; i >= 0; i--) {
    const timestamp = new Date(now - i * 30 * 24 * 60 * 60 * 1000).toISOString();
    const variation = (Math.random() - 0.5) * 4;
    currentApy = Math.max(0.5, currentApy + variation);
    const tvl = Math.random() * 50000000 + 10000000;
    history.push({ timestamp, apy: parseFloat(currentApy.toFixed(2)), tvl: Math.round(tvl) });
  }

  return history;
}

const SEED_POOLS: YieldPool[] = [
  { id: 'pool-1', protocol: 'Aave V3', poolName: 'USDC Lending', assetSymbol: 'USDC', assetCategory: 'Stablecoin', tvlUsd: 2450000000, apyPercent: 4.82, apyBase: 3.45, apyReward: 1.37, apyHistory: generateApyHistory(4.82), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-2', protocol: 'Aave V3', poolName: 'ETH Lending', assetSymbol: 'ETH', assetCategory: 'ETH Derivative', tvlUsd: 1820000000, apyPercent: 3.15, apyBase: 2.20, apyReward: 0.95, apyHistory: generateApyHistory(3.15), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-3', protocol: 'Compound V3', poolName: 'USDC Market', assetSymbol: 'USDC', assetCategory: 'Stablecoin', tvlUsd: 980000000, apyPercent: 4.21, apyBase: 3.10, apyReward: 1.11, apyHistory: generateApyHistory(4.21), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-4', protocol: 'Uniswap V3', poolName: 'ETH/USDC LP', assetSymbol: 'ETH/USDC', assetCategory: 'LP Token', tvlUsd: 420000000, apyPercent: 18.45, apyBase: 12.30, apyReward: 6.15, apyHistory: generateApyHistory(18.45), riskLevel: 'high', status: 'ACTIVE', impermanentLossRisk: 22, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-5', protocol: 'Uniswap V3', poolName: 'WBTC/ETH LP', assetSymbol: 'WBTC/ETH', assetCategory: 'LP Token', tvlUsd: 185000000, apyPercent: 24.70, apyBase: 16.50, apyReward: 8.20, apyHistory: generateApyHistory(24.70), riskLevel: 'high', status: 'ACTIVE', impermanentLossRisk: 28, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-6', protocol: 'Curve', poolName: '3Pool (USDC/USDT/DAI)', assetSymbol: '3CRV', assetCategory: 'Stablecoin', tvlUsd: 780000000, apyPercent: 5.60, apyBase: 2.80, apyReward: 2.80, apyHistory: generateApyHistory(5.60), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0.5, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-7', protocol: 'Curve', poolName: 'stETH/ETH LP', assetSymbol: 'stETH/ETH', assetCategory: 'ETH Derivative', tvlUsd: 1200000000, apyPercent: 3.85, apyBase: 2.10, apyReward: 1.75, apyHistory: generateApyHistory(3.85), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 1, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-8', protocol: 'Convex', poolName: 'CRV/ETH LP', assetSymbol: 'cvxCRV', assetCategory: 'LP Token', tvlUsd: 320000000, apyPercent: 12.40, apyBase: 5.20, apyReward: 7.20, apyHistory: generateApyHistory(12.40), riskLevel: 'moderate', status: 'ACTIVE', impermanentLossRisk: 15, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-9', protocol: 'Lido', poolName: 'stETH Staking', assetSymbol: 'stETH', assetCategory: 'ETH Derivative', tvlUsd: 14500000000, apyPercent: 3.20, apyBase: 3.20, apyReward: 0, apyHistory: generateApyHistory(3.20), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-10', protocol: 'Rocket Pool', poolName: 'rETH Staking', assetSymbol: 'rETH', assetCategory: 'ETH Derivative', tvlUsd: 2800000000, apyPercent: 3.35, apyBase: 3.35, apyReward: 0, apyHistory: generateApyHistory(3.35), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-11', protocol: 'Pendle', poolName: 'PT-eETH', assetSymbol: 'PT-eETH', assetCategory: 'ETH Derivative', tvlUsd: 180000000, apyPercent: 8.90, apyBase: 6.50, apyReward: 2.40, apyHistory: generateApyHistory(8.90), riskLevel: 'moderate', status: 'ACTIVE', impermanentLossRisk: 5, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-12', protocol: 'Pendle', poolName: 'PT-sDAI', assetSymbol: 'PT-sDAI', assetCategory: 'Stablecoin', tvlUsd: 95000000, apyPercent: 6.75, apyBase: 5.10, apyReward: 1.65, apyHistory: generateApyHistory(6.75), riskLevel: 'moderate', status: 'ACTIVE', impermanentLossRisk: 2, auditStatus: 'audited', chain: 'Ethereum', lastUpdated: new Date().toISOString() },
  { id: 'pool-13', protocol: 'Aave V3', poolName: 'USDC (Arbitrum)', assetSymbol: 'USDC', assetCategory: 'Stablecoin', tvlUsd: 420000000, apyPercent: 5.10, apyBase: 3.80, apyReward: 1.30, apyHistory: generateApyHistory(5.10), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Arbitrum', lastUpdated: new Date().toISOString() },
  { id: 'pool-14', protocol: 'Compound V3', poolName: 'USDC (Polygon)', assetSymbol: 'USDC', assetCategory: 'Stablecoin', tvlUsd: 120000000, apyPercent: 3.90, apyBase: 2.70, apyReward: 1.20, apyHistory: generateApyHistory(3.90), riskLevel: 'low', status: 'ACTIVE', impermanentLossRisk: 0, auditStatus: 'audited', chain: 'Polygon', lastUpdated: new Date().toISOString() },
  { id: 'pool-15', protocol: 'Uniswap V3', poolName: 'DAI/USDC (Arbitrum)', assetSymbol: 'DAI/USDC', assetCategory: 'Stablecoin', tvlUsd: 55000000, apyPercent: 7.20, apyBase: 4.50, apyReward: 2.70, apyHistory: generateApyHistory(7.20), riskLevel: 'moderate', status: 'ACTIVE', impermanentLossRisk: 3, auditStatus: 'audited', chain: 'Arbitrum', lastUpdated: new Date().toISOString() },
];

const SEED_POSITIONS: YieldFarmingPosition[] = [
  { id: 'pos-1', poolId: 'pool-9', protocol: 'Lido', poolName: 'stETH Staking', depositedAmountUsd: 52000, depositedAmountToken: 15.8, assetSymbol: 'stETH', currentApy: 3.20, earnedUsd: 1820, earnedToken: 0.56, entryDate: '2025-01-15T00:00:00Z', lastHarvestDate: '2025-08-01T00:00:00Z', autoCompound: true, status: 'active' },
  { id: 'pos-2', poolId: 'pool-1', protocol: 'Aave V3', poolName: 'USDC Lending', depositedAmountUsd: 25000, depositedAmountToken: 25000, assetSymbol: 'USDC', currentApy: 4.82, earnedUsd: 890, earnedToken: 890, entryDate: '2025-03-10T00:00:00Z', lastHarvestDate: '2025-08-15T00:00:00Z', autoCompound: false, status: 'active' },
  { id: 'pos-3', poolId: 'pool-4', protocol: 'Uniswap V3', poolName: 'ETH/USDC LP', depositedAmountUsd: 12000, depositedAmountToken: 3.3, assetSymbol: 'ETH/USDC', currentApy: 18.45, earnedUsd: 1450, earnedToken: 0.4, entryDate: '2025-05-20T00:00:00Z', lastHarvestDate: '2025-08-20T00:00:00Z', autoCompound: true, status: 'active' },
  { id: 'pos-4', poolId: 'pool-6', protocol: 'Curve', poolName: '3Pool (USDC/USDT/DAI)', depositedAmountUsd: 38000, depositedAmountToken: 38000, assetSymbol: '3CRV', currentApy: 5.60, earnedUsd: 1340, earnedToken: 1340, entryDate: '2025-02-01T00:00:00Z', lastHarvestDate: '2025-07-28T00:00:00Z', autoCompound: false, status: 'active' },
  { id: 'pos-5', poolId: 'pool-11', protocol: 'Pendle', poolName: 'PT-eETH', depositedAmountUsd: 8500, depositedAmountToken: 2.6, assetSymbol: 'PT-eETH', currentApy: 8.90, earnedUsd: 520, earnedToken: 0.16, entryDate: '2025-06-05T00:00:00Z', lastHarvestDate: '2025-08-10T00:00:00Z', autoCompound: true, status: 'active' },
];

const SEED_RECORDS: YieldAuditRecord[] = [
  { id: 'rec-1', poolId: 'pool-9', protocol: 'Lido', poolName: 'stETH Staking', action: 'DEPOSIT', amountUsd: 52000, amountToken: 15.8, assetSymbol: 'stETH', txHash: '0xabc123...', gasUsed: 145000, timestamp: '2025-01-15T10:30:00Z', status: 'SUCCESS' },
  { id: 'rec-2', poolId: 'pool-1', protocol: 'Aave V3', poolName: 'USDC Lending', action: 'DEPOSIT', amountUsd: 25000, amountToken: 25000, assetSymbol: 'USDC', txHash: '0xdef456...', gasUsed: 98000, timestamp: '2025-03-10T14:20:00Z', status: 'SUCCESS' },
  { id: 'rec-3', poolId: 'pool-9', protocol: 'Lido', poolName: 'stETH Staking', action: 'HARVEST', amountUsd: 1820, amountToken: 0.56, assetSymbol: 'stETH', txHash: '0xghi789...', gasUsed: 62000, timestamp: '2025-08-01T08:15:00Z', status: 'SUCCESS' },
  { id: 'rec-4', poolId: 'pool-4', protocol: 'Uniswap V3', poolName: 'ETH/USDC LP', action: 'DEPOSIT', amountUsd: 12000, amountToken: 3.3, assetSymbol: 'ETH/USDC', txHash: '0xjkl012...', gasUsed: 210000, timestamp: '2025-05-20T16:45:00Z', status: 'SUCCESS' },
  { id: 'rec-5', poolId: 'pool-6', protocol: 'Curve', poolName: '3Pool (USDC/USDT/DAI)', action: 'HARVEST', amountUsd: 670, amountToken: 670, assetSymbol: '3CRV', txHash: '0xmno345...', gasUsed: 180000, timestamp: '2025-07-28T12:00:00Z', status: 'SUCCESS' },
  { id: 'rec-6', poolId: 'pool-4', protocol: 'Uniswap V3', poolName: 'ETH/USDC LP', action: 'HARVEST', amountUsd: 1450, amountToken: 0.4, assetSymbol: 'ETH/USDC', txHash: '0xpqr678...', gasUsed: 195000, timestamp: '2025-08-20T09:30:00Z', status: 'SUCCESS' },
  { id: 'rec-7', poolId: 'pool-11', protocol: 'Pendle', poolName: 'PT-eETH', action: 'COMPOUND', amountUsd: 520, amountToken: 0.16, assetSymbol: 'PT-eETH', txHash: '0xstu901...', gasUsed: 142000, timestamp: '2025-08-10T11:00:00Z', status: 'SUCCESS' },
];

let pools: YieldPool[] = [...SEED_POOLS];
let positions: YieldFarmingPosition[] = [...SEED_POSITIONS];
let records: YieldAuditRecord[] = [...SEED_RECORDS];

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTxHash(): string {
  return '0x' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const DefiYieldServiceHandler = {
  fetchPools(filters: YieldFilterOptions): YieldPool[] {
    let result = [...pools];

    if (filters.protocol !== 'All') {
      result = result.filter(p => p.protocol === filters.protocol);
    }
    if (filters.assetCategory !== 'All') {
      result = result.filter(p => p.assetCategory === filters.assetCategory);
    }
    if (filters.riskLevel !== 'All') {
      result = result.filter(p => p.riskLevel === filters.riskLevel);
    }
    if (filters.chain !== 'All') {
      result = result.filter(p => p.chain === filters.chain);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.poolName.toLowerCase().includes(q) ||
        p.assetSymbol.toLowerCase().includes(q) ||
        p.protocol.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'apy': return b.apyPercent - a.apyPercent;
        case 'tvl': return b.tvlUsd - a.tvlUsd;
        case 'risk': return a.impermanentLossRisk - b.impermanentLossRisk;
        case 'name': return a.poolName.localeCompare(b.poolName);
        default: return 0;
      }
    });

    return result;
  },

  fetchPositions(): YieldFarmingPosition[] {
    return [...positions];
  },

  fetchAuditRecords(): YieldAuditRecord[] {
    return [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  fetchProtocolStats(): ProtocolStats[] {
    const protocolMap = new Map<string, { tvl: number; apy: number; count: number; risk: number }>();
    pools.forEach(pool => {
      const existing = protocolMap.get(pool.protocol) || { tvl: 0, apy: 0, count: 0, risk: 0 };
      existing.tvl += pool.tvlUsd;
      existing.apy += pool.apyPercent;
      existing.count += 1;
      existing.risk += pool.impermanentLossRisk;
      protocolMap.set(pool.protocol, existing);
    });

    const protoColors: Record<string, string> = {
      'Aave V3': '#B6509E', 'Compound V3': '#00D395', 'Uniswap V3': '#FF007A',
      'Curve': '#0066FF', 'Convex': '#3B7CF5', 'Lido': '#00A3FF',
      'Rocket Pool': '#F98A2A', 'Pendle': '#1CC1D0',
    };
    const protoIcons: Record<string, string> = {
      'Aave V3': '👻', 'Compound V3': '🏦', 'Uniswap V3': '🦄',
      'Curve': '🔵', 'Convex': '🔷', 'Lido': '💧',
      'Rocket Pool': '🚀', 'Pendle': '⏳',
    };

    return Array.from(protocolMap.entries()).map(([protocol, data]) => ({
      protocol: protocol as YieldPool['protocol'],
      totalTvlUsd: data.tvl,
      avgApy: parseFloat((data.apy / data.count).toFixed(2)),
      poolCount: data.count,
      riskScore: parseFloat((data.risk / data.count).toFixed(1)),
      auditCount: data.count,
      chain: 'Ethereum',
      color: protoColors[protocol] || '#888',
      icon: protoIcons[protocol] || '📊',
    }));
  },

  getTotalStats() {
    const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0);
    const avgApy = pools.reduce((s, p) => s + p.apyPercent, 0) / pools.length;
    const totalPositionValue = positions.reduce((s, p) => s + p.depositedAmountUsd, 0);
    const totalEarned = positions.reduce((s, p) => s + p.earnedUsd, 0);
    return {
      totalTvl,
      avgApy: parseFloat(avgApy.toFixed(2)),
      poolCount: pools.length,
      positionCount: positions.length,
      totalPositionValue,
      totalEarned,
    };
  },

  depositToPool(poolId: string, amountUsd: number): YieldFarmingPosition | null {
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return null;

    const tokenAmount = amountUsd / 100;
    const position: YieldFarmingPosition = {
      id: generateId(),
      poolId: pool.id,
      protocol: pool.protocol,
      poolName: pool.poolName,
      depositedAmountUsd: amountUsd,
      depositedAmountToken: tokenAmount,
      assetSymbol: pool.assetSymbol,
      currentApy: pool.apyPercent,
      earnedUsd: 0,
      earnedToken: 0,
      entryDate: new Date().toISOString(),
      lastHarvestDate: new Date().toISOString(),
      autoCompound: false,
      status: 'active',
    };
    positions.push(position);

    const record: YieldAuditRecord = {
      id: generateId(),
      poolId: pool.id,
      protocol: pool.protocol,
      poolName: pool.poolName,
      action: 'DEPOSIT',
      amountUsd,
      amountToken: tokenAmount,
      assetSymbol: pool.assetSymbol,
      txHash: generateTxHash(),
      gasUsed: Math.floor(Math.random() * 150000) + 80000,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    };
    records.push(record);

    return position;
  },

  withdrawFromPool(positionId: string): YieldAuditRecord | null {
    const position = positions.find(p => p.id === positionId && p.status === 'active');
    if (!position) return null;

    position.status = 'withdrawn';

    const record: YieldAuditRecord = {
      id: generateId(),
      poolId: position.poolId,
      protocol: position.protocol,
      poolName: position.poolName,
      action: 'WITHDRAW',
      amountUsd: position.depositedAmountUsd + position.earnedUsd,
      amountToken: position.depositedAmountToken + position.earnedToken,
      assetSymbol: position.assetSymbol,
      txHash: generateTxHash(),
      gasUsed: Math.floor(Math.random() * 120000) + 60000,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    };
    records.push(record);

    return record;
  },

  harvestYield(positionId: string): YieldAuditRecord | null {
    const position = positions.find(p => p.id === positionId && p.status === 'active');
    if (!position || position.earnedUsd <= 0) return null;

    const earned = position.earnedUsd;
    position.earnedUsd = 0;
    position.earnedToken = 0;
    position.lastHarvestDate = new Date().toISOString();

    const record: YieldAuditRecord = {
      id: generateId(),
      poolId: position.poolId,
      protocol: position.protocol,
      poolName: position.poolName,
      action: 'HARVEST',
      amountUsd: earned,
      amountToken: earned / 100,
      assetSymbol: position.assetSymbol,
      txHash: generateTxHash(),
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    };
    records.push(record);

    return record;
  },
};
