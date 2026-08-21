/**
 * Liquidity Pool Yield Farming & Impermanent Loss Analytics Domain Model.
 * Provides data models and contract definitions for multi-DEX yield farming,
 * impermanent loss risk calculations, auto-compounding strategies, and execution logs.
 */

export type YieldProtocolName = 'Curve Finance' | 'Convex Finance' | 'Yearn Vaults' | 'Aave V3 Staking' | 'Beefy Finance';
export type YieldPoolStatus = 'MONITORING' | 'SIMULATING_DEPOSIT' | 'FARMING_ACTIVE' | 'RISK_REVERT';
export type YieldRiskCategory = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Degenerate Yield';

export interface ImpermanentLossAnalysis {
  projectedTokenAPriceRatio: number;
  estimatedImpermanentLossPercent: number;
  netApyAfterImpermanentLoss: number;
  breakEvenDays: number;
}

export interface LiquidityPoolYieldOpportunity {
  id: string;
  poolName: string;
  protocol: YieldProtocolName;
  tokenPair: string;
  totalValueLockedUsd: number;
  baseApyPercent: number;
  rewardTokenApyPercent: number;
  netTotalApyPercent: number;
  rewardTokenSymbol: string;
  impermanentLossRisk: ImpermanentLossAnalysis;
  minimumDepositUsd: number;
  autoCompoundingFrequency: 'Daily' | 'Hourly' | 'Realtime';
  riskCategory: YieldRiskCategory;
  status: YieldPoolStatus;
  detectedTimestamp: string;
}

export interface YieldExecutionAuditRecord {
  id: string;
  opportunityId: string;
  poolName: string;
  protocol: YieldProtocolName;
  depositAmountUsd: number;
  lpTokensMinted: number;
  projectedAnnualYieldUsd: number;
  executionTxHash: string;
  executedTimestamp: string;
  status: 'FARMING_ACTIVE' | 'RISK_REVERT';
  failureReason?: string;
}

export interface YieldFilterOptions {
  protocol: string;
  riskCategory: string;
  rewardTokenSymbol: string;
  searchQuery: string;
}

export class YieldFarmingDomainState {
  private opportunities: Map<string, LiquidityPoolYieldOpportunity>;
  private auditRecords: Map<string, YieldExecutionAuditRecord>;
  private opportunityAuditMap: Map<string, YieldExecutionAuditRecord>;

  constructor(
    initialOpps: LiquidityPoolYieldOpportunity[] = [],
    initialRecords: YieldExecutionAuditRecord[] = []
  ) {
    this.opportunities = new Map();
    this.auditRecords = new Map();
    this.opportunityAuditMap = new Map();

    initialOpps.forEach((o) => this.opportunities.set(o.id, { ...o }));
    initialRecords.forEach((r) => {
      this.auditRecords.set(r.id, { ...r });
      this.opportunityAuditMap.set(r.opportunityId, { ...r });
    });
  }

  public getOpportunities(filters?: Partial<YieldFilterOptions>): LiquidityPoolYieldOpportunity[] {
    let result = Array.from(this.opportunities.values());
    if (!filters) return result;

    if (filters.protocol && filters.protocol !== 'All') {
      result = result.filter((o) => o.protocol === filters.protocol);
    }
    if (filters.riskCategory && filters.riskCategory !== 'All') {
      result = result.filter((o) => o.riskCategory === filters.riskCategory);
    }
    if (filters.rewardTokenSymbol && filters.rewardTokenSymbol !== 'All') {
      result = result.filter((o) => o.rewardTokenSymbol === filters.rewardTokenSymbol);
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.poolName.toLowerCase().includes(q) ||
          o.tokenPair.toLowerCase().includes(q) ||
          o.protocol.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public getOpportunityById(id: string): LiquidityPoolYieldOpportunity | undefined {
    const opp = this.opportunities.get(id);
    return opp ? { ...opp } : undefined;
  }

  public registerOpportunity(
    opp: Omit<LiquidityPoolYieldOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): LiquidityPoolYieldOpportunity {
    const id = `yield-pool-${crypto.randomUUID()}`;
    const newOpp: LiquidityPoolYieldOpportunity = {
      ...opp,
      id,
      status: 'MONITORING',
      detectedTimestamp: 'Just now',
    };
    this.opportunities.set(id, newOpp);
    return { ...newOpp };
  }

  public updateStatus(id: string, status: YieldPoolStatus, failureReason?: string): void {
    const opp = this.opportunities.get(id);
    if (!opp) throw new Error(`Yield Opportunity ${id} not found.`);
    opp.status = status;
    this.opportunities.set(id, opp);
  }

  public getAuditRecords(): YieldExecutionAuditRecord[] {
    return Array.from(this.auditRecords.values());
  }

  public getExistingRecord(opportunityId: string): YieldExecutionAuditRecord | undefined {
    return this.opportunityAuditMap.get(opportunityId);
  }

  public recordExecution(record: YieldExecutionAuditRecord): void {
    this.auditRecords.set(record.id, record);
    this.opportunityAuditMap.set(record.opportunityId, record);
  }
}
