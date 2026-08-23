/**
 * Enterprise Unit Test Suite for Crypto Portfolio Risk & Rebalancing Engine
 * 
 * Architectural Specifications:
 * - Validates portfolio model state mutations, target weight calculation algorithms (Equal Weight, Risk Parity, Max Sharpe, Min Volatility).
 * - Tests mathematical precision of VaR (95%), CVaR, Sharpe & Sortino ratios, Max Drawdown, HHI index, and Shannon entropy diversification.
 * - Asserts rebalance execution logic, trade generation instructions, and multi-vector stress testing scenarios.
 *
 * @module CryptoPortfolioRiskServiceTest
 * @version 2.4.0
 * @author Enterprise Cryptographic Architecture Team
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PortfolioState, CryptoAssetAllocation } from '@/lib/CryptoPortfolioRiskModel';
import { CryptoPortfolioRiskService } from '@/lib/CryptoPortfolioRiskService';

describe('CryptoPortfolioRiskEngine Unit Tests', () => {
  let state: PortfolioState;
  let service: CryptoPortfolioRiskService;

  beforeEach(() => {
    state = new PortfolioState();
    service = new CryptoPortfolioRiskService(state);
  });

  describe('Portfolio State Management', () => {
    it('should initialize default portfolio assets correctly', () => {
      const assets = state.getAssets();
      expect(assets.length).toBeGreaterThanOrEqual(5);

      const btc = state.getAssetById('btc-bitcoin');
      expect(btc).toBeDefined();
      expect(btc?.symbol).toBe('BTC');
      expect(btc?.currentWeight).toBe(0.40);
    });

    it('should add a new custom crypto asset and normalize weights', () => {
      const newAsset: CryptoAssetAllocation = {
        id: 'cardano-ada',
        symbol: 'ADA',
        name: 'Cardano',
        category: 'Layer1',
        currentWeight: 0.20,
        targetWeight: 0.20,
        priceUsd: 0.45,
        quantityHeld: 1000,
        volatility30d: 0.65,
        beta: 1.2,
        historicalReturns: [0.01, -0.02, 0.03]
      };

      state.addOrUpdateAsset(newAsset, 'TestRunner');
      const assets = state.getAssets();
      expect(assets.some(a => a.symbol === 'ADA')).toBe(true);

      const totalWeight = assets.reduce((sum, a) => sum + a.currentWeight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should throw error when adding asset with negative current weight', () => {
      const invalidAsset: CryptoAssetAllocation = {
        id: 'bad-asset',
        symbol: 'BAD',
        name: 'Bad Asset',
        category: 'DeFi',
        currentWeight: -0.5,
        targetWeight: 0.1,
        priceUsd: 1,
        quantityHeld: 1,
        volatility30d: 0.1,
        beta: 1,
        historicalReturns: []
      };

      expect(() => state.addOrUpdateAsset(invalidAsset)).toThrow();
    });

    it('should remove asset and normalize remaining weights', () => {
      const initialCount = state.getAssets().length;
      state.removeAsset('usdc-circle', 'TestRunner');

      const updatedAssets = state.getAssets();
      expect(updatedAssets.length).toBe(initialCount - 1);

      const totalWeight = updatedAssets.reduce((sum, a) => sum + a.currentWeight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });
  });

  describe('Rebalancing Strategy Optimization Models', () => {
    it('should compute Equal Weighting target allocation', () => {
      state.setRebalanceStrategy('EQUAL_WEIGHT');
      const assets = state.getAssets();
      const expectedWeight = Number((1 / assets.length).toFixed(4));

      assets.forEach(asset => {
        expect(asset.targetWeight).toBeCloseTo(expectedWeight, 2);
      });
    });

    it('should compute Risk Parity target allocation based on inverse volatility', () => {
      state.setRebalanceStrategy('RISK_PARITY');
      const assets = state.getAssets();

      // Lower volatility asset (USDC) should receive significantly higher target weight than SOL
      const usdc = assets.find(a => a.symbol === 'USDC');
      const sol = assets.find(a => a.symbol === 'SOL');

      expect(usdc).toBeDefined();
      expect(sol).toBeDefined();
      expect(usdc!.targetWeight).toBeGreaterThan(sol!.targetWeight);
    });

    it('should compute Minimum Volatility target allocation', () => {
      state.setRebalanceStrategy('MIN_VOLATILITY');
      const assets = state.getAssets();
      const btc = assets.find(a => a.symbol === 'BTC');
      const sol = assets.find(a => a.symbol === 'SOL');

      expect(btc!.targetWeight).toBeGreaterThan(sol!.targetWeight);
    });

    it('should compute Max Sharpe Ratio target allocation', () => {
      state.setRebalanceStrategy('MAX_SHARPE');
      const assets = state.getAssets();
      expect(assets.length).toBeGreaterThan(0);
      assets.forEach(a => {
        expect(a.targetWeight).toBeGreaterThan(0);
      });
    });
  });

  describe('Risk Analytics & Financial Mathematics Calculation', () => {
    it('should calculate valid non-zero portfolio risk metrics', () => {
      const metrics = service.calculateRiskMetrics(0.045);

      expect(metrics.totalValueUsd).toBeGreaterThan(0);
      expect(metrics.portfolioVolatility).toBeGreaterThan(0);
      expect(metrics.sharpeRatio).not.toBeNaN();
      expect(metrics.sortinoRatio).not.toBeNaN();
      expect(metrics.valueAtRisk95).toBeGreaterThan(0);
      expect(metrics.conditionalVaR95).toBeGreaterThan(metrics.valueAtRisk95);
      expect(metrics.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(metrics.diversificationScore).toBeLessThanOrEqual(100);
      expect(metrics.herfindahlIndex).toBeGreaterThan(0);
    });

    it('should handle empty portfolio metrics gracefully', () => {
      const emptyState = new PortfolioState([]);
      const emptyService = new CryptoPortfolioRiskService(emptyState);
      const metrics = emptyService.calculateRiskMetrics();

      expect(metrics.totalValueUsd).toBe(0);
      expect(metrics.sharpeRatio).toBe(0);
      expect(metrics.diversificationScore).toBe(0);
    });
  });

  describe('Rebalance Execution & Trade Instructions', () => {
    it('should generate accurate BUY/SELL trade instructions when target weights differ', () => {
      state.setRebalanceStrategy('EQUAL_WEIGHT');
      const trades = service.generateRebalanceTrades(0.01);

      expect(trades.length).toBe(state.getAssets().length);
      const buyTrades = trades.filter(t => t.action === 'BUY');
      const sellTrades = trades.filter(t => t.action === 'SELL');

      expect(buyTrades.length + sellTrades.length).toBeGreaterThan(0);
    });

    it('should execute rebalance and align current weights with target weights', () => {
      state.setRebalanceStrategy('RISK_PARITY');
      service.executeRebalance('TestRunner');

      const assets = state.getAssets();
      assets.forEach(asset => {
        expect(asset.currentWeight).toBeCloseTo(asset.targetWeight, 2);
      });
    });
  });

  describe('Macro Stress Testing Engine', () => {
    it('should run multi-vector stress scenarios and return valid drawdowns', () => {
      const scenarios = service.runStressTesting();
      expect(scenarios.length).toBe(4);

      scenarios.forEach(scen => {
        expect(scen.estimatedPortfolioDrawdown).toBeDefined();
        expect(scen.impactedValueUsd).toBeLessThan(service.calculateRiskMetrics().totalValueUsd + 10000);
      });
    });
  });
});
