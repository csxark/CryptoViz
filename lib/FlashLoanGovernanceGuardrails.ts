/**
 * Enterprise Flash Loan Governance & Risk Guardrails
 */

export interface RiskGuardrail {
  maxBorrowLimitUsd: number;
  minProfitMarginUsd: number;
  maxGasGweiThreshold: number;
}

export class FlashLoanGovernanceGuardrails {
  public static validateOpportunityGuardrails(netProfitUsd: number, gasGwei: number, guardrails: RiskGuardrail): boolean {
    return netProfitUsd >= guardrails.minProfitMarginUsd && gasGwei <= guardrails.maxGasGweiThreshold;
  }
}
