export interface YieldFarmingPool {
  id: string;
  poolName: string;
  dexProtocol: 'Uniswap V3' | 'Curve Finance' | 'Balancer' | 'Raydium' | 'Aerodrome';
  tokenPair: string;
  tvlUsd: number;
  baseApyPercentage: number;
  rewardTokenApyPercentage: number;
  totalApyPercentage: number;
  impermanentLossRisk: 'Low' | 'Moderate' | 'High' | 'Extreme';
  feeTierPercentage: number;
  status: 'active-rewarding' | 'boosted' | 'deprecated';
}

export interface LiquidityPositionRecord {
  id: string;
  poolId: string;
  poolName: string;
  tokenPair: string;
  depositAmountUsd: number;
  earnedRewardsUsd: number;
  estimatedIlPercentage: number;
  depositedTimestamp: string;
  status: 'active-earning' | 'withdrawn';
}

export interface YieldFilterOptions {
  dexProtocol: string;
  impermanentLossRisk: string;
  searchQuery: string;
}

const INITIAL_POOLS: YieldFarmingPool[] = [
  {
    id: "pool-101",
    poolName: "Uniswap V3 WETH/USDC (0.05%)",
    dexProtocol: "Uniswap V3",
    tokenPair: "WETH / USDC",
    tvlUsd: 210000000,
    baseApyPercentage: 14.2,
    rewardTokenApyPercentage: 4.8,
    totalApyPercentage: 19.0,
    impermanentLossRisk: "Moderate",
    feeTierPercentage: 0.05,
    status: "active-rewarding"
  },
  {
    id: "pool-102",
    poolName: "Curve triCrypto2 (BTC/ETH/USDT)",
    dexProtocol: "Curve Finance",
    tokenPair: "WBTC / WETH / USDT",
    tvlUsd: 145000000,
    baseApyPercentage: 8.5,
    rewardTokenApyPercentage: 12.3,
    totalApyPercentage: 20.8,
    impermanentLossRisk: "Low",
    feeTierPercentage: 0.03,
    status: "boosted"
  },
  {
    id: "pool-103",
    poolName: "Raydium SOL/USDC Concentrated",
    dexProtocol: "Raydium",
    tokenPair: "SOL / USDC",
    tvlUsd: 68000000,
    baseApyPercentage: 24.1,
    rewardTokenApyPercentage: 18.5,
    totalApyPercentage: 42.6,
    impermanentLossRisk: "High",
    feeTierPercentage: 0.25,
    status: "active-rewarding"
  }
];

const INITIAL_POSITIONS: LiquidityPositionRecord[] = [
  {
    id: "pos-501",
    poolId: "pool-101",
    poolName: "Uniswap V3 WETH/USDC (0.05%)",
    tokenPair: "WETH / USDC",
    depositAmountUsd: 25000,
    earnedRewardsUsd: 1420,
    estimatedIlPercentage: 0.42,
    depositedTimestamp: "14 days ago",
    status: "active-earning"
  }
];

export class CryptoYieldService {
  private static pools: YieldFarmingPool[] = [...INITIAL_POOLS];
  private static positions: LiquidityPositionRecord[] = [...INITIAL_POSITIONS];

  public static getPools(options?: Partial<YieldFilterOptions>): YieldFarmingPool[] {
    let result = [...this.pools];
    if (!options) return result;

    if (options.dexProtocol && options.dexProtocol !== "All") {
      result = result.filter((p) => p.dexProtocol === options.dexProtocol);
    }

    if (options.impermanentLossRisk && options.impermanentLossRisk !== "All") {
      result = result.filter((p) => p.impermanentLossRisk === options.impermanentLossRisk);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.poolName.toLowerCase().includes(q) ||
          p.tokenPair.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerPool(
    pool: Omit<YieldFarmingPool, "id" | "status">
  ): YieldFarmingPool {
    const newPool: YieldFarmingPool = {
      ...pool,
      id: `pool-${Date.now()}`,
      status: "active-rewarding"
    };
    this.pools.unshift(newPool);
    return newPool;
  }

  public static getPositions(): LiquidityPositionRecord[] {
    return [...this.positions];
  }

  public static depositLiquidity(poolId: string, depositUsd: number): LiquidityPositionRecord {
    const pool = this.pools.find((p) => p.id === poolId);
    if (!pool) throw new Error("Yield farming pool not found.");

    const newPos: LiquidityPositionRecord = {
      id: `pos-${Date.now()}`,
      poolId,
      poolName: pool.poolName,
      tokenPair: pool.tokenPair,
      depositAmountUsd: depositUsd,
      earnedRewardsUsd: 0,
      estimatedIlPercentage: 0.1,
      depositedTimestamp: "Just now",
      status: "active-earning"
    };

    this.positions.unshift(newPos);
    return newPos;
  }
}
