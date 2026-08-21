/**
 * Portfolio Risk & Automated Rebalancing Domain Model.
 * Data contracts for crypto portfolio allocation, risk metrics (Sharpe, Max Drawdown),
 * rebalancing simulation parameters, and execution logs.
 */

export type PortfolioRiskCategory = 'Conservative' | 'Balanced' | 'Aggressive Growth' | 'DeFi Alpha';
export type RebalanceStatus = 'MONITORING' | 'SIMULATING_REBALANCE' | 'REBALANCED_SUCCESS' | 'REBALANCE_REVERT';

export interface AssetAllocation {
  assetSymbol: string;
  currentWeightPercent: number;
  targetWeightPercent: number;
  currentValueUsd: number;
  driftPercent: number;
}

export interface RiskMetricsProfile {
  sharpeRatio: number;
  maxDrawdownPercent: number;
  volatilityAnnualPercent: number;
  betaToBtc: number;
}

export interface PortfolioRiskOpportunity {
  id: string;
  portfolioName: string;
  ownerAddress: string;
  totalPortfolioValueUsd: number;
  allocations: AssetAllocation[];
  riskMetrics: RiskMetricsProfile;
  riskCategory: PortfolioRiskCategory;
  rebalanceThresholdPercent: number;
  estimatedRebalanceGasUsd: number;
  status: RebalanceStatus;
  detectedTimestamp: string;
}

export interface PortfolioRebalanceAuditRecord {
  id: string;
  opportunityId: string;
  portfolioName: string;
  portfolioValueUsd: number;
  rebalancedAssetsCount: number;
  gasPaidUsd: number;
  executionTxHash: string;
  executedTimestamp: string;
  status: 'REBALANCED_SUCCESS' | 'REBALANCE_REVERT';
  failureReason?: string;
}

export interface PortfolioFilterOptions {
  riskCategory: string;
  searchQuery: string;
}

export class PortfolioRiskDomainState {
  private opportunities: Map<string, PortfolioRiskOpportunity>;
  private auditRecords: Map<string, PortfolioRebalanceAuditRecord>;
  private opportunityAuditMap: Map<string, PortfolioRebalanceAuditRecord>;

  constructor(
    initialOpps: PortfolioRiskOpportunity[] = [],
    initialRecords: PortfolioRebalanceAuditRecord[] = []
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

  public getOpportunities(filters?: Partial<PortfolioFilterOptions>): PortfolioRiskOpportunity[] {
    let result = Array.from(this.opportunities.values());
    if (!filters) return result;

    if (filters.riskCategory && filters.riskCategory !== 'All') {
      result = result.filter((o) => o.riskCategory === filters.riskCategory);
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.portfolioName.toLowerCase().includes(q) ||
          o.ownerAddress.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public getOpportunityById(id: string): PortfolioRiskOpportunity | undefined {
    const opp = this.opportunities.get(id);
    return opp ? { ...opp } : undefined;
  }

  public registerOpportunity(
    opp: Omit<PortfolioRiskOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): PortfolioRiskOpportunity {
    const id = `port-risk-${crypto.randomUUID()}`;
    const newOpp: PortfolioRiskOpportunity = {
      ...opp,
      id,
      status: 'MONITORING',
      detectedTimestamp: 'Just now',
    };
    this.opportunities.set(id, newOpp);
    return { ...newOpp };
  }

  public updateStatus(id: string, status: RebalanceStatus, failureReason?: string): void {
    const opp = this.opportunities.get(id);
    if (!opp) throw new Error(`Portfolio ${id} not found.`);
    opp.status = status;
    this.opportunities.set(id, opp);
  }

  public getAuditRecords(): PortfolioRebalanceAuditRecord[] {
    return Array.from(this.auditRecords.values());
  }

  public getExistingRecord(opportunityId: string): PortfolioRebalanceAuditRecord | undefined {
    return this.opportunityAuditMap.get(opportunityId);
  }

  public recordExecution(record: PortfolioRebalanceAuditRecord): void {
    this.auditRecords.set(record.id, record);
    this.opportunityAuditMap.set(record.opportunityId, record);
  }
}
