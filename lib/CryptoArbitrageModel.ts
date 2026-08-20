export interface FlashLoanArbitrageOpportunity {
  id: string;
  tokenPair: string;
  sourceDex: string;
  targetDex: string;
  borrowAsset: string;
  loanAmountUsd: number;
  expectedGrossProfitUsd: number;
  estimatedGasFeeUsd: number;
  netProfitUsd: number;
  profitMarginPercentage: number;
  executionRisk: 'low' | 'moderate' | 'high' | 'extreme';
  status: 'opportunity-detected' | 'simulating' | 'simulated-success' | 'simulated-reverted' | 'failed-slippage';
  detectedTimestamp: string;
}

export interface ArbitrageExecutionRecord {
  id: string;
  opportunityId: string;
  tokenPair: string;
  borrowAsset: string;
  loanAmountUsd: number;
  simulatedNetProfitUsd: number;
  estimatedGasPaidUsd: number;
  simulatedTxHash: string;
  executedTimestamp: string;
  status: 'simulated-success' | 'simulated-reverted';
  mode: 'paper-trading-simulation';
  disclaimer: string;
}

export interface ArbitrageFilterOptions {
  borrowAsset: string;
  executionRisk: string;
  searchQuery: string;
}

const INITIAL_OPPORTUNITIES: FlashLoanArbitrageOpportunity[] = [
  {
    id: "arb-101",
    tokenPair: "WETH / DAI",
    sourceDex: "Uniswap V3",
    targetDex: "Sushiswap",
    borrowAsset: "WETH",
    loanAmountUsd: 500000,
    expectedGrossProfitUsd: 4850,
    estimatedGasFeeUsd: 620,
    netProfitUsd: 4230,
    profitMarginPercentage: 0.85,
    executionRisk: "low",
    status: "opportunity-detected",
    detectedTimestamp: "10 seconds ago",
  },
  {
    id: "arb-102",
    tokenPair: "WBTC / USDC",
    sourceDex: "Curve Finance",
    targetDex: "Uniswap V3",
    borrowAsset: "USDC",
    loanAmountUsd: 1200000,
    expectedGrossProfitUsd: 9400,
    estimatedGasFeeUsd: 1100,
    netProfitUsd: 8300,
    profitMarginPercentage: 0.69,
    executionRisk: "moderate",
    status: "opportunity-detected",
    detectedTimestamp: "45 seconds ago",
  },
  {
    id: "arb-103",
    tokenPair: "SOL / USDT",
    sourceDex: "Raydium",
    targetDex: "Orca",
    borrowAsset: "USDT",
    loanAmountUsd: 250000,
    expectedGrossProfitUsd: 3100,
    estimatedGasFeeUsd: 180,
    netProfitUsd: 2920,
    profitMarginPercentage: 1.17,
    executionRisk: "high",
    status: "opportunity-detected",
    detectedTimestamp: "2 minutes ago",
  },
];

const INITIAL_RECORDS: ArbitrageExecutionRecord[] = [
  {
    id: "exec-201",
    opportunityId: "arb-101",
    tokenPair: "WETH / DAI",
    borrowAsset: "WETH",
    loanAmountUsd: 500000,
    simulatedNetProfitUsd: 4180,
    estimatedGasPaidUsd: 605,
    simulatedTxHash: "SIM-0x3e11...77a9",
    executedTimestamp: "Aug 18, 2026",
    status: "simulated-success",
    mode: "paper-trading-simulation",
    disclaimer: "Off-chain paper trading simulation only. No real funds borrowed or mainnet transactions executed.",
  },
];

export class CryptoArbitrageService {
  private static opportunities: FlashLoanArbitrageOpportunity[] = [...INITIAL_OPPORTUNITIES];
  private static records: ArbitrageExecutionRecord[] = [...INITIAL_RECORDS];

  public static getOpportunities(options?: Partial<ArbitrageFilterOptions>): FlashLoanArbitrageOpportunity[] {
    let result = [...this.opportunities];
    if (!options) return result;

    if (options.borrowAsset && options.borrowAsset !== "All") {
      result = result.filter((o) => o.borrowAsset === options.borrowAsset);
    }

    if (options.executionRisk && options.executionRisk !== "All") {
      result = result.filter((o) => o.executionRisk === options.executionRisk);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.tokenPair.toLowerCase().includes(q) ||
          o.sourceDex.toLowerCase().includes(q) ||
          o.targetDex.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static getOpportunityById(id: string): FlashLoanArbitrageOpportunity | undefined {
    return this.opportunities.find((o) => o.id === id);
  }

  public static registerOpportunity(
    opp: Omit<FlashLoanArbitrageOpportunity, "id" | "status" | "detectedTimestamp">
  ): FlashLoanArbitrageOpportunity {
    const newOpp: FlashLoanArbitrageOpportunity = {
      ...opp,
      id: `arb-${Date.now()}`,
      status: "opportunity-detected",
      detectedTimestamp: "Just now",
    };
    this.opportunities.unshift(newOpp);
    return newOpp;
  }

  public static getExecutionRecords(): ArbitrageExecutionRecord[] {
    return [...this.records];
  }

  public static simulateFlashLoanArbitrage(
    opportunityId: string
  ): ArbitrageExecutionRecord {
    const opp = this.getOpportunityById(opportunityId);
    if (!opp) throw new Error("Flash loan arbitrage opportunity not found.");

    opp.status = "simulated-success";

    const newRecord: ArbitrageExecutionRecord = {
      id: `exec-${Date.now()}`,
      opportunityId,
      tokenPair: opp.tokenPair,
      borrowAsset: opp.borrowAsset,
      loanAmountUsd: opp.loanAmountUsd,
      simulatedNetProfitUsd: opp.netProfitUsd,
      estimatedGasPaidUsd: opp.estimatedGasFeeUsd,
      simulatedTxHash: `SIM-0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      executedTimestamp: "Just now",
      status: "simulated-success",
      mode: "paper-trading-simulation",
      disclaimer: "Off-chain paper trading simulation only. No real funds borrowed or mainnet transactions executed.",
    };

    this.records.unshift(newRecord);
    return newRecord;
  }
}
