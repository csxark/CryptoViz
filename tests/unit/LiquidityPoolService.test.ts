/**
 * Enterprise Unit Test Suite for Liquidity Pool & Impermanent Loss Engine
 * 
 * Architectural Specifications:
 * - Validates mathematical precision of Uniswap v2 constant product (x * y = k) impermanent loss formula.
 * - Asserts concentrated liquidity bounds (Uniswap v3) leverage calculations and tick boundary shifts.
 * - Tests fee APY yield forecasting, gas cost amortization, break-even period calculations, and price matrix simulations.
 *
 * @module LiquidityPoolServiceTest
 * @version 3.1.0
 * @author Enterprise Cryptographic Architecture Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LiquidityPoolState } from '@/lib/LiquidityPoolModel';
import { LiquidityPoolService } from '@/lib/LiquidityPoolService';

describe('LiquidityPoolEngine Unit Tests', () => {
  let state: LiquidityPoolState;
  let service: LiquidityPoolService;

  beforeEach(() => {
    state = new LiquidityPoolState();
    service = new LiquidityPoolService(state);
  });

  describe('Constant Product (Uniswap v2) Impermanent Loss', () => {
    it('should return 0% impermanent loss when price does not change (r = 1.0)', () => {
      const il = service.calculateConstantProductIL(3500, 3500, 10000);
      expect(il.priceRatio).toBe(1.0);
      expect(il.impermanentLossPercent).toBeCloseTo(0, 5);
      expect(il.impermanentLossUsd).toBe(0);
      expect(il.holdValueUsd).toBe(10000);
      expect(il.poolValueUsd).toBe(10000);
    });

    it('should calculate canonical Uniswap v2 IL for a 2x price increase (r = 2.0 -> IL = -5.72%)', () => {
      const il = service.calculateConstantProductIL(100, 200, 10000);
      expect(il.priceRatio).toBe(2.0);
      // 2 * sqrt(2) / (1 + 2) - 1 = (2 * 1.4142) / 3 - 1 = 0.9428 - 1 = -0.05719 (-5.72%)
      expect(il.impermanentLossPercent).toBeCloseTo(-0.05719, 4);
      expect(il.impermanentLossUsd).toBeLessThan(0);
    });

    it('should calculate canonical Uniswap v2 IL for a 50% price drop (r = 0.5 -> IL = -5.72%)', () => {
      const il = service.calculateConstantProductIL(100, 50, 10000);
      expect(il.priceRatio).toBe(0.5);
      expect(il.impermanentLossPercent).toBeCloseTo(-0.05719, 4);
    });

    it('should throw error for invalid non-positive initial or new prices', () => {
      expect(() => service.calculateConstantProductIL(-100, 200)).toThrow();
      expect(() => service.calculateConstantProductIL(100, 0)).toThrow();
    });
  });

  describe('Concentrated Liquidity (Uniswap v3) Impermanent Loss', () => {
    it('should compute leverage multiplier greater than 1x for concentrated tick bounds', () => {
      const ilV3 = service.calculateConcentratedLiquidityIL(3500, 4200, 2800, 4200, 10000);
      expect(ilV3.capitalEfficiencyLeverage).toBeGreaterThan(1.5);
    });

    it('should compute higher impermanent loss for concentrated bounds compared to full-range V2', () => {
      const v2 = service.calculateConstantProductIL(3500, 4500, 10000);
      const v3 = service.calculateConcentratedLiquidityIL(3500, 4500, 2800, 4200, 10000);

      expect(Math.abs(v3.impermanentLossPercent)).toBeGreaterThan(Math.abs(v2.impermanentLossPercent));
    });
  });

  describe('Fee Yield Projection & Break-Even Modeling', () => {
    it('should project positive fee APY and compute realistic break-even timeline', () => {
      const pool = state.getPools()[0]; // ETH/USDC pool
      expect(pool).toBeDefined();

      const projection = service.projectYieldAndBreakEven(pool, 10000, 20, 30, 45);
      expect(projection.projectedFeeApy).toBeGreaterThan(0);
      expect(projection.breakEvenDays).toBeGreaterThan(0);
    });
  });

  describe('Price Matrix Simulation Engine', () => {
    it('should generate multi-ratio simulation matrix containing baseline 1.0x ratio', () => {
      const matrix = service.generatePriceMatrixSimulation(3500, 2800, 4200);
      expect(matrix.length).toBeGreaterThanOrEqual(10);

      const baseline = matrix.find(m => m.priceRatio === 1.0);
      expect(baseline).toBeDefined();
      expect(baseline?.v2LossPercent).toBe(0);
      expect(baseline?.v3LossPercent).toBe(0);
    });
  });
});
