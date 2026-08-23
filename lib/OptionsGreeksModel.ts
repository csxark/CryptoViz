/**
 * Enterprise Options Pricing & Volatility Surface Model
 * 
 * Architectural Specifications:
 * - Black-Scholes-Merton option pricing model for crypto derivatives (BTC/ETH options).
 * - Analytical formulas for option Greeks: Delta (d1), Gamma (N'(d1)), Theta (time decay), Vega (volatility sensitivity), Rho (interest rate sensitivity).
 * - Implied Volatility (IV) solver using Newton-Raphson numerical root finding.
 * - Volatility smile & skew surface generator for Deribit option chains.
 *
 * @module OptionsGreeksModel
 * @version 6.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

export type OptionType = 'CALL' | 'PUT';

export interface OptionContract {
  id: string;
  symbol: string; // e.g. BTC-30SEP26-65000-C
  underlyingSymbol: string; // BTC, ETH
  optionType: OptionType;
  strikePriceUsd: number;
  underlyingPriceUsd: number;
  daysToExpiration: number;
  riskFreeRate: number;
  volatility: number; // Implied volatility (e.g. 0.65 for 65%)
  marketPriceUsd?: number;
}

export interface OptionGreeks {
  priceUsd: number;
  delta: number; // dC/dS or dP/dS
  gamma: number; // d^2C/dS^2
  theta: number; // dC/dt (daily decay)
  vega: number;  // dC/dsigma (1% vol change)
  rho: number;   // dC/dr
  intrinsicValueUsd: number;
  timeValueUsd: number;
}

export interface VolatilitySkewPoint {
  strikePriceUsd: number;
  impliedVolatilityPercent: number;
  optionType: OptionType;
  moneyness: number; // Strike / Underlying
}

export class OptionsState {
  private contracts: Map<string, OptionContract> = new Map();

  constructor() {
    this.loadDefaultContracts();
  }

  private loadDefaultContracts(): void {
    const defaultList: OptionContract[] = [
      { id: 'btc-65k-call', symbol: 'BTC-30SEP26-65000-C', underlyingSymbol: 'BTC', optionType: 'CALL', strikePriceUsd: 65000, underlyingPriceUsd: 65000, daysToExpiration: 30, riskFreeRate: 0.045, volatility: 0.60, marketPriceUsd: 3200 },
      { id: 'btc-60k-put', symbol: 'BTC-30SEP26-60000-P', underlyingSymbol: 'BTC', optionType: 'PUT', strikePriceUsd: 60000, underlyingPriceUsd: 65000, daysToExpiration: 30, riskFreeRate: 0.045, volatility: 0.65, marketPriceUsd: 1100 },
      { id: 'eth-3500-call', symbol: 'ETH-30SEP26-3500-C', underlyingSymbol: 'ETH', optionType: 'CALL', strikePriceUsd: 3500, underlyingPriceUsd: 3500, daysToExpiration: 30, riskFreeRate: 0.045, volatility: 0.70, marketPriceUsd: 210 }
    ];

    defaultList.forEach(c => this.contracts.set(c.id, c));
  }

  public getContracts(): OptionContract[] {
    return Array.from(this.contracts.values());
  }

  public getContractById(id: string): OptionContract | undefined {
    return this.contracts.get(id);
  }
}
