import { describe, it, expect, beforeEach } from 'vitest';
import {
  CryptoArbitrageServiceHandler,
  DeterministicArbitrageSimulationEngine,
} from '../../lib/CryptoArbitrageService';
import {
  ArbitrageSimulationDomainState,
  FlashLoanArbitrageOpportunity,
  ArbitrageSimulationRecord,
} from '../../lib/CryptoArbitrageModel';

describe('Deterministic Arbitrage Simulation Engine & Domain State', () => {
  const sampleOpp: FlashLoanArbitrageOpportunity = {
    id: 'opp-test-1',
    tokenPair: 'WETH / DAI',
    sourceDex: 'Uniswap V3',
    targetDex: 'Sushiswap',
    borrowAsset: 'WETH',
    loanAmountUsd: 100000,
    expectedGrossProfitUsd: 2000,
    estimatedGasFeeUsd: 300,
    netProfitUsd: 1700,
    profitMarginPercentage: 1.7,
    executionRisk: 'low',
    status: 'DETECTED',
    detectedTimestamp: 'Just now',
    availableLiquidityUsd: 500000,
    maxSlippageTolerancePercentage: 1.0,
    actualSlippagePercentage: 0.4,
    maxGasFeeLimitUsd: 500,
    minNetProfitRequirementUsd: 500,
  };

  beforeEach(() => {
    CryptoArbitrageServiceHandler.resetDomainState([sampleOpp], []);
  });

  describe('Deterministic Engine Evaluation', () => {
    it('returns success for valid parameters within tolerance and calculates net profit deterministically', () => {
      const result = DeterministicArbitrageSimulationEngine.evaluate(sampleOpp);
      expect(result.success).toBe(true);
      // Scaled gross profit: 2000 * (100000/100000) = 2000
      // Slippage cost: 100000 * (0.4 / 100) = 400
      // Net profit: 2000 - 300 - 400 = 1300
      expect(result.netProfitUsd).toBe(1300);
      expect(result.failureReason).toBeUndefined();
    });

    it('scales gross profit and net profit proportionally when custom trade amount is provided', () => {
      // Half trade amount: 50,000 USD
      // Scaled gross profit: 2000 * (50000/100000) = 1000
      // Slippage cost: 50000 * (0.4 / 100) = 200
      // Net profit: 1000 - 300 - 200 = 500
      const result = DeterministicArbitrageSimulationEngine.evaluate(sampleOpp, {
        tradeAmountUsd: 50000,
      });
      expect(result.success).toBe(true);
      expect(result.netProfitUsd).toBe(500);
    });

    it('returns SLIPPAGE_EXCEEDED when actual slippage exceeds max allowed', () => {
      const oppWithHighSlippage = { ...sampleOpp, actualSlippagePercentage: 2.5 };
      const result = DeterministicArbitrageSimulationEngine.evaluate(oppWithHighSlippage);
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('SLIPPAGE_EXCEEDED');
    });

    it('returns INSUFFICIENT_LIQUIDITY when loan amount exceeds available liquidity', () => {
      const oppLowLiquidity = { ...sampleOpp, availableLiquidityUsd: 50000 };
      const result = DeterministicArbitrageSimulationEngine.evaluate(oppLowLiquidity);
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('INSUFFICIENT_LIQUIDITY');
    });

    it('returns GAS_CONSTRAINT_FAILED when gas exceeds allowed limit', () => {
      const oppHighGas = { ...sampleOpp, estimatedGasFeeUsd: 800 };
      const result = DeterministicArbitrageSimulationEngine.evaluate(oppHighGas);
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('GAS_CONSTRAINT_FAILED');
    });

    it('returns INVALID_PARAMETERS for non-finite, negative, or invalid parameter inputs', () => {
      expect(DeterministicArbitrageSimulationEngine.evaluate(sampleOpp, { tradeAmountUsd: -500 }).failureReason).toBe('INVALID_PARAMETERS');
      expect(DeterministicArbitrageSimulationEngine.evaluate(sampleOpp, { tradeAmountUsd: NaN }).failureReason).toBe('INVALID_PARAMETERS');
      expect(DeterministicArbitrageSimulationEngine.evaluate(sampleOpp, { maxAllowedSlippagePercent: Infinity }).failureReason).toBe('INVALID_PARAMETERS');
      expect(DeterministicArbitrageSimulationEngine.evaluate(sampleOpp, { maxAllowedGasFeeUsd: 0 }).failureReason).toBe('INVALID_PARAMETERS');
    });
  });

  describe('State Machine & Transitions', () => {
    it('transitions DETECTED -> SIMULATING -> SIMULATED_SUCCESS', () => {
      const record = CryptoArbitrageServiceHandler.executeArbitrageSimulation('opp-test-1');
      expect(record.status).toBe('SIMULATED_SUCCESS');
      expect(record.simulationIdentifier).toMatch(/^SIM-[0-9a-f-]+$/);

      const updatedOpp = CryptoArbitrageServiceHandler.fetchOpportunityDetails('opp-test-1');
      expect(updatedOpp?.status).toBe('SIMULATED_SUCCESS');
      expect(updatedOpp?.simulationId).toBe(record.simulationIdentifier);
    });

    it('transitions DETECTED -> SIMULATING -> SIMULATED_REVERT on failure', () => {
      const lowLiqOpp = { ...sampleOpp, id: 'opp-test-revert', availableLiquidityUsd: 10000 };
      CryptoArbitrageServiceHandler.resetDomainState([lowLiqOpp], []);

      const record = CryptoArbitrageServiceHandler.executeArbitrageSimulation('opp-test-revert');
      expect(record.status).toBe('SIMULATED_REVERT');
      expect(record.failureReason).toBe('INSUFFICIENT_LIQUIDITY');

      const updatedOpp = CryptoArbitrageServiceHandler.fetchOpportunityDetails('opp-test-revert');
      expect(updatedOpp?.status).toBe('SIMULATED_REVERT');
      expect(updatedOpp?.failureReason).toBe('INSUFFICIENT_LIQUIDITY');
    });

    it('rejects invalid state transitions in domain state (e.g. terminal to non-terminal)', () => {
      const domainState = new ArbitrageSimulationDomainState([sampleOpp]);
      expect(() => {
        domainState.updateOpportunityStatus('opp-test-1', 'SIMULATED_SUCCESS');
      }).toThrow(/Invalid simulation state transition/);

      domainState.updateOpportunityStatus('opp-test-1', 'SIMULATING');
      domainState.updateOpportunityStatus('opp-test-1', 'SIMULATED_SUCCESS');
      expect(() => {
        domainState.updateOpportunityStatus('opp-test-1', 'SIMULATING');
      }).toThrow(/Invalid simulation state transition/);
    });
  });

  describe('Idempotency & Simulation Identifiers', () => {
    it('returns existing simulation record on duplicate execution requests without side-effects', () => {
      const firstRun = CryptoArbitrageServiceHandler.executeArbitrageSimulation('opp-test-1');
      const secondRun = CryptoArbitrageServiceHandler.executeArbitrageSimulation('opp-test-1');

      expect(firstRun.id).toBe(secondRun.id);
      expect(firstRun.simulationIdentifier).toBe(secondRun.simulationIdentifier);

      const allRecords = CryptoArbitrageServiceHandler.fetchExecutionRecords();
      expect(allRecords.filter((r) => r.opportunityId === 'opp-test-1').length).toBe(1);
    });

    it('ensures simulation identifiers start with SIM- and do not look like 0x transaction hashes', () => {
      const record = CryptoArbitrageServiceHandler.executeArbitrageSimulation('opp-test-1');
      expect(record.simulationIdentifier.startsWith('SIM-')).toBe(true);
      expect(record.simulationIdentifier.startsWith('0x')).toBe(false);
    });
  });
});
