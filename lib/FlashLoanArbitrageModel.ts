/**
 * Enterprise Flash Loan Arbitrage & Execution Analytics Model
 * 
 * Architectural Specifications:
 * - Domain entities for multi-DEX flash loan arbitrage routes (Aave v3, Uniswap v3, Sushiswap, Curve).
 * - Models atomic uncollateralized loan execution, DEX price discrepancy evaluation, gas overhead, and slippage decay.
 * - Simulates atomic multi-call bundle transactions with flash loan fee structures (e.g. 0.09% for Aave v3).
 *
 * @module FlashLoanArbitrageModel
 * @version 5.0.0
 * @author Enterprise Cryptographic Architecture Team
 */

export interface DexPriceFeed {
  dexId: string;
  dexName: string;
  pairSymbol: string;
  token0PriceUsd: number;
  token1PriceUsd: number;
  liquidityUsd: number;
  feeTierPercent: number;
}

export interface ArbitrageOpportunity {
  id: string;
  borrowDex: string;
  buyDex: string;
  sellDex: string;
  tokenSymbol: string;
  borrowAmountUsd: number;
  priceDiscrepancyPercent: number;
  grossProfitUsd: number;
  flashLoanFeeUsd: number; // e.g. 0.09% Aave fee
  estimatedGasFeeUsd: number;
  netProfitUsd: number;
  roiPercent: number;
  isViable: boolean;
}

export interface FlashLoanExecutionResult {
  executionId: string;
  opportunityId: string;
  status: 'SUCCESS' | 'REVERTED_SLIPPAGE' | 'REVERTED_GAS' | 'INSUFFICIENT_LIQUIDITY';
  executedBorrowUsd: number;
  actualNetProfitUsd: number;
  gasUsedGwei: number;
  executionTimestamp: string;
  txHash: string;
}

export interface FlashLoanAuditLogEntry {
  timestamp: string;
  eventType: 'FEED_UPDATED' | 'OPPORTUNITY_DETECTED' | 'SIMULATION_EXECUTED' | 'BUNDLE_MINED';
  details: string;
  actor: string;
}

export class FlashLoanArbitrageState {
  private dexFeeds: Map<string, DexPriceFeed> = new Map();
  private auditLogs: FlashLoanAuditLogEntry[] = [];

  constructor() {
    this.loadDefaultFeeds();
  }

  private loadDefaultFeeds(): void {
    const defaultFeeds: DexPriceFeed[] = [
      { dexId: 'uniswap-v3', dexName: 'Uniswap v3', pairSymbol: 'ETH/USDC', token0PriceUsd: 3500, token1PriceUsd: 1.0, liquidityUsd: 50000000, feeTierPercent: 0.05 },
      { dexId: 'sushiswap', dexName: 'Sushiswap', pairSymbol: 'ETH/USDC', token0PriceUsd: 3542, token1PriceUsd: 1.0, liquidityUsd: 12000000, feeTierPercent: 0.30 },
      { dexId: 'curve', dexName: 'Curve Finance', pairSymbol: 'ETH/USDC', token0PriceUsd: 3492, token1PriceUsd: 1.0, liquidityUsd: 35000000, feeTierPercent: 0.04 }
    ];

    defaultFeeds.forEach(f => this.dexFeeds.set(f.dexId, f));
    this.addAuditLog('FEED_UPDATED', 'Initialized default multi-DEX price feeds.', 'SystemInit');
  }

  public getFeeds(): DexPriceFeed[] {
    return Array.from(this.dexFeeds.values());
  }

  public updateFeedPrice(dexId: string, newPrice: number): void {
    const feed = this.dexFeeds.get(dexId);
    if (feed) {
      feed.token0PriceUsd = newPrice;
      this.addAuditLog('FEED_UPDATED', `Updated ${feed.dexName} ETH price to $${newPrice}`, 'User');
    }
  }

  public addAuditLog(eventType: FlashLoanAuditLogEntry['eventType'], details: string, actor: string): void {
    this.auditLogs.push({
      timestamp: new Date().toISOString(),
      eventType,
      details,
      actor
    });
  }

  public getAuditLogs(): FlashLoanAuditLogEntry[] {
    return [...this.auditLogs];
  }
}
