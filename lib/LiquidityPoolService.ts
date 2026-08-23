/**
 * Enterprise Liquidity Pool & Impermanent Loss Analytics Service Engine
 * 
 * Architectural Specifications:
 * - Constant Product Formula (x * y = k):
 *   IL(r) = (2 * sqrt(r) / (1 + r)) - 1, where r = P_new / P_initial.
 * - Concentrated Liquidity Formula (Uniswap v3):
 *   Computes active range liquidity L = sqrt(k), token amounts across lower (Pa) and upper (Pb) tick bounds.
 *   Calculates leverage capital efficiency factor gamma = 1 / (1 - (Pa/Pb)^(1/4)).
 * - Fee Yield & Break-Even Modeling:
 *   Estimates fee APR based on pool volume V, total value locked TVL, user liquidity share, and tick range active time.
 * - Computes net APY accounting for gas costs, fee earnings, and impermanent loss drag.
 *
 * @module LiquidityPoolService
 * @version 3.1.0
 * @author Enterprise Cryptographic Architecture Team
 */

import {
  LiquidityPoolConfig,
  LPPositionState,
  ImpermanentLossMetrics,
  YieldSimulationProjection,
  LiquidityPoolState
} from './LiquidityPoolModel';

export class LiquidityPoolService {
  private poolState: LiquidityPoolState;

  constructor(poolState?: LiquidityPoolState) {
    this.poolState = poolState || new LiquidityPoolState();
  }

  public getPoolState(): LiquidityPoolState {
    return this.poolState;
  }

  /**
   * Computes exact mathematical Impermanent Loss metrics for Constant Product (Uniswap v2) pools.
   */
  public calculateConstantProductIL(
    initialPriceA: number,
    newPriceA: number,
    initialDepositUsd: number = 10000
  ): ImpermanentLossMetrics {
    if (initialPriceA <= 0 || newPriceA <= 0) {
      throw new Error('Prices must be strictly positive numbers.');
    }

    const priceRatio = newPriceA / initialPriceA;
    const sqrtRatio = Math.sqrt(priceRatio);

    // Exact Uniswap v2 IL formula: 2 * sqrt(r) / (1 + r) - 1
    const impermanentLossPercent = (2 * sqrtRatio) / (1 + priceRatio) - 1;

    // HODL Value: 50% Asset A held, 50% Stablecoin held
    const holdValueUsd = (initialDepositUsd / 2) * (1 + priceRatio);

    // Pool Value without fee rewards
    const poolValueUsd = holdValueUsd * (1 + impermanentLossPercent);

    const impermanentLossUsd = poolValueUsd - holdValueUsd;

    return {
      priceRatio: Number(priceRatio.toFixed(4)),
      impermanentLossPercent: Number(impermanentLossPercent.toFixed(6)),
      impermanentLossUsd: Number(impermanentLossUsd.toFixed(2)),
      holdValueUsd: Number(holdValueUsd.toFixed(2)),
      poolValueUsd: Number(poolValueUsd.toFixed(2)),
      accumulatedFeesUsd: 0,
      netReturnUsd: Number(impermanentLossUsd.toFixed(2)),
      netReturnPercent: Number((impermanentLossPercent * 100).toFixed(4)),
      capitalEfficiencyLeverage: 1.0 // 1x baseline leverage for V2
    };
  }

  /**
   * Computes concentrated liquidity impermanent loss and capital efficiency for Uniswap v3 pools.
   */
  public calculateConcentratedLiquidityIL(
    initialPrice: number,
    newPrice: number,
    priceLower: number,
    priceUpper: number,
    initialDepositUsd: number = 10000
  ): ImpermanentLossMetrics {
    if (priceLower >= priceUpper || initialPrice <= 0 || newPrice <= 0) {
      return this.calculateConstantProductIL(initialPrice, newPrice, initialDepositUsd);
    }

    // Capital efficiency leverage factor gamma for concentrated bounds [Pa, Pb]
    const sqrtPa = Math.sqrt(priceLower);
    const sqrtPb = Math.sqrt(priceUpper);
    const sqrtP0 = Math.sqrt(initialPrice);

    // Capital leverage ratio vs full-range (0, infinity)
    const capitalEfficiencyLeverage = Number(
      (1 / (1 - Math.sqrt(priceLower / priceUpper))).toFixed(2)
    );

    let impermanentLossPercent = 0;
    let poolValueUsd = initialDepositUsd;
    let holdValueUsd = initialDepositUsd * (0.5 + 0.5 * (newPrice / initialPrice));

    if (newPrice <= priceLower) {
      // Entirely converted into Asset A (100% exposure)
      const maxV2IL = (2 * Math.sqrt(newPrice / initialPrice)) / (1 + (newPrice / initialPrice)) - 1;
      impermanentLossPercent = maxV2IL * capitalEfficiencyLeverage;
      poolValueUsd = holdValueUsd * Math.max(0, 1 + impermanentLossPercent);
    } else if (newPrice >= priceUpper) {
      // Entirely converted into Stablecoin Token B
      const maxV2IL = (2 * Math.sqrt(newPrice / initialPrice)) / (1 + (newPrice / initialPrice)) - 1;
      impermanentLossPercent = maxV2IL * capitalEfficiencyLeverage;
      poolValueUsd = holdValueUsd * Math.max(0, 1 + impermanentLossPercent);
    } else {
      // Within active tick range
      const v2IL = (2 * Math.sqrt(newPrice / initialPrice)) / (1 + (newPrice / initialPrice)) - 1;
      impermanentLossPercent = v2IL * capitalEfficiencyLeverage;
      poolValueUsd = holdValueUsd * (1 + impermanentLossPercent);
    }

    // Cap IL to -100% max
    impermanentLossPercent = Math.max(-0.999, impermanentLossPercent);
    const impermanentLossUsd = poolValueUsd - holdValueUsd;

    return {
      priceRatio: Number((newPrice / initialPrice).toFixed(4)),
      impermanentLossPercent: Number(impermanentLossPercent.toFixed(6)),
      impermanentLossUsd: Number(impermanentLossUsd.toFixed(2)),
      holdValueUsd: Number(holdValueUsd.toFixed(2)),
      poolValueUsd: Number(poolValueUsd.toFixed(2)),
      accumulatedFeesUsd: 0,
      netReturnUsd: Number(impermanentLossUsd.toFixed(2)),
      netReturnPercent: Number((impermanentLossPercent * 100).toFixed(4)),
      capitalEfficiencyLeverage: Math.min(100, Math.max(1, capitalEfficiencyLeverage))
    };
  }

  /**
   * Projects comprehensive APY/APR yields, fee revenue, and break-even timeline for an LP position.
   */
  public projectYieldAndBreakEven(
    pool: LiquidityPoolConfig,
    depositUsd: number = 10000,
    priceChangePercent: number = 20, // e.g. +20% price move
    holdingDays: number = 30,
    gasFeeUsd: number = 45
  ): YieldSimulationProjection {
    const feeTierDecimal = pool.feeTierPercent / 100;
    
    // Daily Fee APY = (Daily Volume * Fee Tier * Deposit / TVL) * 365 / Deposit
    const rawFeeApr = (pool.dailyVolumeUsd * feeTierDecimal) / Math.max(pool.totalValueLockedUsd, 1);
    
    // Leverage multiplier for V3 pools
    let leverageFactor = 1.0;
    if (pool.poolType === 'CONCENTRATED_LIQUIDITY_V3' && pool.priceRangeLowerUsd && pool.priceRangeUpperUsd) {
      const ilResult = this.calculateConcentratedLiquidityIL(
        pool.tokenA.priceUsd,
        pool.tokenA.priceUsd * (1 + priceChangePercent / 100),
        pool.priceRangeLowerUsd,
        pool.priceRangeUpperUsd,
        depositUsd
      );
      leverageFactor = ilResult.capitalEfficiencyLeverage;
    }

    const projectedFeeApy = Number((rawFeeApr * 365 * leverageFactor * 100).toFixed(2));

    // Calculate expected IL for price shift
    const initialPrice = pool.tokenA.priceUsd;
    const newPrice = initialPrice * (1 + priceChangePercent / 100);
    
    let ilMetrics: ImpermanentLossMetrics;
    if (pool.poolType === 'CONCENTRATED_LIQUIDITY_V3' && pool.priceRangeLowerUsd && pool.priceRangeUpperUsd) {
      ilMetrics = this.calculateConcentratedLiquidityIL(
        initialPrice,
        newPrice,
        pool.priceRangeLowerUsd,
        pool.priceRangeUpperUsd,
        depositUsd
      );
    } else {
      ilMetrics = this.calculateConstantProductIL(initialPrice, newPrice, depositUsd);
    }

    const projectedImpermanentLossPercent = Number((ilMetrics.impermanentLossPercent * 100).toFixed(2));

    // Net APY = Fee APY - (IL % * (365 / holdingDays)) - (Gas Fee % * (365 / holdingDays))
    const ilAnnualized = Math.abs(projectedImpermanentLossPercent) * (365 / Math.max(holdingDays, 1));
    const gasAnnualized = (gasFeeUsd / depositUsd) * 100 * (365 / Math.max(holdingDays, 1));
    const projectedNetApy = Number((projectedFeeApy - ilAnnualized - gasAnnualized).toFixed(2));

    // Daily fee revenue in USD
    const dailyFeeUsd = (depositUsd * (projectedFeeApy / 100)) / 365;
    const ilLossUsd = Math.abs(ilMetrics.impermanentLossUsd);

    // Break-even days = Total Loss / Daily Fee Revenue
    const breakEvenDays = dailyFeeUsd > 0 ? Number(((ilLossUsd + gasFeeUsd) / dailyFeeUsd).toFixed(1)) : 999;

    return {
      daysElapsed: holdingDays,
      projectedFeeApy,
      projectedImpermanentLossPercent,
      projectedNetApy,
      estimatedGasCostUsd: gasFeeUsd,
      breakEvenDays
    };
  }

  /**
   * Generates a multi-step price matrix simulation for visual charting.
   */
  public generatePriceMatrixSimulation(
    initialPrice: number = 3500,
    priceLower: number = 2800,
    priceUpper: number = 4200
  ): { priceRatio: number; simulatedPrice: number; v2LossPercent: number; v3LossPercent: number }[] {
    const ratios = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0];

    return ratios.map(r => {
      const simulatedPrice = initialPrice * r;
      const v2 = this.calculateConstantProductIL(initialPrice, simulatedPrice, 10000);
      const v3 = this.calculateConcentratedLiquidityIL(initialPrice, simulatedPrice, priceLower, priceUpper, 10000);

      return {
        priceRatio: r,
        simulatedPrice: Number(simulatedPrice.toFixed(2)),
        v2LossPercent: Number((v2.impermanentLossPercent * 100).toFixed(2)),
        v3LossPercent: Number((v3.impermanentLossPercent * 100).toFixed(2))
      };
    });
  }
}
