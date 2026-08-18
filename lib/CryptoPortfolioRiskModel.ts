export interface CryptoAssetAllocation {
  symbol: string;
  name: string;
  currentAllocationPercentage: number;
  targetAllocationPercentage: number;
  holdingsValueUsd: number;
  sharpeRatio: number;
  volatilityIndex: number;
  maxDrawdownPercentage: number;
}

export interface PortfolioRiskMetric {
  id: string;
  portfolioName: string;
  riskScore: number; // 0 - 100
  riskCategory: 'low' | 'moderate' | 'high' | 'degen';
  totalValueUsd: number;
  rebalanceRequired: boolean;
  allocations: CryptoAssetAllocation[];
  createdDate: string;
}

export interface RebalanceExecutionLog {
  id: string;
  portfolioId: string;
  portfolioName: string;
  assetSymbol: string;
  tradeType: 'buy' | 'sell';
  tradeAmountUsd: number;
  targetPercentageDelta: number;
  executionStatus: 'executed' | 'pending' | 'cancelled';
  executedTimestamp: string;
}

export interface CryptoFilterOptions {
  riskCategory: string;
  rebalanceOnly: boolean;
  searchQuery: string;
}

const INITIAL_PORTFOLIOS: PortfolioRiskMetric[] = [
  {
    id: "port-101",
    portfolioName: "Layer-1 Core Ecosystem",
    riskScore: 42,
    riskCategory: "moderate",
    totalValueUsd: 145000,
    rebalanceRequired: true,
    createdDate: "Aug 18, 2026",
    allocations: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        currentAllocationPercentage: 55,
        targetAllocationPercentage: 40,
        holdingsValueUsd: 79750,
        sharpeRatio: 2.1,
        volatilityIndex: 18.5,
        maxDrawdownPercentage: -14.2,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        currentAllocationPercentage: 25,
        targetAllocationPercentage: 35,
        holdingsValueUsd: 36250,
        sharpeRatio: 1.8,
        volatilityIndex: 24.1,
        maxDrawdownPercentage: -22.0,
      },
      {
        symbol: "SOL",
        name: "Solana",
        currentAllocationPercentage: 20,
        targetAllocationPercentage: 25,
        holdingsValueUsd: 29000,
        sharpeRatio: 1.4,
        volatilityIndex: 38.6,
        maxDrawdownPercentage: -31.5,
      },
    ],
  },
  {
    id: "port-102",
    portfolioName: "DeFi Yield & Staking Vault",
    riskScore: 78,
    riskCategory: "high",
    totalValueUsd: 62000,
    rebalanceRequired: false,
    createdDate: "Aug 12, 2026",
    allocations: [
      {
        symbol: "AAVE",
        name: "Aave Protocol",
        currentAllocationPercentage: 40,
        targetAllocationPercentage: 40,
        holdingsValueUsd: 24800,
        sharpeRatio: 1.5,
        volatilityIndex: 42.0,
        maxDrawdownPercentage: -28.4,
      },
      {
        symbol: "UNI",
        name: "Uniswap Governance",
        currentAllocationPercentage: 30,
        targetAllocationPercentage: 30,
        holdingsValueUsd: 18600,
        sharpeRatio: 1.2,
        volatilityIndex: 48.3,
        maxDrawdownPercentage: -35.1,
      },
      {
        symbol: "LINK",
        name: "Chainlink Oracles",
        currentAllocationPercentage: 30,
        targetAllocationPercentage: 30,
        holdingsValueUsd: 18600,
        sharpeRatio: 1.9,
        volatilityIndex: 31.0,
        maxDrawdownPercentage: -19.8,
      },
    ],
  },
];

const INITIAL_REBALANCE_LOGS: RebalanceExecutionLog[] = [
  {
    id: "reb-201",
    portfolioId: "port-101",
    portfolioName: "Layer-1 Core Ecosystem",
    assetSymbol: "BTC",
    tradeType: "sell",
    tradeAmountUsd: 21750,
    targetPercentageDelta: -15,
    executionStatus: "executed",
    executedTimestamp: "Aug 18, 2026",
  },
];

export class CryptoPortfolioRiskService {
  private static portfolios: PortfolioRiskMetric[] = [...INITIAL_PORTFOLIOS];
  private static logs: RebalanceExecutionLog[] = [...INITIAL_REBALANCE_LOGS];

  public static getPortfolios(options?: Partial<CryptoFilterOptions>): PortfolioRiskMetric[] {
    let result = [...this.portfolios];
    if (!options) return result;

    if (options.riskCategory && options.riskCategory !== "All") {
      result = result.filter((p) => p.riskCategory === options.riskCategory);
    }

    if (options.rebalanceOnly) {
      result = result.filter((p) => p.rebalanceRequired);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.portfolioName.toLowerCase().includes(q) ||
          p.allocations.some((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public static getPortfolioById(id: string): PortfolioRiskMetric | undefined {
    return this.portfolios.find((p) => p.id === id);
  }

  public static createPortfolio(
    portfolio: Omit<PortfolioRiskMetric, "id" | "rebalanceRequired" | "createdDate">
  ): PortfolioRiskMetric {
    const rebalanceRequired = portfolio.allocations.some(
      (a) => Math.abs(a.currentAllocationPercentage - a.targetAllocationPercentage) > 5
    );

    const newPortfolio: PortfolioRiskMetric = {
      ...portfolio,
      id: `port-${Date.now()}`,
      rebalanceRequired,
      createdDate: "Just now",
    };
    this.portfolios.unshift(newPortfolio);
    return newPortfolio;
  }

  public static getRebalanceLogs(): RebalanceExecutionLog[] {
    return [...this.logs];
  }

  public static executeRebalanceTrade(
    portfolioId: string,
    assetSymbol: string,
    tradeType: 'buy' | 'sell',
    tradeAmountUsd: number
  ): RebalanceExecutionLog {
    const portfolio = this.getPortfolioById(portfolioId);
    if (!portfolio) throw new Error("Portfolio not found.");

    const newLog: RebalanceExecutionLog = {
      id: `reb-${Date.now()}`,
      portfolioId,
      portfolioName: portfolio.portfolioName,
      assetSymbol,
      tradeType,
      tradeAmountUsd,
      targetPercentageDelta: tradeType === 'sell' ? -10 : 10,
      executionStatus: "executed",
      executedTimestamp: "Just now",
    };

    this.logs.unshift(newLog);
    return newLog;
  }
}
