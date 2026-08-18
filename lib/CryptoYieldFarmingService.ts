import {
  CryptoYieldFarmingService,
  LiquidityPool,
  YieldHarvestRecord,
  PoolFilterOptions,
} from "./CryptoYieldFarmingModel";

export class CryptoYieldFarmingServiceHandler {
  public static fetchLiquidityPools(filters?: Partial<PoolFilterOptions>): LiquidityPool[] {
    return CryptoYieldFarmingService.getPools(filters);
  }

  public static fetchPoolDetails(id: string): LiquidityPool | undefined {
    return CryptoYieldFarmingService.getPoolById(id);
  }

  public static registerLiquidityPool(
    payload: Omit<LiquidityPool, "id">
  ): LiquidityPool {
    return CryptoYieldFarmingService.createLiquidityPool(payload);
  }

  public static fetchHarvestHistory(): YieldHarvestRecord[] {
    return CryptoYieldFarmingService.getHarvestHistory();
  }

  public static executeRewardClaim(
    poolId: string,
    rewardTokenSymbol: string,
    harvestedAmount: number
  ): YieldHarvestRecord {
    return CryptoYieldFarmingService.claimPoolRewards(
      poolId,
      rewardTokenSymbol,
      harvestedAmount
    );
  }
}
