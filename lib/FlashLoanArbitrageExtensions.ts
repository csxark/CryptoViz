/**
 * Extended Flash Loan Arbitrage Utilities & Simulation Helpers
 */

export class FlashLoanArbitrageExtensions {
  public static calculateSlippageDecay(tradeSizeUsd: number, liquidityPoolUsd: number): number {
    const impactRatio = tradeSizeUsd / Math.max(liquidityPoolUsd, 1);
    return Number((impactRatio * 0.05).toFixed(4));
  }
}
