/**
 * Enterprise Options Risk & Hedging Strategy Extensions
 */

export interface DeltaHedgeInstruction {
  underlyingAmountToTrade: number;
  tradeAction: 'BUY_UNDERLYING' | 'SELL_UNDERLYING';
  netPortfolioDelta: number;
}

export class OptionsRiskExtensions {
  public static calculateDeltaHedge(portfolioDelta: number, underlyingPriceUsd: number): DeltaHedgeInstruction {
    const action = portfolioDelta > 0 ? 'SELL_UNDERLYING' : 'BUY_UNDERLYING';
    const amount = Math.abs(portfolioDelta);

    return {
      underlyingAmountToTrade: Number(amount.toFixed(4)),
      tradeAction: action,
      netPortfolioDelta: 0
    };
  }
}
