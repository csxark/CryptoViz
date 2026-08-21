/**
 * Flash Loan Arbitrage Surveillance & Execution Modeling.
 * 
 * Domain models and data contracts for tracking cross-DEX flash loan
 * arbitrage opportunities, route optimization, execution constraints,
 * risk scoring, and audit log records.
 */

export type ArbitrageExecutionRisk = 'low' | 'moderate' | 'high' | 'extreme';
export type FlashLoanProtocol = 'Aave V3' | 'Euler' | 'MakerDAO' | 'Uniswap V3 Flash' | 'Balancer Flash';
export type ArbitrageStatus = 'MONITORING' | 'SIMULATING' | 'EXECUTED_SUCCESS' | 'EXECUTED_REVERT';

export interface DexLegRoute {
  step: number;
  dexName: string;
  poolPair: string;
  feeTierPercent: number;
  expectedSlippagePercent: number;
}

export interface FlashLoanArbitrageSurveillanceOpportunity {
  id: string;
  tokenPair: string;
  flashLoanProtocol: FlashLoanProtocol;
  borrowAsset: string;
  borrowAmountUsd: number;
  sourceDex: string;
  targetDex: string;
  routes: DexLegRoute[];
  expectedGrossProfitUsd: number;
  estimatedGasFeeUsd: number;
  estimatedFlashFeeUsd: number;
  netProfitUsd: number;
  profitMarginPercentage: number;
  executionRisk: ArbitrageExecutionRisk;
  status: ArbitrageStatus;
  detectedTimestamp: string;
  availableLiquidityUsd: number;
  maxAllowedSlippagePercent: number;
  actualSlippagePercent: number;
  maxAllowedGasFeeUsd: number;
  minRequiredProfitUsd: number;
  failureReason?: string;
  executionTxHash?: string;
}

export interface FlashLoanArbitrageAuditRecord {
  id: string;
  opportunityId: string;
  tokenPair: string;
  borrowAsset: string;
  borrowAmountUsd: number;
  netProfitUsd: number;
  gasPaidUsd: number;
  flashFeePaidUsd: number;
  actualSlippagePercent: number;
  executionTxHash: string;
  executedTimestamp: string;
  status: 'EXECUTED_SUCCESS' | 'EXECUTED_REVERT';
  failureReason?: string;
}

export interface ArbitrageSurveillanceFilterOptions {
  borrowAsset: string;
  executionRisk: string;
  flashLoanProtocol: string;
  statusFilter: string;
  searchQuery: string;
}

export interface ArbitrageSimulationParameters {
  opportunityId: string;
  tradeAmountUsd: number;
  maxAllowedSlippagePercent: number;
  minRequiredProfitUsd: number;
  maxAllowedGasFeeUsd: number;
}

export class FlashLoanArbitrageDomainState {
  private opportunities: Map<string, FlashLoanArbitrageSurveillanceOpportunity>;
  private auditRecords: Map<string, FlashLoanArbitrageAuditRecord>;
  private opportunityAuditMap: Map<string, FlashLoanArbitrageAuditRecord>;

  constructor(
    initialOpps: FlashLoanArbitrageSurveillanceOpportunity[] = [],
    initialRecords: FlashLoanArbitrageAuditRecord[] = []
  ) {
    this.opportunities = new Map();
    this.auditRecords = new Map();
    this.opportunityAuditMap = new Map();

    initialOpps.forEach((opp) => this.opportunities.set(opp.id, { ...opp }));
    initialRecords.forEach((rec) => {
      this.auditRecords.set(rec.id, { ...rec });
      this.opportunityAuditMap.set(rec.opportunityId, { ...rec });
    });
  }

  public getOpportunities(filters?: Partial<ArbitrageSurveillanceFilterOptions>): FlashLoanArbitrageSurveillanceOpportunity[] {
    let result = Array.from(this.opportunities.values());
    if (!filters) return result;

    if (filters.borrowAsset && filters.borrowAsset !== 'All') {
      result = result.filter((o) => o.borrowAsset === filters.borrowAsset);
    }

    if (filters.executionRisk && filters.executionRisk !== 'All') {
      result = result.filter((o) => o.executionRisk === filters.executionRisk);
    }

    if (filters.flashLoanProtocol && filters.flashLoanProtocol !== 'All') {
      result = result.filter((o) => o.flashLoanProtocol === filters.flashLoanProtocol);
    }

    if (filters.statusFilter && filters.statusFilter !== 'All') {
      result = result.filter((o) => o.status === filters.statusFilter);
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.tokenPair.toLowerCase().includes(q) ||
          o.sourceDex.toLowerCase().includes(q) ||
          o.targetDex.toLowerCase().includes(q) ||
          o.flashLoanProtocol.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getOpportunityById(id: string): FlashLoanArbitrageSurveillanceOpportunity | undefined {
    const opp = this.opportunities.get(id);
    return opp ? { ...opp } : undefined;
  }

  public registerOpportunity(
    opp: Omit<FlashLoanArbitrageSurveillanceOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): FlashLoanArbitrageSurveillanceOpportunity {
    const id = `arb-surv-${crypto.randomUUID()}`;
    const newOpp: FlashLoanArbitrageSurveillanceOpportunity = {
      ...opp,
      id,
      status: 'MONITORING',
      detectedTimestamp: 'Just now',
    };
    this.opportunities.set(id, newOpp);
    return { ...newOpp };
  }

  public updateOpportunityStatus(
    id: string,
    status: ArbitrageStatus,
    failureReason?: string,
    txHash?: string
  ): void {
    const opp = this.opportunities.get(id);
    if (!opp) throw new Error(`Opportunity ${id} not found.`);

    opp.status = status;
    if (failureReason) opp.failureReason = failureReason;
    if (txHash) opp.executionTxHash = txHash;

    this.opportunities.set(id, opp);
  }

  public getAuditRecords(): FlashLoanArbitrageAuditRecord[] {
    return Array.from(this.auditRecords.values());
  }

  public getExistingRecordForOpportunity(opportunityId: string): FlashLoanArbitrageAuditRecord | undefined {
    return this.opportunityAuditMap.get(opportunityId);
  }

  public recordExecution(record: FlashLoanArbitrageAuditRecord): void {
    this.auditRecords.set(record.id, record);
    this.opportunityAuditMap.set(record.opportunityId, record);
  }
}
