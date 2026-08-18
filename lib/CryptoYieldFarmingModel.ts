export interface LiquidityPool {
  id: string;
  poolName: string;
  protocol: 'Uniswap V3' | 'Curve Finance' | 'Balancer' | 'PancakeSwap' | 'SushiSwap';
  pairSymbols: string[];
  totalValueLockedUsd: number;
  apyPercentage: number;
  impermanentLossRisk: 'low' | 'moderate' | 'high' | 'severe';
  dailyFeeYieldUsd: number;
  stakedLpTokens: number;
  status: 'active' | 'harvest-available' | 'paused';
}

export interface YieldHarvestRecord {
  id: string;
  poolId: string;
  poolName: string;
  rewardTokenSymbol: string;
  harvestedAmount: number;
  valueUsd: number;
  transactionHash: string;
  harvestDate: string;
  status: 'claimed' | 'pending-claim' | 'auto-compounded';
}

export interface PoolFilterOptions {
  protocol: string;
  impermanentLossRisk: string;
  searchQuery: string;
}

const INITIAL_POOLS: LiquidityPool[] = [
  {
    id: "pool-101",
    poolName: "ETH / USDC Concentrated Liquidity",
    protocol: "Uniswap V3",
    pairSymbols: ["ETH", "USDC"],
    totalValueLockedUsd: 125000000,
    apyPercentage: 34.2,
    impermanentLossRisk: "moderate",
    dailyFeeYieldUsd: 1420,
    stakedLpTokens: 42.5,
    status: "harvest-available",
  },
  {
    id: "pool-102",
    poolName: "3pool (DAI / USDC / USDT)",
    protocol: "Curve Finance",
    pairSymbols: ["DAI", "USDC", "USDT"],
    totalValueLockedUsd: 450000000,
    apyPercentage: 8.7,
    impermanentLossRisk: "low",
    dailyFeeYieldUsd: 380,
    stakedLpTokens: 150.0,
    status: "active",
  },
  {
    id: "pool-103",
    poolName: "WBTC / ETH 80/20 Vault",
    protocol: "Balancer",
    pairSymbols: ["WBTC", "ETH"],
    totalValueLockedUsd: 89000000,
    apyPercentage: 22.4,
    impermanentLossRisk: "high",
    dailyFeeYieldUsd: 890,
    stakedLpTokens: 18.2,
    status: "harvest-available",
  },
];

const INITIAL_HARVESTS: YieldHarvestRecord[] = [
  {
    id: "harv-201",
    poolId: "pool-101",
    poolName: "ETH / USDC Concentrated Liquidity",
    rewardTokenSymbol: "UNI",
    harvestedAmount: 245.8,
    valueUsd: 1720,
    transactionHash: "0x8f4a...92b1",
    harvestDate: "Aug 18, 2026",
    status: "claimed",
  },
];

export class CryptoYieldFarmingService {
  private static pools: LiquidityPool[] = [...INITIAL_POOLS];
  private static harvests: YieldHarvestRecord[] = [...INITIAL_HARVESTS];

  public static getPools(options?: Partial<PoolFilterOptions>): LiquidityPool[] {
    let result = [...this.pools];
    if (!options) return result;

    if (options.protocol && options.protocol !== "All") {
      result = result.filter((p) => p.protocol === options.protocol);
    }

    if (options.impermanentLossRisk && options.impermanentLossRisk !== "All") {
      result = result.filter((p) => p.impermanentLossRisk === options.impermanentLossRisk);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.poolName.toLowerCase().includes(q) ||
          p.pairSymbols.some((s) => s.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public static getPoolById(id: string): LiquidityPool | undefined {
    return this.pools.find((p) => p.id === id);
  }

  public static createLiquidityPool(
    pool: Omit<LiquidityPool, "id">
  ): LiquidityPool {
    const newPool: LiquidityPool = {
      ...pool,
      id: `pool-${Date.now()}`,
    };
    this.pools.unshift(newPool);
    return newPool;
  }

  public static getHarvestHistory(): YieldHarvestRecord[] {
    return [...this.harvests];
  }

  public static claimPoolRewards(
    poolId: string,
    rewardTokenSymbol: string,
    harvestedAmount: number
  ): YieldHarvestRecord {
    const pool = this.getPoolById(poolId);
    if (!pool) throw new Error("Liquidity pool profile not found.");

    const valueUsd = Math.round(harvestedAmount * 8.5);

    const newHarvest: YieldHarvestRecord = {
      id: `harv-${Date.now()}`,
      poolId,
      poolName: pool.poolName,
      rewardTokenSymbol,
      harvestedAmount,
      valueUsd,
      transactionHash: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      harvestDate: "Just now",
      status: "claimed",
    };

    this.harvests.unshift(newHarvest);
    return newHarvest;
  }
}
