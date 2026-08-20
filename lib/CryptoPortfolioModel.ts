export interface PortfolioRiskMetric {
  id: string;
  portfolioName: string;
  fundStrategy: 'DeFi High-Yield' | 'Macro Core Alpha' | 'L1 Staking Basket' | 'Arbitrage Neutral';
  totalValueUsd: number;
  sharpeRatio: number;
  valueAtRiskPercent: number; // e.g. 95% 1-day VaR
  betaVsBtc: number;
  maxDrawdownPercentage: number;
  rebalanceDriftPercentage: number;
  riskRating: 'Low' | 'Moderate' | 'High' | 'Aggressive';
  assetAllocations: { asset: string; currentPercent: number; targetPercent: number }[];
  status: 'optimal' | 'rebalance-required' | 'high-volatility-warning';
}

export interface RebalanceExecutionLog {
  id: string;
  portfolioId: string;
  portfolioName: string;
  rebalancedAssets: string;
  totalRebalancedValueUsd: number;
  estimatedSlippageFeeUsd: number;
  executedTimestamp: string;
  status: 'rebalanced-settled' | 'pending';
}

export interface PortfolioFilterOptions {
  fundStrategy: string;
  riskRating: string;
  searchQuery: string;
}

const INITIAL_PORTFOLIOS: PortfolioRiskMetric[] = [
  {
    id: "port-101",
    portfolioName: "Macro Core Crypto Alpha",
    fundStrategy: "Macro Core Alpha",
    totalValueUsd: 12500000,
    sharpeRatio: 2.45,
    valueAtRiskPercent: 4.2,
    betaVsBtc: 0.85,
    maxDrawdownPercentage: 14.2,
    rebalanceDriftPercentage: 6.8,
    riskRating: "Moderate",
    assetAllocations: [
      { asset: "BTC", currentPercent: 52, targetPercent: 45 },
      { asset: "ETH", currentPercent: 28, targetPercent: 35 },
      { asset: "USDC", currentPercent: 20, targetPercent: 20 }
    ],
    status: "rebalance-required"
  },
  {
    id: "port-102",
    portfolioName: "Delta-Neutral Arbitrage Yield",
    fundStrategy: "Arbitrage Neutral",
    totalValueUsd: 8400000,
    sharpeRatio: 3.82,
    valueAtRiskPercent: 1.1,
    betaVsBtc: 0.12,
    maxDrawdownPercentage: 3.5,
    rebalanceDriftPercentage: 1.2,
    riskRating: "Low",
    assetAllocations: [
      { asset: "USDC", currentPercent: 60, targetPercent: 60 },
      { asset: "USDT", currentPercent: 40, targetPercent: 40 }
    ],
    status: "optimal"
  },
  {
    id: "port-103",
    portfolioName: "Solana Ecosystem High Beta",
    fundStrategy: "DeFi High-Yield",
    totalValueUsd: 4200000,
    sharpeRatio: 1.65,
    valueAtRiskPercent: 9.8,
    betaVsBtc: 1.62,
    maxDrawdownPercentage: 32.5,
    rebalanceDriftPercentage: 11.4,
    riskRating: "Aggressive",
    assetAllocations: [
      { asset: "SOL", currentPercent: 65, targetPercent: 50 },
      { asset: "JUP", currentPercent: 25, targetPercent: 30 },
      { asset: "USDC", currentPercent: 10, targetPercent: 20 }
    ],
    status: "rebalance-required"
  }
];

const INITIAL_LOGS: RebalanceExecutionLog[] = [
  {
    id: "reb-601",
    portfolioId: "port-101",
    portfolioName: "Macro Core Crypto Alpha",
    rebalancedAssets: "BTC ➔ ETH, USDC",
    totalRebalancedValueUsd: 850000,
    estimatedSlippageFeeUsd: 420,
    executedTimestamp: "1 hour ago",
    status: "rebalanced-settled"
  }
];

export class CryptoPortfolioService {
  private static portfolios: PortfolioRiskMetric[] = [...INITIAL_PORTFOLIOS];
  private static logs: RebalanceExecutionLog[] = [...INITIAL_LOGS];

  public static getPortfolios(options?: Partial<PortfolioFilterOptions>): PortfolioRiskMetric[] {
    let result = [...this.portfolios];
    if (!options) return result;

    if (options.fundStrategy && options.fundStrategy !== "All") {
      result = result.filter((p) => p.fundStrategy === options.fundStrategy);
    }

    if (options.riskRating && options.riskRating !== "All") {
      result = result.filter((p) => p.riskRating === options.riskRating);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.portfolioName.toLowerCase().includes(q) ||
          p.fundStrategy.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerPortfolio(
    portfolio: Omit<PortfolioRiskMetric, "id" | "status">
  ): PortfolioRiskMetric {
    const newPort: PortfolioRiskMetric = {
      ...portfolio,
      id: `port-${Date.now()}`,
      status: portfolio.rebalanceDriftPercentage > 5 ? "rebalance-required" : "optimal"
    };
    this.portfolios.unshift(newPort);
    return newPort;
  }

  public static getRebalanceLogs(): RebalanceExecutionLog[] {
    return [...this.logs];
  }

  public static executeRebalance(portfolioId: string): RebalanceExecutionLog {
    const port = this.portfolios.find((p) => p.id === portfolioId);
    if (!port) throw new Error("Portfolio not found.");

    port.rebalanceDriftPercentage = 0.5;
    port.status = "optimal";

    const newLog: RebalanceExecutionLog = {
      id: `reb-${Date.now()}`,
      portfolioId,
      portfolioName: port.portfolioName,
      rebalancedAssets: "Rebalanced to Target Allocations",
      totalRebalancedValueUsd: port.totalValueUsd * 0.08,
      estimatedSlippageFeeUsd: 250,
      executedTimestamp: "Just now",
      status: "rebalanced-settled"
    };

    this.logs.unshift(newLog);
    return newLog;
  }
}
