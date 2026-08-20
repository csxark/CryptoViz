import {
  CryptoYieldService,
  YieldFarmingPool,
  LiquidityPositionRecord,
  YieldFilterOptions
} from "./CryptoYieldModel";

export class CryptoYieldServiceHandler {
  public static fetchPools(filters?: Partial<YieldFilterOptions>): YieldFarmingPool[] {
    return CryptoYieldService.getPools(filters);
  }

  public static registerNewPool(
    payload: Omit<YieldFarmingPool, "id" | "status">
  ): YieldFarmingPool {
    return CryptoYieldService.registerPool(payload);
  }

  public static fetchPositions(): LiquidityPositionRecord[] {
    return CryptoYieldService.getPositions();
  }

  public static executeDeposit(poolId: string, amountUsd: number): LiquidityPositionRecord {
    return CryptoYieldService.depositLiquidity(poolId, amountUsd);
  }
}
