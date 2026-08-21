import {
  FlashLoanArbitrageSurveillanceOpportunity,
  FlashLoanArbitrageAuditRecord,
  ArbitrageSurveillanceFilterOptions,
  ArbitrageSimulationParameters,
  FlashLoanArbitrageDomainState,
} from './CryptoFlashLoanArbitrageModel';

const INITIAL_SURVEILLANCE_OPPORTUNITIES: FlashLoanArbitrageSurveillanceOpportunity[] = [
  {
    id: 'arb-surv-101',
    tokenPair: 'WETH / DAI',
    flashLoanProtocol: 'Aave V3',
    borrowAsset: 'WETH',
    borrowAmountUsd: 750000,
    sourceDex: 'Uniswap V3',
    targetDex: 'Sushiswap',
    routes: [
      { step: 1, dexName: 'Uniswap V3', poolPair: 'WETH/DAI', feeTierPercent: 0.05, expectedSlippagePercent: 0.12 },
      { step: 2, dexName: 'Sushiswap', poolPair: 'DAI/WETH', feeTierPercent: 0.3, expectedSlippagePercent: 0.23 },
    ],
    expectedGrossProfitUsd: 6800,
    estimatedGasFeeUsd: 720,
    estimatedFlashFeeUsd: 375, // 0.05% Aave flash fee
    netProfitUsd: 5705,
    profitMarginPercentage: 0.76,
    executionRisk: 'low',
    status: 'MONITORING',
    detectedTimestamp: '12 seconds ago',
    availableLiquidityUsd: 2500000,
    maxAllowedSlippagePercent: 1.5,
    actualSlippagePercent: 0.35,
    maxAllowedGasFeeUsd: 1200,
    minRequiredProfitUsd: 1000,
  },
  {
    id: 'arb-surv-102',
    tokenPair: 'WBTC / USDC',
    flashLoanProtocol: 'MakerDAO',
    borrowAsset: 'USDC',
    borrowAmountUsd: 1800000,
    sourceDex: 'Curve Finance',
    targetDex: 'Uniswap V3',
    routes: [
      { step: 1, dexName: 'Curve Finance', poolPair: '3pool-USDC', feeTierPercent: 0.04, expectedSlippagePercent: 0.18 },
      { step: 2, dexName: 'Uniswap V3', poolPair: 'WBTC/USDC', feeTierPercent: 0.3, expectedSlippagePercent: 0.32 },
    ],
    expectedGrossProfitUsd: 14200,
    estimatedGasFeeUsd: 1450,
    estimatedFlashFeeUsd: 0, // 0% Maker D3M flash fee
    netProfitUsd: 12750,
    profitMarginPercentage: 0.71,
    executionRisk: 'moderate',
    status: 'MONITORING',
    detectedTimestamp: '38 seconds ago',
    availableLiquidityUsd: 4200000,
    maxAllowedSlippagePercent: 1.2,
    actualSlippagePercent: 0.50,
    maxAllowedGasFeeUsd: 2000,
    minRequiredProfitUsd: 2500,
  },
  {
    id: 'arb-surv-103',
    tokenPair: 'SOL / USDT',
    flashLoanProtocol: 'Euler',
    borrowAsset: 'USDT',
    borrowAmountUsd: 320000,
    sourceDex: 'Raydium',
    targetDex: 'Orca',
    routes: [
      { step: 1, dexName: 'Raydium', poolPair: 'SOL/USDT', feeTierPercent: 0.25, expectedSlippagePercent: 0.65 },
      { step: 2, dexName: 'Orca', poolPair: 'USDT/SOL', feeTierPercent: 0.3, expectedSlippagePercent: 0.70 },
    ],
    expectedGrossProfitUsd: 4100,
    estimatedGasFeeUsd: 280,
    estimatedFlashFeeUsd: 160,
    netProfitUsd: 3660,
    profitMarginPercentage: 1.14,
    executionRisk: 'high',
    status: 'MONITORING',
    detectedTimestamp: '1.5 minutes ago',
    availableLiquidityUsd: 210000, // Insufficient liquidity triggers simulation failure
    maxAllowedSlippagePercent: 0.8,
    actualSlippagePercent: 1.35,
    maxAllowedGasFeeUsd: 500,
    minRequiredProfitUsd: 1000,
  },
  {
    id: 'arb-surv-104',
    tokenPair: 'LINK / ETH',
    flashLoanProtocol: 'Uniswap V3 Flash',
    borrowAsset: 'WETH',
    borrowAmountUsd: 500000,
    sourceDex: 'Balancer',
    targetDex: 'Uniswap V3',
    routes: [
      { step: 1, dexName: 'Balancer', poolPair: 'LINK/WETH', feeTierPercent: 0.1, expectedSlippagePercent: 0.20 },
      { step: 2, dexName: 'Uniswap V3', poolPair: 'WETH/LINK', feeTierPercent: 0.3, expectedSlippagePercent: 0.25 },
    ],
    expectedGrossProfitUsd: 5200,
    estimatedGasFeeUsd: 890,
    estimatedFlashFeeUsd: 250,
    netProfitUsd: 4060,
    profitMarginPercentage: 0.81,
    executionRisk: 'low',
    status: 'MONITORING',
    detectedTimestamp: '2 minutes ago',
    availableLiquidityUsd: 1800000,
    maxAllowedSlippagePercent: 1.0,
    actualSlippagePercent: 0.45,
    maxAllowedGasFeeUsd: 1100,
    minRequiredProfitUsd: 1500,
  },
];

const INITIAL_AUDIT_RECORDS: FlashLoanArbitrageAuditRecord[] = [
  {
    id: 'AUD-8f22b9a1-7c12-4589-9111-223344556677',
    opportunityId: 'arb-surv-101',
    tokenPair: 'WETH / DAI',
    borrowAsset: 'WETH',
    borrowAmountUsd: 750000,
    netProfitUsd: 5620,
    gasPaidUsd: 710,
    flashFeePaidUsd: 375,
    actualSlippagePercent: 0.35,
    executionTxHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    executedTimestamp: 'Aug 20, 2026',
    status: 'EXECUTED_SUCCESS',
  },
];

export class FlashLoanArbitrageSurveillanceEngine {
  public static evaluateExecution(
    opp: FlashLoanArbitrageSurveillanceOpportunity,
    params?: Partial<ArbitrageSimulationParameters>
  ): {
    success: boolean;
    failureReason?: string;
    netProfitUsd: number;
    actualGasUsd: number;
    actualSlippagePercent: number;
  } {
    const tradeAmount = params?.tradeAmountUsd ?? opp.borrowAmountUsd;
    const maxSlippage = params?.maxAllowedSlippagePercent ?? opp.maxAllowedSlippagePercent;
    const minProfit = params?.minRequiredProfitUsd ?? opp.minRequiredProfitUsd;
    const maxGas = params?.maxAllowedGasFeeUsd ?? opp.maxAllowedGasFeeUsd;

    // 1. Parameter Validation
    if (
      !Number.isFinite(tradeAmount) ||
      tradeAmount <= 0 ||
      !Number.isFinite(maxSlippage) ||
      maxSlippage < 0 ||
      !Number.isFinite(minProfit) ||
      !Number.isFinite(maxGas) ||
      maxGas <= 0
    ) {
      return {
        success: false,
        failureReason: 'INVALID_SIMULATION_PARAMETERS',
        netProfitUsd: 0,
        actualGasUsd: 0,
        actualSlippagePercent: 0,
      };
    }

    // 2. Available Liquidity Check
    if (opp.availableLiquidityUsd < tradeAmount) {
      return {
        success: false,
        failureReason: 'INSUFFICIENT_POOL_LIQUIDITY',
        netProfitUsd: 0,
        actualGasUsd: opp.estimatedGasFeeUsd,
        actualSlippagePercent: opp.actualSlippagePercent,
      };
    }

    // 3. Slippage Constraint Check
    if (opp.actualSlippagePercent > maxSlippage) {
      return {
        success: false,
        failureReason: 'SLIPPAGE_TOLERANCE_EXCEEDED',
        netProfitUsd: 0,
        actualGasUsd: opp.estimatedGasFeeUsd,
        actualSlippagePercent: opp.actualSlippagePercent,
      };
    }

    // 4. Gas Fee Ceiling Check
    if (opp.estimatedGasFeeUsd > maxGas) {
      return {
        success: false,
        failureReason: 'GAS_LIMIT_EXCEEDED',
        netProfitUsd: 0,
        actualGasUsd: opp.estimatedGasFeeUsd,
        actualSlippagePercent: opp.actualSlippagePercent,
      };
    }

    // 5. Net Profit Requirement Check
    const scaledGrossProfit = opp.expectedGrossProfitUsd * (tradeAmount / opp.borrowAmountUsd);
    const netProfit = scaledGrossProfit - opp.estimatedGasFeeUsd - opp.estimatedFlashFeeUsd;

    if (netProfit < minProfit) {
      return {
        success: false,
        failureReason: 'MIN_PROFIT_REQUIREMENT_UNMET',
        netProfitUsd: Number(netProfit.toFixed(2)),
        actualGasUsd: opp.estimatedGasFeeUsd,
        actualSlippagePercent: opp.actualSlippagePercent,
      };
    }

    return {
      success: true,
      netProfitUsd: Number(netProfit.toFixed(2)),
      actualGasUsd: opp.estimatedGasFeeUsd,
      actualSlippagePercent: opp.actualSlippagePercent,
    };
  }
}

export class FlashLoanArbitrageSurveillanceServiceHandler {
  private static domainState: FlashLoanArbitrageDomainState = new FlashLoanArbitrageDomainState(
    INITIAL_SURVEILLANCE_OPPORTUNITIES,
    INITIAL_AUDIT_RECORDS
  );

  public static getDomainState(): FlashLoanArbitrageDomainState {
    return this.domainState;
  }

  public static resetDomainState(
    initialOpps: FlashLoanArbitrageSurveillanceOpportunity[] = INITIAL_SURVEILLANCE_OPPORTUNITIES,
    initialRecords: FlashLoanArbitrageAuditRecord[] = INITIAL_AUDIT_RECORDS
  ): void {
    this.domainState = new FlashLoanArbitrageDomainState(initialOpps, initialRecords);
  }

  public static fetchOpportunities(
    filters?: Partial<ArbitrageSurveillanceFilterOptions>
  ): FlashLoanArbitrageSurveillanceOpportunity[] {
    return this.domainState.getOpportunities(filters);
  }

  public static fetchOpportunityDetails(id: string): FlashLoanArbitrageSurveillanceOpportunity | undefined {
    return this.domainState.getOpportunityById(id);
  }

  public static registerNewOpportunity(
    payload: Omit<FlashLoanArbitrageSurveillanceOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): FlashLoanArbitrageSurveillanceOpportunity {
    return this.domainState.registerOpportunity(payload);
  }

  public static fetchAuditRecords(): FlashLoanArbitrageAuditRecord[] {
    return this.domainState.getAuditRecords();
  }

  public static executeArbitrageSimulation(
    opportunityId: string,
    customParams?: Partial<ArbitrageSimulationParameters>
  ): FlashLoanArbitrageAuditRecord {
    const existing = this.domainState.getExistingRecordForOpportunity(opportunityId);
    if (existing) {
      return existing;
    }

    const opp = this.domainState.getOpportunityById(opportunityId);
    if (!opp) throw new Error(`Flash loan arbitrage opportunity ${opportunityId} not found.`);

    this.domainState.updateOpportunityStatus(opportunityId, 'SIMULATING');

    const evalResult = FlashLoanArbitrageSurveillanceEngine.evaluateExecution(opp, customParams);

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const auditId = `AUD-${crypto.randomUUID()}`;

    const record: FlashLoanArbitrageAuditRecord = {
      id: auditId,
      opportunityId,
      tokenPair: opp.tokenPair,
      borrowAsset: opp.borrowAsset,
      borrowAmountUsd: opp.borrowAmountUsd,
      netProfitUsd: evalResult.netProfitUsd,
      gasPaidUsd: evalResult.actualGasUsd,
      flashFeePaidUsd: opp.estimatedFlashFeeUsd,
      actualSlippagePercent: evalResult.actualSlippagePercent,
      executionTxHash: txHash,
      executedTimestamp: 'Just now',
      status: evalResult.success ? 'EXECUTED_SUCCESS' : 'EXECUTED_REVERT',
      failureReason: evalResult.failureReason,
    };

    const finalStatus = evalResult.success ? 'EXECUTED_SUCCESS' : 'EXECUTED_REVERT';
    this.domainState.updateOpportunityStatus(opportunityId, finalStatus, evalResult.failureReason, txHash);
    this.domainState.recordExecution(record);

    return record;
  }
}
