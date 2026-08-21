import {
  PortfolioRiskOpportunity,
  PortfolioRebalanceAuditRecord,
  PortfolioFilterOptions,
  PortfolioRiskDomainState,
} from './CryptoPortfolioRiskModel';

const INITIAL_PORTFOLIO_OPPORTUNITIES: PortfolioRiskOpportunity[] = [
  {
    id: 'port-101',
    portfolioName: 'DeFi Blue-Chip Treasury',
    ownerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    totalPortfolioValueUsd: 1250000,
    allocations: [
      { assetSymbol: 'ETH', currentWeightPercent: 55, targetWeightPercent: 40, currentValueUsd: 687500, driftPercent: +15 },
      { assetSymbol: 'BTC', currentWeightPercent: 25, targetWeightPercent: 40, currentValueUsd: 312500, driftPercent: -15 },
      { assetSymbol: 'USDC', currentWeightPercent: 20, targetWeightPercent: 20, currentValueUsd: 250000, driftPercent: 0 },
    ],
    riskMetrics: {
      sharpeRatio: 2.15,
      maxDrawdownPercent: 14.2,
      volatilityAnnualPercent: 28.5,
      betaToBtc: 0.88,
    },
    riskCategory: 'Balanced',
    rebalanceThresholdPercent: 5.0,
    estimatedRebalanceGasUsd: 85,
    status: 'MONITORING',
    detectedTimestamp: '12m ago',
  },
  {
    id: 'port-102',
    portfolioName: 'Aggressive Altcoin Growth Vault',
    ownerAddress: '0x28C6c06298d514Db089934071355E5743bf21d60',
    totalPortfolioValueUsd: 480000,
    allocations: [
      { assetSymbol: 'SOL', currentWeightPercent: 45, targetWeightPercent: 25, currentValueUsd: 216000, driftPercent: +20 },
      { assetSymbol: 'AVAX', currentWeightPercent: 35, targetWeightPercent: 25, currentValueUsd: 168000, driftPercent: +10 },
      { assetSymbol: 'LINK', currentWeightPercent: 20, targetWeightPercent: 50, currentValueUsd: 96000, driftPercent: -30 },
    ],
    riskMetrics: {
      sharpeRatio: 1.45,
      maxDrawdownPercent: 38.5, // High drawdown triggers risk warnings
      volatilityAnnualPercent: 62.0,
      betaToBtc: 1.65,
    },
    riskCategory: 'Aggressive Growth',
    rebalanceThresholdPercent: 8.0,
    estimatedRebalanceGasUsd: 120,
    status: 'MONITORING',
    detectedTimestamp: '35m ago',
  },
];

const INITIAL_PORTFOLIO_AUDIT_RECORDS: PortfolioRebalanceAuditRecord[] = [
  {
    id: 'AUD-PORT-3301',
    opportunityId: 'port-101',
    portfolioName: 'DeFi Blue-Chip Treasury',
    portfolioValueUsd: 1250000,
    rebalancedAssetsCount: 3,
    gasPaidUsd: 82,
    executionTxHash: '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
    executedTimestamp: 'Aug 17, 2026',
    status: 'REBALANCED_SUCCESS',
  },
];

export class PortfolioRiskEngine {
  public static evaluate(
    opp: PortfolioRiskOpportunity
  ): { success: boolean; failureReason?: string; maxDriftPercent: number; gasPaidUsd: number } {
    const maxDrift = Math.max(...opp.allocations.map((a) => Math.abs(a.driftPercent)));

    if (maxDrift < opp.rebalanceThresholdPercent) {
      return { success: false, failureReason: 'ALLOCATION_DRIFT_BELOW_REBALANCE_THRESHOLD', maxDriftPercent: maxDrift, gasPaidUsd: 0 };
    }

    if (opp.riskMetrics.maxDrawdownPercent > 50.0) {
      return { success: false, failureReason: 'PORTFOLIO_MAX_DRAWDOWN_EXCEEDED_SAFETY_LIMIT', maxDriftPercent: maxDrift, gasPaidUsd: opp.estimatedRebalanceGasUsd };
    }

    return { success: true, maxDriftPercent: maxDrift, gasPaidUsd: opp.estimatedRebalanceGasUsd };
  }
}

export class PortfolioRiskServiceHandler {
  private static domainState: PortfolioRiskDomainState = new PortfolioRiskDomainState(
    INITIAL_PORTFOLIO_OPPORTUNITIES,
    INITIAL_PORTFOLIO_AUDIT_RECORDS
  );

  public static getDomainState(): PortfolioRiskDomainState {
    return this.domainState;
  }

  public static fetchOpportunities(filters?: Partial<PortfolioFilterOptions>): PortfolioRiskOpportunity[] {
    return this.domainState.getOpportunities(filters);
  }

  public static fetchAuditRecords(): PortfolioRebalanceAuditRecord[] {
    return this.domainState.getAuditRecords();
  }

  public static registerOpportunity(
    payload: Omit<PortfolioRiskOpportunity, 'id' | 'status' | 'detectedTimestamp'>
  ): PortfolioRiskOpportunity {
    return this.domainState.registerOpportunity(payload);
  }

  public static executeRebalanceSimulation(opportunityId: string): PortfolioRebalanceAuditRecord {
    const existing = this.domainState.getExistingRecord(opportunityId);
    if (existing) return existing;

    const opp = this.domainState.getOpportunityById(opportunityId);
    if (!opp) throw new Error(`Portfolio ${opportunityId} not found.`);

    this.domainState.updateStatus(opportunityId, 'SIMULATING_REBALANCE');
    const result = PortfolioRiskEngine.evaluate(opp);

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const record: PortfolioRebalanceAuditRecord = {
      id: `AUD-PORT-${crypto.randomUUID()}`,
      opportunityId,
      portfolioName: opp.portfolioName,
      portfolioValueUsd: opp.totalPortfolioValueUsd,
      rebalancedAssetsCount: opp.allocations.length,
      gasPaidUsd: result.gasPaidUsd,
      executionTxHash: txHash,
      executedTimestamp: 'Just now',
      status: result.success ? 'REBALANCED_SUCCESS' : 'REBALANCE_REVERT',
      failureReason: result.failureReason,
    };

    this.domainState.updateStatus(opportunityId, result.success ? 'REBALANCED_SUCCESS' : 'REBALANCE_REVERT', result.failureReason);
    this.domainState.recordExecution(record);
    return record;
  }
}
