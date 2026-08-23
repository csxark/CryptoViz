/**
 * Additional Unit Tests for Telemetry Engine & Risk Guardrails
 */

import { describe, it, expect } from 'vitest';
import { FlashLoanTelemetryEngine } from '@/lib/FlashLoanTelemetryEngine';
import { FlashLoanGovernanceGuardrails } from '@/lib/FlashLoanGovernanceGuardrails';

describe('FlashLoan Governance & Telemetry Tests', () => {
  it('should generate accurate telemetry report', () => {
    const report = FlashLoanTelemetryEngine.generateReport([{ netProfitUsd: 1500 }, { netProfitUsd: 2500 }]);
    expect(report.totalOpportunitiesFound).toBe(2);
    expect(report.totalNetProfitUsd).toBe(4000);
  });

  it('should validate risk guardrails correctly', () => {
    const isAllowed = FlashLoanGovernanceGuardrails.validateOpportunityGuardrails(2000, 20, {
      maxBorrowLimitUsd: 5000000,
      minProfitMarginUsd: 500,
      maxGasGweiThreshold: 50
    });
    expect(isAllowed).toBe(true);
  });
});
