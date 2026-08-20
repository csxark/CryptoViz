export type SimulationStatus = 'DETECTED' | 'SIMULATING' | 'SIMULATED_SUCCESS' | 'SIMULATED_REVERT';

export type SimulationFailureReason =
  | 'SLIPPAGE_EXCEEDED'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'GAS_CONSTRAINT_FAILED'
  | 'INVALID_PARAMETERS'
  | 'EXECUTION_CONSTRAINT_FAILED';

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
  status: SimulationStatus;
  detectedTimestamp: string;

  // Simulation execution constraints & parameters
  availableLiquidityUsd?: number;
  maxSlippageTolerancePercentage?: number;
  actualSlippagePercentage?: number;
  maxGasFeeLimitUsd?: number;
  minNetProfitRequirementUsd?: number;
  failureReason?: SimulationFailureReason;
  simulationId?: string;
}

export interface ArbitrageSimulationRecord {
  id: string; // Identifier format: SIM-<UUID>
  opportunityId: string;
  tokenPair: string;
  borrowAsset: string;
  loanAmountUsd: number;
  simulatedNetProfitUsd: number;
  simulatedGasPaidUsd: number;
  simulatedSlippagePercentage: number;
  simulationIdentifier: string;
  executedTimestamp: string;
  status: 'SIMULATED_SUCCESS' | 'SIMULATED_REVERT';
  failureReason?: SimulationFailureReason;
}

export interface ArbitrageFilterOptions {
  borrowAsset: string;
  executionRisk: string;
  searchQuery: string;
  statusFilter?: string;
}

export interface SimulationParams {
  opportunityId: string;
  tradeAmountUsd: number;
  maxAllowedSlippagePercent: number;
  minRequiredProfitUsd: number;
  maxAllowedGasFeeUsd: number;
}

/**
 * Domain State Instance class for Simulation Engine State Management.
 * Replaces static mutable service state with instance-based domain level state.
 */
export class ArbitrageSimulationDomainState {
  private opportunities: Map<string, FlashLoanArbitrageOpportunity>;
  private simulationRecords: Map<string, ArbitrageSimulationRecord>;
  private opportunitySimulations: Map<string, ArbitrageSimulationRecord>; // Idempotency mapping: opportunityId -> Record

  constructor(
    initialOpps: FlashLoanArbitrageOpportunity[] = [],
    initialRecords: ArbitrageSimulationRecord[] = []
  ) {
    this.opportunities = new Map();
    this.simulationRecords = new Map();
    this.opportunitySimulations = new Map();

    initialOpps.forEach((opp) => this.opportunities.set(opp.id, { ...opp }));
    initialRecords.forEach((rec) => {
      this.simulationRecords.set(rec.id, { ...rec });
      this.opportunitySimulations.set(rec.opportunityId, { ...rec });
    });
  }

  public getOpportunities(options?: Partial<ArbitrageFilterOptions>): FlashLoanArbitrageOpportunity[] {
    let result = Array.from(this.opportunities.values());
    if (!options) return result;

    if (options.borrowAsset && options.borrowAsset !== 'All') {
      result = result.filter((o) => o.borrowAsset === options.borrowAsset);
    }

    if (options.executionRisk && options.executionRisk !== 'All') {
      result = result.filter((o) => o.executionRisk === options.executionRisk);
    }

    if (options.statusFilter && options.statusFilter !== 'All') {
      result = result.filter((o) => o.status === options.statusFilter);
    }

    if (options.searchQuery && options.searchQuery.trim() !== '') {
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

  public getOpportunityById(id: string): FlashLoanArbitrageOpportunity | undefined {
    const opp = this.opportunities.get(id);
    return opp ? { ...opp } : undefined;
  }

  public registerOpportunity(
    opp: Omit<FlashLoanArbitrageOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): FlashLoanArbitrageOpportunity {
    const id = `arb-sim-${crypto.randomUUID()}`;
    const newOpp: FlashLoanArbitrageOpportunity = {
      ...opp,
      id,
      status: 'DETECTED',
      detectedTimestamp: 'Just now',
      availableLiquidityUsd: opp.availableLiquidityUsd ?? opp.loanAmountUsd * 2.5,
      maxSlippageTolerancePercentage: opp.maxSlippageTolerancePercentage ?? 1.5,
      actualSlippagePercentage: opp.actualSlippagePercentage ?? 0.45,
      maxGasFeeLimitUsd: opp.maxGasFeeLimitUsd ?? opp.estimatedGasFeeUsd * 1.5,
      minNetProfitRequirementUsd: opp.minNetProfitRequirementUsd ?? 100,
    };
    this.opportunities.set(id, newOpp);
    return { ...newOpp };
  }

  public updateOpportunityStatus(
    id: string,
    status: SimulationStatus,
    failureReason?: SimulationFailureReason,
    simId?: string
  ): void {
    const opp = this.opportunities.get(id);
    if (!opp) throw new Error(`Opportunity ${id} not found.`);

    // Enforce explicit state machine transitions
    this.validateStateTransition(opp.status, status);

    opp.status = status;
    if (failureReason) opp.failureReason = failureReason;
    if (simId) opp.simulationId = simId;

    this.opportunities.set(id, opp);
  }

  public getSimulationRecords(): ArbitrageSimulationRecord[] {
    return Array.from(this.simulationRecords.values());
  }

  public getExistingSimulationForOpportunity(opportunityId: string): ArbitrageSimulationRecord | undefined {
    return this.opportunitySimulations.get(opportunityId);
  }

  public recordSimulationResult(record: ArbitrageSimulationRecord): void {
    this.simulationRecords.set(record.id, record);
    this.opportunitySimulations.set(record.opportunityId, record);
  }

  private validateStateTransition(current: SimulationStatus, next: SimulationStatus): void {
    const validTransitions: Record<SimulationStatus, SimulationStatus[]> = {
      DETECTED: ['SIMULATING'],
      SIMULATING: ['SIMULATED_SUCCESS', 'SIMULATED_REVERT'],
      SIMULATED_SUCCESS: [],
      SIMULATED_REVERT: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new Error(`Invalid simulation state transition from ${current} to ${next}`);
    }
  }
}
