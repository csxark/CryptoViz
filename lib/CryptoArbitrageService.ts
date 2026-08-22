import {
  FlashLoanArbitrageOpportunity,
  ArbitrageSimulationRecord,
  ArbitrageFilterOptions,
  SimulationParams,
  SimulationFailureReason,
  ArbitrageSimulationDomainState,
} from './CryptoArbitrageModel';

const INITIAL_OPPORTUNITIES: FlashLoanArbitrageOpportunity[] = [
  {
    id: 'arb-sim-101',
    tokenPair: 'WETH / DAI',
    sourceDex: 'Uniswap V3',
    targetDex: 'Sushiswap',
    borrowAsset: 'WETH',
    loanAmountUsd: 500000,
    expectedGrossProfitUsd: 4850,
    estimatedGasFeeUsd: 620,
    netProfitUsd: 4230,
    profitMarginPercentage: 0.85,
    executionRisk: 'low',
    status: 'DETECTED',
    detectedTimestamp: '10 seconds ago',
    availableLiquidityUsd: 1500000,
    maxSlippageTolerancePercentage: 1.5,
    actualSlippagePercentage: 0.35,
    maxGasFeeLimitUsd: 1000,
    minNetProfitRequirementUsd: 500,
  },
  {
    id: 'arb-sim-102',
    tokenPair: 'WBTC / USDC',
    sourceDex: 'Curve Finance',
    targetDex: 'Uniswap V3',
    borrowAsset: 'USDC',
    loanAmountUsd: 1200000,
    expectedGrossProfitUsd: 9400,
    estimatedGasFeeUsd: 1100,
    netProfitUsd: 8300,
    profitMarginPercentage: 0.69,
    executionRisk: 'moderate',
    status: 'DETECTED',
    detectedTimestamp: '45 seconds ago',
    availableLiquidityUsd: 2500000,
    maxSlippageTolerancePercentage: 1.0,
    actualSlippagePercentage: 0.55,
    maxGasFeeLimitUsd: 1500,
    minNetProfitRequirementUsd: 1000,
  },
  {
    id: 'arb-sim-103',
    tokenPair: 'SOL / USDT',
    sourceDex: 'Raydium',
    targetDex: 'Orca',
    borrowAsset: 'USDT',
    loanAmountUsd: 250000,
    expectedGrossProfitUsd: 3100,
    estimatedGasFeeUsd: 180,
    netProfitUsd: 2920,
    profitMarginPercentage: 1.17,
    executionRisk: 'high',
    status: 'DETECTED',
    detectedTimestamp: '2 minutes ago',
    availableLiquidityUsd: 180000, // Insufficient liquidity for loanAmountUsd 250000 -> will trigger SIMULATED_REVERT
    maxSlippageTolerancePercentage: 0.8,
    actualSlippagePercentage: 1.45,
    maxGasFeeLimitUsd: 300,
    minNetProfitRequirementUsd: 500,
  },
];

const INITIAL_RECORDS: ArbitrageSimulationRecord[] = [
  {
    id: 'SIM-7e11a9f0-8c23-4567-9123-112233445566',
    opportunityId: 'arb-sim-101',
    tokenPair: 'WETH / DAI',
    borrowAsset: 'WETH',
    loanAmountUsd: 500000,
    simulatedNetProfitUsd: 4180,
    simulatedGasPaidUsd: 605,
    simulatedSlippagePercentage: 0.35,
    simulationIdentifier: 'SIM-7e11a9f0-8c23-4567-9123-112233445566',
    executedTimestamp: 'Aug 18, 2026',
    status: 'SIMULATED_SUCCESS',
  },
];

/**
 * Deterministic Simulation Engine.
 * Evaluates trade parameters, scaled profitability, slippage, liquidity, gas cost, and execution constraints.
 * 
 * Mathematical Model:
 *   scaledGrossProfit = expectedGrossProfitUsd * (tradeAmountUsd / loanAmountUsd)
 *   simulatedSlippageCost = tradeAmountUsd * (actualSlippagePercentage / 100)
 *   netProfitUsd = scaledGrossProfit - simulatedGasFeeUsd - simulatedSlippageCost
 */
export class DeterministicArbitrageSimulationEngine {
  public static evaluate(
    opportunity: FlashLoanArbitrageOpportunity,
    params?: Partial<SimulationParams>
  ): {
    success: boolean;
    failureReason?: SimulationFailureReason;
    netProfitUsd: number;
    actualGasUsd: number;
    slippagePercentage: number;
  } {
    const tradeAmount = params?.tradeAmountUsd ?? opportunity.loanAmountUsd;
    const maxSlippage = params?.maxAllowedSlippagePercent ?? opportunity.maxSlippageTolerancePercentage ?? 1.0;
    const minProfit = params?.minRequiredProfitUsd ?? opportunity.minNetProfitRequirementUsd ?? 0;
    const maxGas = params?.maxAllowedGasFeeUsd ?? opportunity.maxGasFeeLimitUsd ?? 5000;

    // 1. Domain-Level Parameter Validation (Reject non-finite numbers, negative values, and zero limits)
    if (
      !Number.isFinite(tradeAmount) ||
      tradeAmount <= 0 ||
      !Number.isFinite(maxSlippage) ||
      maxSlippage < 0 ||
      !Number.isFinite(minProfit) ||
      !Number.isFinite(maxGas) ||
      maxGas <= 0 ||
      !Number.isFinite(opportunity.loanAmountUsd) ||
      opportunity.loanAmountUsd <= 0 ||
      !Number.isFinite(opportunity.expectedGrossProfitUsd) ||
      opportunity.expectedGrossProfitUsd < 0 ||
      !Number.isFinite(opportunity.estimatedGasFeeUsd) ||
      opportunity.estimatedGasFeeUsd < 0
    ) {
      return {
        success: false,
        failureReason: 'INVALID_PARAMETERS',
        netProfitUsd: 0,
        actualGasUsd: 0,
        slippagePercentage: 0,
      };
    }

    // 2. Liquidity Simulation Check (No negative liquidity allowed)
    const availableLiquidity = opportunity.availableLiquidityUsd ?? tradeAmount * 2;
    if (!Number.isFinite(availableLiquidity) || availableLiquidity < 0 || availableLiquidity < tradeAmount) {
      return {
        success: false,
        failureReason: 'INSUFFICIENT_LIQUIDITY',
        netProfitUsd: 0,
        actualGasUsd: opportunity.estimatedGasFeeUsd,
        slippagePercentage: 0,
      };
    }

    // 3. Slippage Simulation Check
    const actualSlippage = opportunity.actualSlippagePercentage ?? 0.5;
    if (!Number.isFinite(actualSlippage) || actualSlippage < 0 || actualSlippage > maxSlippage) {
      return {
        success: false,
        failureReason: 'SLIPPAGE_EXCEEDED',
        netProfitUsd: 0,
        actualGasUsd: opportunity.estimatedGasFeeUsd,
        slippagePercentage: Number.isFinite(actualSlippage) ? actualSlippage : 0,
      };
    }

    // 4. Gas Constraint Simulation Check
    const actualGas = opportunity.estimatedGasFeeUsd;
    if (actualGas > maxGas) {
      return {
        success: false,
        failureReason: 'GAS_CONSTRAINT_FAILED',
        netProfitUsd: 0,
        actualGasUsd: actualGas,
        slippagePercentage: actualSlippage,
      };
    }

    // 5. Scaled Profitability & Execution Constraint Check
    // Scaled gross profit proportional to custom trade amount vs base opportunity loan amount
    const scaledGrossProfit = opportunity.expectedGrossProfitUsd * (tradeAmount / opportunity.loanAmountUsd);
    const slippageCostUsd = tradeAmount * (actualSlippage / 100);
    const calculatedNetProfit = scaledGrossProfit - actualGas - slippageCostUsd;

    if (calculatedNetProfit < minProfit) {
      return {
        success: false,
        failureReason: 'EXECUTION_CONSTRAINT_FAILED',
        netProfitUsd: Number(calculatedNetProfit.toFixed(2)),
        actualGasUsd: actualGas,
        slippagePercentage: actualSlippage,
      };
    }

    return {
      success: true,
      netProfitUsd: Number(calculatedNetProfit.toFixed(2)),
      actualGasUsd: actualGas,
      slippagePercentage: actualSlippage,
    };
  }
}

/**
 * Service Handler for managing domain state and simulation executions.
 */
export class CryptoArbitrageServiceHandler {
  private static domainState: ArbitrageSimulationDomainState = new ArbitrageSimulationDomainState(
    INITIAL_OPPORTUNITIES,
    INITIAL_RECORDS
  );

  public static getDomainState(): ArbitrageSimulationDomainState {
    return this.domainState;
  }

  public static resetDomainState(
    initialOpps: FlashLoanArbitrageOpportunity[] = INITIAL_OPPORTUNITIES,
    initialRecords: ArbitrageSimulationRecord[] = INITIAL_RECORDS
  ): void {
    this.domainState = new ArbitrageSimulationDomainState(initialOpps, initialRecords);
  }

  public static fetchOpportunities(filters?: Partial<ArbitrageFilterOptions>): FlashLoanArbitrageOpportunity[] {
    return this.domainState.getOpportunities(filters);
  }

  public static fetchOpportunityDetails(id: string): FlashLoanArbitrageOpportunity | undefined {
    return this.domainState.getOpportunityById(id);
  }

  public static registerNewOpportunity(
    payload: Omit<FlashLoanArbitrageOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): FlashLoanArbitrageOpportunity {
    return this.domainState.registerOpportunity(payload);
  }

  public static fetchExecutionRecords(): ArbitrageSimulationRecord[] {
    return this.domainState.getSimulationRecords();
  }

  /**
   * Idempotent, Deterministic Simulation Execution Handler.
   */
  public static executeArbitrageSimulation(
    opportunityId: string,
    customParams?: Partial<SimulationParams>
  ): ArbitrageSimulationRecord {
    // 1. Idempotency Check: Return existing simulation if already executed
    const existing = this.domainState.getExistingSimulationForOpportunity(opportunityId);
    if (existing) {
      return existing;
    }

    const opp = this.domainState.getOpportunityById(opportunityId);
    if (!opp) throw new Error(`Flash loan arbitrage opportunity ${opportunityId} not found.`);

    // 2. Transition DETECTED -> SIMULATING
    this.domainState.updateOpportunityStatus(opportunityId, 'SIMULATING');

    // 3. Evaluate Simulation via Deterministic Engine
    const evalResult = DeterministicArbitrageSimulationEngine.evaluate(opp, customParams);

    // 4. Generate Non-Cryptographic Standard UUID Simulation Identifier with SIM- prefix
    const simUuid = `SIM-${crypto.randomUUID()}`;

    const newRecord: ArbitrageSimulationRecord = {
      id: simUuid,
      opportunityId,
      tokenPair: opp.tokenPair,
      borrowAsset: opp.borrowAsset,
      loanAmountUsd: opp.loanAmountUsd,
      simulatedNetProfitUsd: evalResult.netProfitUsd,
      simulatedGasPaidUsd: evalResult.actualGasUsd,
      simulatedSlippagePercentage: evalResult.slippagePercentage,
      simulationIdentifier: simUuid,
      executedTimestamp: 'Just now',
      status: evalResult.success ? 'SIMULATED_SUCCESS' : 'SIMULATED_REVERT',
      failureReason: evalResult.failureReason,
    };

    // 5. Transition SIMULATING -> SIMULATED_SUCCESS / SIMULATED_REVERT
    const finalStatus = evalResult.success ? 'SIMULATED_SUCCESS' : 'SIMULATED_REVERT';
    this.domainState.updateOpportunityStatus(opportunityId, finalStatus, evalResult.failureReason, simUuid);

    // 6. Record Durable Domain State Log
    this.domainState.recordSimulationResult(newRecord);

    return newRecord;
  }
}
