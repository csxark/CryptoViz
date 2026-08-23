/**
 * Enterprise Options Pricing & Greeks Analytics Service Engine
 * 
 * Architectural Specifications:
 * - Black-Scholes formulas for Calls & Puts:
 *   d1 = (ln(S/K) + (r + sigma^2/2) * T) / (sigma * sqrt(T))
 *   d2 = d1 - sigma * sqrt(T)
 * - Analytical Greeks:
 *   Call Delta = N(d1), Put Delta = N(d1) - 1
 *   Gamma = N'(d1) / (S * sigma * sqrt(T))
 *   Vega = S * N'(d1) * sqrt(T) / 100
 *   Theta = - (S * N'(d1) * sigma) / (2 * sqrt(T)) - r * K * exp(-r*T) * N(d2)
 * - Newton-Raphson Implied Volatility Solver.
 *
 * @module OptionsGreeksService
 * @version 6.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

import {
  OptionContract,
  OptionGreeks,
  VolatilitySkewPoint,
  OptionsState
} from './OptionsGreeksModel';

export class OptionsGreeksService {
  private state: OptionsState;

  constructor(state?: OptionsState) {
    this.state = state || new OptionsState();
  }

  public getState(): OptionsState {
    return this.state;
  }

  /**
   * Computes Black-Scholes option price and exact analytical Greeks.
   */
  public calculateOptionGreeks(contract: OptionContract): OptionGreeks {
    const S = contract.underlyingPriceUsd;
    const K = contract.strikePriceUsd;
    const T = Math.max(contract.daysToExpiration, 0.5) / 365;
    const r = contract.riskFreeRate;
    const v = contract.volatility;

    if (S <= 0 || K <= 0 || v <= 0) {
      return { priceUsd: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, intrinsicValueUsd: 0, timeValueUsd: 0 };
    }

    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * sqrtT);
    const d2 = d1 - v * sqrtT;

    const nD1 = this.normalCdf(d1);
    const nD2 = this.normalCdf(d2);
    const nPrimeD1 = this.normalPdf(d1);

    let priceUsd = 0;
    let delta = 0;

    if (contract.optionType === 'CALL') {
      priceUsd = S * nD1 - K * Math.exp(-r * T) * nD2;
      delta = nD1;
    } else {
      const nNegD1 = this.normalCdf(-d1);
      const nNegD2 = this.normalCdf(-d2);
      priceUsd = K * Math.exp(-r * T) * nNegD2 - S * nNegD1;
      delta = nD1 - 1;
    }

    const gamma = nPrimeD1 / (S * v * sqrtT);
    const vega = (S * nPrimeD1 * sqrtT) / 100; // per 1% vol change

    let theta = 0;
    if (contract.optionType === 'CALL') {
      theta = (- (S * nPrimeD1 * v) / (2 * sqrtT) - r * K * Math.exp(-r * T) * nD2) / 365;
    } else {
      theta = (- (S * nPrimeD1 * v) / (2 * sqrtT) + r * K * Math.exp(-r * T) * this.normalCdf(-d2)) / 365;
    }

    const rho = (contract.optionType === 'CALL'
      ? (K * T * Math.exp(-r * T) * nD2)
      : (-K * T * Math.exp(-r * T) * this.normalCdf(-d2))) / 100;

    const intrinsicValueUsd = Math.max(0, contract.optionType === 'CALL' ? S - K : K - S);
    const timeValueUsd = Math.max(0, priceUsd - intrinsicValueUsd);

    return {
      priceUsd: Number(priceUsd.toFixed(2)),
      delta: Number(delta.toFixed(4)),
      gamma: Number(gamma.toFixed(6)),
      theta: Number(theta.toFixed(2)),
      vega: Number(vega.toFixed(2)),
      rho: Number(rho.toFixed(4)),
      intrinsicValueUsd: Number(intrinsicValueUsd.toFixed(2)),
      timeValueUsd: Number(timeValueUsd.toFixed(2))
    };
  }

  /**
   * Solves for Implied Volatility (IV) using Newton-Raphson iteration.
   */
  public calculateImpliedVolatility(
    targetPriceUsd: number,
    contract: OptionContract,
    maxIterations: number = 50,
    tolerance: number = 1e-4
  ): number {
    let sigma = 0.50; // Initial guess 50% IV

    for (let i = 0; i < maxIterations; i++) {
      const testContract = { ...contract, volatility: sigma };
      const greeks = this.calculateOptionGreeks(testContract);
      const diff = greeks.priceUsd - targetPriceUsd;

      if (Math.abs(diff) < tolerance) {
        return Number(sigma.toFixed(4));
      }

      const vega = greeks.vega * 100; // unscale vega
      if (Math.abs(vega) < 1e-6) break;

      sigma = sigma - diff / vega;
      if (sigma <= 0.01) sigma = 0.01;
      if (sigma >= 5.0) sigma = 5.0;
    }

    return Number(sigma.toFixed(4));
  }

  /**
   * Generates volatility skew curve across strike prices.
   */
  public generateVolatilitySkew(underlyingPriceUsd: number = 65000): VolatilitySkewPoint[] {
    const strikes = [50000, 55000, 60000, 65000, 70000, 75000, 80000];

    return strikes.map(K => {
      const moneyness = K / underlyingPriceUsd;
      // Typical OTM put skew curve for crypto options
      const iv = 0.55 + Math.pow(moneyness - 1, 2) * 0.8 + (moneyness < 1 ? (1 - moneyness) * 0.3 : 0);

      return {
        strikePriceUsd: K,
        impliedVolatilityPercent: Number((iv * 100).toFixed(1)),
        optionType: K >= underlyingPriceUsd ? 'CALL' : 'PUT',
        moneyness: Number(moneyness.toFixed(3))
      };
    });
  }

  private normalPdf(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private normalCdf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
  }
}
